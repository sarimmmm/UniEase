import { extractTextItems, getDocumentProxy } from 'unpdf';
import { LineSegment, ParseResult } from './types';
import { parsePage } from './parse-page';
import { extractPageLines } from './pdf-lines';

export * from './types';

export async function parseTimetablePdf(data: Uint8Array | ArrayBuffer): Promise<ParseResult> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  let items;
  let proxy: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    // verbosity: 0 suppresses pdfjs's internal recovery-attempt logging,
    // which is otherwise noisy on any malformed/non-PDF upload
    proxy = await getDocumentProxy(bytes, { verbosity: 0 });
    const result = await extractTextItems(proxy);
    items = result.items;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { sections: [], warnings: [`Failed to read PDF: ${message}`] };
  }

  if (items.length === 0) {
    return { sections: [], warnings: ['PDF has no pages'] };
  }

  // Ruled lines only sharpen card boundaries (see extractPageLines); a page
  // whose drawing ops can't be read still parses, just less precisely.
  const pageLines: LineSegment[][] = await Promise.all(
    items.map((_, i) => extractPageLines(proxy, i + 1).catch(() => [])),
  );

  const sections = items.map((pageItems, i) => parsePage(pageItems, pageLines[i]));
  return { sections, warnings: [] };
}
