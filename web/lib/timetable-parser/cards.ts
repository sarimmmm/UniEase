import type { StructuredTextItem } from 'unpdf';
import { Day, LineSegment, TimetableBlock } from './types';
import { ROOM_LABEL_RE, LINE_SNAP_FRACTION } from './constants';
import { clusterByY, median } from './geometry';

type Bands = Partial<Record<Day, [number, number]>>;

function yCenter(i: StructuredTextItem): number {
  return i.y + i.height / 2;
}

function dayForY(yc: number, bands: Bands): Day | null {
  for (const [day, band] of Object.entries(bands) as [Day, [number, number]][]) {
    if (yc >= band[0] && yc < band[1]) return day;
  }
  return null;
}

function joinLine(items: StructuredTextItem[]): string {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let out = '';
  for (let k = 0; k < sorted.length; k++) {
    const gap = k === 0 ? 0 : sorted[k].x - (sorted[k - 1].x + sorted[k - 1].width);
    out += (gap > 0.5 ? ' ' : '') + sorted[k].str;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * A card's text is the course title (one or more tightly spaced lines at
 * the top) followed, after a visibly larger gap, by the instructor. Split
 * on the first such gap rather than by position within the card, since
 * aSc shrinks and re-flows text to fit narrow cards.
 */
function splitCourseAndInstructor(items: StructuredTextItem[]): { courseText?: string; instructor?: string } {
  if (items.length === 0) return {};
  const lines = clusterByY(items, 2).sort((a, b) => yCenter(b[0]) - yCenter(a[0]));
  let split = lines.length;
  for (let k = 1; k < lines.length; k++) {
    const gap = yCenter(lines[k - 1][0]) - yCenter(lines[k][0]);
    const lineHeight = Math.max(...lines[k - 1].map((i) => i.height), ...lines[k].map((i) => i.height));
    if (gap > 1.6 * lineHeight) {
      split = k;
      break;
    }
  }
  const courseText = lines.slice(0, split).map(joinLine).join(' ').trim();
  const instructor = lines.slice(split).map(joinLine).join(' ').trim();
  return { courseText: courseText || undefined, instructor: instructor || undefined };
}

/**
 * Finds every class card on a page by its room label, which aSc always
 * prints at the card's bottom-left. The label's column is the card's first
 * period; the card extends right until the first column boundary that has
 * a drawn vertical rule at the label's height (see extractPageLines). When
 * the page has no usable rules, falls back to the end of the contiguous
 * busy run in `days`, which is right for isolated cards but merges
 * back-to-back ones.
 */
export function detectClassCards(
  contentItems: StructuredTextItem[],
  lines: LineSegment[],
  columnBoundaries: number[],
  bands: Bands,
  days: Partial<Record<Day, boolean[]>>,
): TimetableBlock[] {
  const N = columnBoundaries.length - 1;
  const colWidth = median(columnBoundaries.slice(1).map((b, k) => b - columnBoundaries[k]));
  const snap = colWidth * LINE_SNAP_FRACTION;

  const verticals = lines.filter((l) => l.x1 - l.x0 < l.y1 - l.y0);
  const horizontals = lines.filter((l) => l.x1 - l.x0 >= l.y1 - l.y0);
  const hasRules = verticals.some((v) => v.x0 > columnBoundaries[0] + snap && v.x0 < columnBoundaries[N] - snap);

  const hasVerticalAt = (x: number, y: number) =>
    verticals.some((v) => Math.abs(v.x0 - x) <= snap && y >= v.y0 - snap && y <= v.y1 + snap);

  const roomLabels = contentItems.filter((i) => ROOM_LABEL_RE.test(i.str.trim()));
  const blocks: TimetableBlock[] = [];

  for (const label of roomLabels) {
    const yc = yCenter(label);
    const day = dayForY(yc, bands);
    if (!day) continue;
    const band = bands[day]!;

    let start = -1;
    for (let k = 0; k < N; k++) if (columnBoundaries[k] <= label.x + snap) start = k;
    if (start < 0) continue;

    let end = N; // exclusive column boundary index
    if (hasRules) {
      for (let k = start + 1; k <= N; k++) {
        if (hasVerticalAt(columnBoundaries[k], yc)) {
          end = k;
          break;
        }
      }
    } else {
      const grid = days[day];
      end = start + 1;
      while (grid && end < N && grid[end]) end++;
    }

    const x0 = columnBoundaries[start];
    const x1 = columnBoundaries[end];

    // Stacked cards in the same slot are separated by horizontal rules
    // spanning (most of) the card's width.
    const dividers = horizontals
      .filter((h) => h.y0 > band[0] + snap && h.y0 < band[1] - snap)
      .filter((h) => Math.min(h.x1, x1) - Math.max(h.x0, x0) > colWidth / 2)
      .map((h) => h.y0);
    const top = Math.min(band[1], ...dividers.filter((y) => y > yc));
    const bottom = Math.max(band[0], ...dividers.filter((y) => y < yc));

    const members = contentItems.filter((i) => {
      if (i === label || ROOM_LABEL_RE.test(i.str.trim())) return false;
      const xc = i.x + i.width / 2;
      const iyc = yCenter(i);
      return xc >= x0 && xc <= x1 && iyc >= bottom && iyc <= top;
    });

    blocks.push({
      day,
      startPeriod: start,
      endPeriod: end - 1,
      room: label.str.trim(),
      ...splitCourseAndInstructor(members),
    });
  }

  return blocks;
}
