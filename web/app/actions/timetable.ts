'use server';

import { parseTimetablePdf, ParsedSection } from '@/lib/timetable-parser';
import { OFFICIAL_TIMETABLE_URL } from '@/lib/timetable-constants';

export type TimetableActionResult = { sections: ParsedSection[]; warnings: string[] } | { error: string };

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export async function loadOfficialTimetable(): Promise<TimetableActionResult> {
  try {
    const res = await fetch(OFFICIAL_TIMETABLE_URL);
    if (!res.ok) {
      return { error: `Could not load the official timetable (HTTP ${res.status}).` };
    }
    const buf = await res.arrayBuffer();
    return await parseTimetablePdf(buf);
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
