export type Day = 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr';

export const DAYS: Day[] = ['Mo', 'Tu', 'We', 'Th', 'Fr'];

export interface PeriodSlot {
  start: string; // "H:MM", 24h, as parsed from the PDF's own header row
  end: string;
}

/**
 * One class card on the grid, anchored on its printed room label. Cards
 * stacked in the same time slot (e.g. two groups of a section in different
 * rooms) are separate blocks with overlapping periods.
 */
export interface TimetableBlock {
  day: Day;
  startPeriod: number; // 0-indexed
  endPeriod: number; // 0-indexed, inclusive
  room: string;
  courseText?: string;
  instructor?: string;
}

/** An axis-aligned ruled line in PDF user space (same space as text items). */
export interface LineSegment {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface ParsedSection {
  name: string | null;
  periods: PeriodSlot[];
  days: Partial<Record<Day, boolean[]>>; // key absent = day not found on this page, NOT "free"
  blocks: TimetableBlock[];
  confidence: {
    daysFound: number;
    columnsFound: number;
    sectionNameFound: boolean;
  };
  warnings: string[];
}

export interface ParseResult {
  sections: ParsedSection[];
  warnings: string[]; // document-level warnings (e.g. no pages found)
}
