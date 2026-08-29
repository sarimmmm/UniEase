import { extractTextItems, getDocumentProxy } from 'unpdf';
import { ParseResult } from './types';
import { parsePage } from './parse-page';

export * from './types';

export async function parseTimetablePdf(data: Uint8Array | ArrayBuffer): Promise<ParseResult> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  let items;
  try {
    // verbosity: 0 suppresses pdfjs's internal recovery-attempt logging,
    // which is otherwise noisy on any malformed/non-PDF upload
    const proxy = await getDocumentProxy(bytes, { verbosity: 0 });
    const result = await extractTextItems(proxy);
    items = result.items;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { sections: [], warnings: [`Failed to read PDF: ${message}`] };
  }

  if (items.length === 0) {
    return { sections: [], warnings: ['PDF has no pages'] };
  }

  const sections = items.map((pageItems) => parsePage(pageItems));
  return { sections, warnings: [] };
}
