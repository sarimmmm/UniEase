import { getResolvedPDFJS, type getDocumentProxy } from 'unpdf';
import { LineSegment } from './types';

type PDFDocumentProxy = Awaited<ReturnType<typeof getDocumentProxy>>;
type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

// A stroked path whose bounding box is thinner than this in one dimension
// is treated as a straight horizontal/vertical rule.
const AXIS_ALIGNED_EPSILON = 0.5;

/**
 * aSc draws the grid as individually stroked segments: every empty cell
 * gets its own borders, and a class card suppresses the grid lines inside
 * it while keeping its own edges. So the presence or absence of a vertical
 * rule at a column boundary is the only reliable signal of where one card
 * ends and the next begins — text positions alone can't tell two
 * back-to-back cards apart from one long one.
 *
 * Returns axis-aligned stroked segments in the same coordinate space as
 * `extractTextItems` (PDF user space, y up), so they can be compared
 * directly against text item positions.
 */
export async function extractPageLines(proxy: PDFDocumentProxy, pageNumber: number): Promise<LineSegment[]> {
  const { OPS } = await getResolvedPDFJS();
  const page = await proxy.getPage(pageNumber);
  const { fnArray, argsArray } = await page.getOperatorList();

  const lines: LineSegment[] = [];
  const stack: Matrix[] = [];
  let ctm: Matrix = IDENTITY;

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i];

    if (fn === OPS.save) {
      stack.push(ctm);
    } else if (fn === OPS.restore) {
      ctm = stack.pop() ?? IDENTITY;
    } else if (fn === OPS.transform) {
      ctm = multiply(ctm, args as Matrix);
    } else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      if (Array.isArray(args?.[0]) && args[0].length === 6) ctm = multiply(ctm, args[0] as Matrix);
    } else if (fn === OPS.paintFormXObjectEnd) {
      ctm = stack.pop() ?? IDENTITY;
    } else if (fn === OPS.constructPath) {
      // pdf.js 5 packs the painting op into the path args; older builds
      // emit it as the following operator instead.
      const paintOp = typeof args?.[0] === 'number' ? args[0] : fnArray[i + 1];
      if (paintOp !== OPS.stroke && paintOp !== OPS.closeStroke) continue;
      const minMax = args?.[2];
      if (!minMax || minMax.length < 4) continue;

      const [ax, ay] = apply(ctm, minMax[0], minMax[1]);
      const [bx, by] = apply(ctm, minMax[2], minMax[3]);
      const seg: LineSegment = {
        x0: Math.min(ax, bx),
        x1: Math.max(ax, bx),
        y0: Math.min(ay, by),
        y1: Math.max(ay, by),
      };
      const vertical = seg.x1 - seg.x0 < AXIS_ALIGNED_EPSILON;
      const horizontal = seg.y1 - seg.y0 < AXIS_ALIGNED_EPSILON;
      if (vertical !== horizontal) lines.push(seg);
    }
  }

  return lines;
}
