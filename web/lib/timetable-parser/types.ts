export type Day = 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr';

export const DAYS: Day[] = ['Mo', 'Tu', 'We', 'Th', 'Fr'];

export interface PeriodSlot {
  start: string; // "H:MM", 24h, as parsed from the PDF's own header row
  end: string;
}

export interface TimetableBlock {
  day: Day;
  startPeriod: number; // 0-indexed
  endPeriod: number; // 0-indexed, inclusive
  courseText?: string;
  room?: string;
  instructor?: string;
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
