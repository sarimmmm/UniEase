'use server';

import { parseTimetablePdf, ParsedSection } from '@/lib/timetable-parser';
import { OFFICIAL_TIMETABLE_URL } from '@/lib/timetable-constants';

export type TimetableActionResult =
  | { sections: ParsedSection[]; warnings: string[]; url?: string }
  | { error: string };

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// The bucket is public and sits behind a CDN, so a replaced file at the
// same fixed path can otherwise keep serving a stale cached copy. A
// cache-busting query param forces both this server-side fetch and the
// client's iframe (which reuses this same `url`) to always get the current
// object rather than a cached one.
export async function loadOfficialTimetable(): Promise<TimetableActionResult> {
  const versionedUrl = `${OFFICIAL_TIMETABLE_URL}?v=${Date.now()}`;
  try {
    const res = await fetch(versionedUrl, { cache: 'no-store' });
    if (!res.ok) {
      return { error: `Could not load the official timetable (HTTP ${res.status}).` };
    }
    const buf = await res.arrayBuffer();
    const result = await parseTimetablePdf(buf);
    return { ...result, url: versionedUrl };
  } catch (err: unknown) {
    return { error: errorMessage(err, 'Failed to load the official timetable.') };
  }
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function parseUploadedTimetable(formData: FormData): Promise<TimetableActionResult> {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { error: 'No file was uploaded.' };
  }
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { error: 'Please upload a PDF file.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: 'File is too large (max 10MB).' };
  }

  try {
    const buf = await file.arrayBuffer();
    // Never persisted anywhere — parsed in-memory for this request only.
    return await parseTimetablePdf(buf);
  } catch (err: unknown) {
    return { error: errorMessage(err, 'Failed to parse the uploaded file.') };
  }
}
