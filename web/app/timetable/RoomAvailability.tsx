'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { Day, DAYS, ParsedSection, PeriodSlot } from '@/lib/timetable-parser/types';
import { buildRoomSchedule, roomStatusAt, locatePeriod, campusClock, RoomClass, RoomStatus } from '@/lib/timetable-rooms';
import { formatClockTime } from '@/lib/timetable-freeslots';
import { CAMPUS_TIME_ZONE } from '@/lib/timetable-constants';
import { DoorOpen, Clock, RotateCcw, AlertTriangle } from 'lucide-react';

const DAY_LABELS: Record<Day, string> = { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday' };

// A minute-resolution clock as an external store: the snapshot only changes
// once a minute, so polling it more often than that never re-renders.
function subscribeClock(onChange: () => void) {
  const id = setInterval(onChange, 15_000);
  return () => clearInterval(id);
}
const getMinute = () => Math.floor(Date.now() / 60_000);
const getServerMinute = () => null;

interface Moment {
  day: Day;
  period: number;
  message: string;
}

function periodLabel(periods: PeriodSlot[], p: number): string {
  const slot = periods[p];
  return slot?.start ? `Period ${p + 1} · ${formatClockTime(slot.start)} – ${formatClockTime(slot.end)}` : `Period ${p + 1}`;
}

function spanLabel(periods: PeriodSlot[], start: number, end: number): string {
  const range = start === end ? `P${start + 1}` : `P${start + 1}–${end + 1}`;
  const from = periods[start]?.start;
  const to = periods[end]?.end;
  return from && to ? `${range} · ${formatClockTime(from)} – ${formatClockTime(to)}` : range;
}

function nextClassDay(day: Day | null): Day {
  if (!day) return 'Mo';
  return DAYS[(DAYS.indexOf(day) + 1) % DAYS.length];
}

/**
 * Maps the campus clock onto the timetable: the period in progress, the
 * next one during a break, or the next teaching day's first period once
 * the day is over (or on a weekend).
 */
function describeNow(now: Date, periods: PeriodSlot[]): Moment {
  const clock = campusClock(now, CAMPUS_TIME_ZONE);
  if (!clock.day) {
    return { day: 'Mo', period: 0, message: `No classes on ${clock.weekday} — showing Monday's first period` };
  }

  const pos = locatePeriod(periods, clock.minutes);
  if (!pos) {
    return { day: clock.day, period: 0, message: 'This timetable has no period times, so pick a period below' };
  }
  switch (pos.kind) {
    case 'in':
      return { day: clock.day, period: pos.period, message: `Right now · ${periodLabel(periods, pos.period)}` };
    case 'break':
      return { day: clock.day, period: pos.period, message: `Between periods · up next is ${periodLabel(periods, pos.period)}` };
    case 'before':
      return { day: clock.day, period: 0, message: `Classes haven't started yet · showing ${periodLabel(periods, 0)}` };
    case 'after': {
      const next = nextClassDay(clock.day);
      return { day: next, period: 0, message: `Classes are over for today — showing ${DAY_LABELS[next]}'s first period` };
    }
  }
}

function formatCampusTime(now: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TIME_ZONE,
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(now);
}

export default function RoomAvailability({
  sections,
  knownRooms,
}: {
  sections: ParsedSection[];
  knownRooms: readonly string[];
}) {
  const schedule = useMemo(() => buildRoomSchedule(sections, knownRooms), [sections, knownRooms]);
  const periods = useMemo(() => sections.find((s) => s.periods.length > 0)?.periods ?? [], [sections]);

  const minute = useSyncExternalStore(subscribeClock, getMinute, getServerMinute);
  const now = minute === null ? null : new Date(minute * 60_000);
  const live = now ? describeNow(now, periods) : null;

  // null = follow the live clock; set once the user picks a day or period.
  const [pinned, setPinned] = useState<{ day: Day; period: number } | null>(null);
  const day = pinned?.day ?? live?.day ?? 'Mo';
  const period = pinned?.period ?? live?.period ?? 0;

  const statuses = roomStatusAt(schedule, day, period);
  const freeCount = statuses.filter((s) => s.current.length === 0).length;

  if (schedule.rooms.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 italic">
          No room labels could be read from this timetable, so room availability isn&apos;t available for it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-[#1e3a8a]" /> Room availability
            </h2>
            {now && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Campus time: {formatCampusTime(now)}
              </p>
            )}
          </div>
          {pinned ? (
            <button
              onClick={() => setPinned(null)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#1e3a8a] hover:underline"
            >
              <RotateCcw className="w-4 h-4" /> Back to now
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={day}
            onChange={(e) => setPinned({ day: e.target.value as Day, period })}
            className="w-full sm:w-48 px-4 py-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 text-sm"
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>{DAY_LABELS[d]}</option>
            ))}
          </select>
          <select
            value={period}
            onChange={(e) => setPinned({ day, period: Number(e.target.value) })}
            className="w-full sm:w-72 px-4 py-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 text-sm"
          >
            {periods.map((_, i) => (
              <option key={i} value={i}>{periodLabel(periods, i)}</option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-600">
          {pinned ? `${DAY_LABELS[day]} · ${periodLabel(periods, period)}` : live?.message}
          <span className="mx-2 text-gray-300">|</span>
          <strong className="text-green-700">{freeCount}</strong> of {statuses.length} rooms free
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {statuses.map((s) => (
            <RoomTile key={s.room} status={s} periods={periods} />
          ))}
        </div>
      </div>

      <DayGrid
        day={day}
        period={period}
        rooms={schedule.rooms}
        classes={schedule.classes}
        periods={periods}
        onPickPeriod={(p) => setPinned({ day, period: p })}
      />
    </div>
  );
}

function RoomTile({ status, periods }: { status: RoomStatus; periods: PeriodSlot[] }) {
  const inUse = status.current.length > 0;
  return (
    <div
      className={`rounded-lg border p-3 space-y-1.5 ${
        inUse ? 'border-blue-200 bg-blue-50/60' : 'border-green-200 bg-green-50/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-gray-900">{status.room}</p>
        {status.current.length > 1 ? (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">
            <AlertTriangle className="w-3 h-3" /> Clash
          </span>
        ) : (
          <span
            className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
              inUse ? 'text-[#1e3a8a] bg-blue-100' : 'text-green-700 bg-green-100'
            }`}
          >
            {inUse ? 'In use' : 'Free'}
          </span>
        )}
      </div>

      {inUse ? (
        status.current.map((c, i) => <ClassSummary key={i} cls={c} periods={periods} />)
      ) : status.next ? (
        <p className="text-xs text-gray-600">
          Free until{' '}
          <strong>{periods[status.next.startPeriod]?.start ? formatClockTime(periods[status.next.startPeriod].start) : `P${status.next.startPeriod + 1}`}</strong>
          <span className="block text-gray-500 truncate" title={status.next.courseText}>
            Next: {status.next.courseText ?? 'Class'} · {status.next.sections.join(', ')}
          </span>
        </p>
      ) : (
        <p className="text-xs text-gray-600">Free for the rest of the day</p>
      )}
    </div>
  );
}

function ClassSummary({ cls, periods }: { cls: RoomClass; periods: PeriodSlot[] }) {
  return (
    <div className="text-xs text-gray-700 space-y-0.5">
      <p className="font-semibold text-gray-900 line-clamp-2" title={cls.courseText}>{cls.courseText ?? 'Class'}</p>
      <p>
        {cls.sections.join(', ')}
        {cls.instructor && <span className="text-gray-500"> · {cls.instructor}</span>}
      </p>
      <p className="text-gray-500">{spanLabel(periods, cls.startPeriod, cls.endPeriod)}</p>
    </div>
  );
}

function DayGrid({
  day,
  period,
  rooms,
  classes,
  periods,
  onPickPeriod,
}: {
  day: Day;
  period: number;
  rooms: string[];
  classes: Map<string, Partial<Record<Day, RoomClass[]>>>;
  periods: PeriodSlot[];
  onPickPeriod: (p: number) => void;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{DAY_LABELS[day]} by room</h2>
      <div className="min-w-[900px]">
        <div className="grid gap-y-1" style={{ gridTemplateColumns: `96px repeat(${periods.length}, minmax(0, 1fr))` }}>
          <div />
          {periods.map((p, i) => (
            <button
              key={i}
              onClick={() => onPickPeriod(i)}
              title={periodLabel(periods, i)}
              className={`text-[9px] text-center font-semibold pb-1 rounded-t ${
                i === period ? 'text-[#1e3a8a] bg-blue-50' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {p.start ? formatClockTime(p.start) : `#${i + 1}`}
            </button>
          ))}

          {rooms.map((room, r) => {
            const row = r + 2;
            const dayClasses = classes.get(room)?.[day] ?? [];
            return (
              <RoomRow key={room} room={room} row={row} dayClasses={dayClasses} period={period} periodCount={periods.length} periods={periods} />
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> Free</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" /> In use (sections shown)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-2 ring-[#1e3a8a] inline-block" /> Selected period</span>
      </div>
    </div>
  );
}

function RoomRow({
  room,
  row,
  dayClasses,
  period,
  periodCount,
  periods,
}: {
  room: string;
  row: number;
  dayClasses: RoomClass[];
  period: number;
  periodCount: number;
  periods: PeriodSlot[];
}) {
  return (
    <>
      <div className="text-xs font-bold text-gray-600 flex items-center" style={{ gridRow: row, gridColumn: 1 }}>
        {room}
      </div>
      {Array.from({ length: periodCount }).map((_, i) => (
        <div
          key={i}
          style={{ gridRow: row, gridColumn: i + 2 }}
          className={`h-9 border border-white ${i === period ? 'bg-green-200' : 'bg-green-100'}`}
        />
      ))}
      {dayClasses.map((c, i) => {
        const selected = c.startPeriod <= period && period <= c.endPeriod;
        return (
          <div
            key={i}
            style={{ gridRow: row, gridColumn: `${c.startPeriod + 2} / ${c.endPeriod + 3}` }}
            title={`${c.courseText ?? 'Class'}\n${c.sections.join(', ')}${c.instructor ? ` · ${c.instructor}` : ''}\n${spanLabel(periods, c.startPeriod, c.endPeriod)}`}
            className={`h-9 mx-px rounded border px-1.5 flex items-center overflow-hidden text-[10px] font-semibold leading-tight text-[#1e3a8a] bg-blue-100 border-blue-300 ${
              selected ? 'ring-2 ring-[#1e3a8a]' : ''
            }`}
          >
            <span className="truncate">{c.sections.join(', ')}</span>
          </div>
        );
      })}
    </>
  );
}
