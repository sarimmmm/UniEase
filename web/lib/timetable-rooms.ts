import { Day, ParsedSection, PeriodSlot } from './timetable-parser/types';
import { timeToMinutes } from './timetable-freeslots';

/** One class held in a room, merged across every section attending it. */
export interface RoomClass {
  room: string;
  day: Day;
  startPeriod: number;
  endPeriod: number; // inclusive
  courseText?: string;
  instructor?: string;
  sections: string[];
}

export interface RoomSchedule {
  rooms: string[];
  /** room -> day -> classes sorted by start period */
  classes: Map<string, Partial<Record<Day, RoomClass[]>>>;
}

export interface RoomStatus {
  room: string;
  /** Classes occupying the room during the period — more than one only on a timetable clash. */
  current: RoomClass[];
  /** The room's next class later that day, if any. */
  next?: RoomClass;
}

export function normalizeRoom(label: string): string {
  const s = label.trim().replace(/\s+/g, ' ');
  if (/^seminar hall$/i.test(s)) return 'Seminar Hall';
  const room = s.match(/^R-?(\d+)$/i);
  if (room) return `R-${room[1].padStart(2, '0')}`;
  const lab = s.match(/^LAB-?(\d+)$/i);
  if (lab) return `LAB-${parseInt(lab[1], 10)}`;
  return s;
}

function roomOrder(room: string): [number, number, string] {
  const r = room.match(/^R-(\d+)$/);
  if (r) return [0, parseInt(r[1], 10), room];
  const lab = room.match(/^LAB-(\d+)$/);
  if (lab) return [1, parseInt(lab[1], 10), room];
  return [2, 0, room];
}

function compareRooms(a: string, b: string): number {
  const [ca, na, sa] = roomOrder(a);
  const [cb, nb, sb] = roomOrder(b);
  return ca - cb || na - nb || sa.localeCompare(sb);
}

/**
 * Inverts per-section timetables into per-room ones. A combined lecture
 * (or the Friday seminar slot) prints the same card on several section
 * pages; those collapse into one class listing every section.
 */
export function buildRoomSchedule(sections: ParsedSection[], knownRooms: readonly string[] = []): RoomSchedule {
  const merged = new Map<string, RoomClass>();
  for (const section of sections) {
    for (const b of section.blocks) {
      const room = normalizeRoom(b.room);
      // Whitespace-insensitive: the PDF sometimes splits a title mid-word
      // on one section's page ("Unde rstanding") but not on another's.
      const courseKey = (b.courseText ?? '').replace(/\s+/g, '').toLowerCase();
      const key = [room, b.day, b.startPeriod, b.endPeriod, courseKey].join('|');
      const existing = merged.get(key);
      if (existing) {
        if (section.name && !existing.sections.includes(section.name)) existing.sections.push(section.name);
        existing.instructor ??= b.instructor;
      } else {
        merged.set(key, {
          room,
          day: b.day,
          startPeriod: b.startPeriod,
          endPeriod: b.endPeriod,
          courseText: b.courseText,
          instructor: b.instructor,
          sections: section.name ? [section.name] : [],
        });
      }
    }
  }

  const classes: RoomSchedule['classes'] = new Map();
  for (const c of merged.values()) {
    const byDay = classes.get(c.room) ?? {};
    (byDay[c.day] ??= []).push(c);
    classes.set(c.room, byDay);
  }
  for (const byDay of classes.values()) {
    for (const list of Object.values(byDay)) list.sort((a, b) => a.startPeriod - b.startPeriod);
  }

  const rooms = [...new Set([...knownRooms.map(normalizeRoom), ...classes.keys()])].sort(compareRooms);
  return { rooms, classes };
}

export function roomStatusAt(schedule: RoomSchedule, day: Day, period: number): RoomStatus[] {
  return schedule.rooms.map((room) => {
    const dayClasses = schedule.classes.get(room)?.[day] ?? [];
    return {
      room,
      current: dayClasses.filter((c) => c.startPeriod <= period && period <= c.endPeriod),
      next: dayClasses.find((c) => c.startPeriod > period),
    };
  });
}

export type PeriodPosition =
  | { kind: 'in'; period: number }
  | { kind: 'break'; period: number } // between periods; `period` is the next one
  | { kind: 'before' }
  | { kind: 'after' };

/** Where a campus clock time (minutes since midnight) falls in the day's periods. */
export function locatePeriod(periods: PeriodSlot[], minutes: number): PeriodPosition | null {
  const spans = periods.map((p) => [timeToMinutes(p.start), timeToMinutes(p.end)] as const);
  if (spans.length === 0 || spans.some(([s, e]) => s === null || e === null)) return null;

  if (minutes < spans[0][0]!) return { kind: 'before' };
  for (let i = 0; i < spans.length; i++) {
    const [start, end] = spans[i] as [number, number];
    if (minutes >= start && minutes < end) return { kind: 'in', period: i };
    if (minutes < start) return { kind: 'break', period: i };
  }
  return { kind: 'after' };
}

const WEEKDAY_TO_DAY: Record<string, Day> = { Mon: 'Mo', Tue: 'Tu', Wed: 'We', Thu: 'Th', Fri: 'Fr' };

/** The current weekday and clock time in the campus's own time zone, regardless of the viewer's. */
export function campusClock(now: Date, timeZone: string): { day: Day | null; weekday: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = get('weekday');
  return {
    day: WEEKDAY_TO_DAY[weekday] ?? null,
    weekday,
    minutes: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10),
  };
}
