import { Day, DAYS, ParsedSection } from './timetable-parser/types';
import { MIN_FREE_WINDOW_MINUTES } from './timetable-parser/constants';

export interface FreeWindow {
  start: string;
  end: string;
  minutes: number;
}

export interface DayFreeResult {
  day: Day;
  incomplete: boolean;
  incompleteReason?: string;
  slots: FreeWindow[];
}

function timeToMinutes(t: string): number | null {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/** Formats a normalized 24h "H:MM" time (from a FreeWindow) as "h:mm AM/PM" for display. */
export function formatClockTime(time24h: string): string {
  const mins = timeToMinutes(time24h);
  if (mins === null) return time24h;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Common free-slot computation for a set of already-parsed sections drawn
 * from ONE source (they share the same `periods[]` clock-time labels,
 * since section selection always happens within a single chosen source —
 * standard timetable or one uploaded file — never mixed).
 *
 * A day where any selected section has no data at all (missing `days[day]`
 * key, or the section carries parser warnings undermining confidence) is
 * reported as `incomplete` rather than silently computing a "free" result
 * for that day — the core rule this whole feature is built around.
 */
export function computeCommonFreeSlots(sections: ParsedSection[], day?: Day): DayFreeResult[] {
  if (sections.length === 0) return [];

  const periods = sections[0].periods;
  const columnCount = periods.length;

  const daysToCheck: Day[] = day ? [day] : [...DAYS];

  return daysToCheck.map((d): DayFreeResult => {
    const missing = sections.find((s) => !s.days[d]);
    if (missing) {
      return {
        day: d,
        incomplete: true,
        incompleteReason: `No schedule data for "${missing.name ?? 'a selected section'}" on this day`,
        slots: [],
      };
    }

    const lowConfidence = sections.find((s) => s.warnings.length > 0 && s.confidence.columnsFound !== columnCount);
    if (lowConfidence) {
      return {
        day: d,
        incomplete: true,
        incompleteReason: `"${lowConfidence.name ?? 'A selected section'}" was parsed with low confidence (${lowConfidence.warnings.join('; ')})`,
        slots: [],
      };
    }

    const busy = new Array(columnCount).fill(false);
    for (const s of sections) {
      const grid = s.days[d]!;
      for (let p = 0; p < columnCount; p++) {
        if (grid[p]) busy[p] = true;
      }
    }

    const slots: FreeWindow[] = [];
    let p = 0;
    while (p < columnCount) {
      if (busy[p]) { p++; continue; }
      const startPeriod = p;
      while (p < columnCount && !busy[p]) p++;
      const endPeriod = p - 1;

      const startStr = periods[startPeriod]?.start;
      const endStr = periods[endPeriod]?.end;
      if (!startStr || !endStr) continue; // period clock times unavailable for this file — skip, don't fabricate

      const startMin = timeToMinutes(startStr);
      const endMin = timeToMinutes(endStr);
      if (startMin === null || endMin === null) continue;

      const minutes = endMin - startMin;
      if (minutes < MIN_FREE_WINDOW_MINUTES) continue;

      slots.push({ start: minutesToTime(startMin), end: minutesToTime(endMin), minutes });
    }

    return { day: d, incomplete: false, slots };
  });
}
