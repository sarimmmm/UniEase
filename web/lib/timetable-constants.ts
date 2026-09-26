export const OFFICIAL_TIMETABLE_BUCKET = 'timetables';
export const OFFICIAL_TIMETABLE_PATH = 'fast-nuces-multan-fall-2026.pdf';

export const OFFICIAL_TIMETABLE_URL = `https://nycemvsujovktcjwhzys.supabase.co/storage/v1/object/public/${OFFICIAL_TIMETABLE_BUCKET}/${OFFICIAL_TIMETABLE_PATH}`;

// Every teaching room on the Multan campus. Shown in room availability even
// when a room has no classes (it's simply free all day); rooms the PDF
// mentions that aren't listed here are shown too.
export const OFFICIAL_ROOMS = [
  'R-01', 'R-02', 'R-03', 'R-04', 'R-05', 'R-06', 'R-07',
  'LAB-1', 'LAB-2', 'LAB-3', 'LAB-4', 'LAB-5',
  'Seminar Hall',
] as const;

export const CAMPUS_TIME_ZONE = 'Asia/Karachi';
