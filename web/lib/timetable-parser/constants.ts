// Literals specific to the "aSc Timetables" export template that FAST-NUCES
// (and, per the "similar format" upload feature, presumably other campuses
// using the same software) produces. Kept in one place so a genuinely
// different template could be supported later without touching the
// geometry/parsing logic itself.

export const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr'] as const;

export const TIME_RANGE_RE = /^\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}$/;
export const PERIOD_NUMBER_RE = /^\d{1,2}$/;

// Room labels as printed in the bottom-left corner of each class card
// (R-01..R-08, LAB-1..LAB-5, Seminar Hall). Always their own text item.
export const ROOM_LABEL_RE = /^(?:R-\d{1,2}|LAB-\d{1,2}|Seminar Hall)$/i;

export const FOOTER_PATTERNS = [/aSc Timetables/i, /Time Table w\.e\.f/i, /\(V-\d/i];
export const TITLE_PATTERNS = [/FAST-NUCES/i, /Multan Campus/i, /^FAST-NU$/];

// A text item's x-range must overlap a period column by at least this many
// PDF points to count as "busy" in that column — a small fixed guard
// against float-rounding at shared column boundaries, not a
// percentage-of-column rule (a short room-code label can legitimately sit
// entirely within one column while the same block's other lines reach
// into the next).
export const COLUMN_OVERLAP_EPSILON = 1.5;

// A run of contiguous busy periods shorter than this many minutes is
// dropped from the free-slot output as passing-period noise (handled in
// timetable-freeslots.ts, not here — kept as a shared constant).
export const MIN_FREE_WINDOW_MINUTES = 10;

// How far (as a fraction of one column's width) a drawn grid line may sit
// from a text-derived column boundary and still count as that boundary.
export const LINE_SNAP_FRACTION = 0.2;
