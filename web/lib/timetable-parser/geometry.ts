import type { StructuredTextItem } from 'unpdf';
import { Day, PeriodSlot } from './types';
import { DAY_LABELS, TIME_RANGE_RE, PERIOD_NUMBER_RE, FOOTER_PATTERNS, TITLE_PATTERNS } from './constants';

function isDayLabel(str: string): str is Day {
  return (DAY_LABELS as readonly string[]).includes(str.trim());
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Groups items whose y-centers are within `tolerance` of each other into rows. */
function clusterByY<T extends { y: number; height: number }>(items: T[], tolerance = 2): T[][] {
  const withCenter = items.map((i) => ({ item: i, yc: i.y + i.height / 2 }));
  withCenter.sort((a, b) => b.yc - a.yc); // topmost (largest y) first
  const rows: T[][] = [];
  for (const { item, yc } of withCenter) {
    const row = rows.find((r) => Math.abs(r[0].y + r[0].height / 2 - yc) <= tolerance);
    if (row) row.push(item);
    else rows.push([item]);
  }
  return rows;
}

export interface HeaderInfo {
  columnBoundaries: number[]; // length N+1, x-coordinates
  periods: PeriodSlot[]; // length N
  headerFontSize: number;
  headerTopY: number;
  headerBottomY: number;
  warnings: string[];
}

function parseTimeRange(str: string): PeriodSlot | null {
  const m = str.trim().match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/);
  if (!m) return null;
  return { start: m[1], end: m[2] };
}

/**
 * The source PDF's period times have no AM/PM marker (e.g. "1:10 - 1:45"
 * is really 1:10 PM), so naive hour*60+min parsing would treat afternoon
 * hours 1-11 as AM and produce a time earlier than the morning periods
 * before it. A single school-day schedule is always chronologically
 * increasing from its first period, so: track a running "PM offset" and
 * add 12h the moment a raw time would otherwise go backwards relative to
 * the previous period.
 */
function normalizeTo24h(periods: PeriodSlot[]): PeriodSlot[] {
  let pmOffsetMinutes = 0;
  let prevMinutes = -Infinity;

  function convert(t: string): string {
    const m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return t;
    const raw = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    if (raw + pmOffsetMinutes < prevMinutes) pmOffsetMinutes += 12 * 60;
    const total = raw + pmOffsetMinutes;
    prevMinutes = total;
    const h = Math.floor(total / 60);
    const mm = total % 60;
    return `${h}:${mm.toString().padStart(2, '0')}`;
  }

  return periods.map((p) => (p.start === '' ? p : { start: convert(p.start), end: convert(p.end) }));
}

/**
 * Finds the 16-ish-column period header row and derives column x-boundaries
 * from the period-number labels' centers (primary signal), cross-validated
 * against the time-range sub-row when present (parsed from the file itself,
 * not hardcoded, so this generalizes to an uploaded file with a different
 * period schedule).
 */
export function detectHeader(items: StructuredTextItem[]): HeaderInfo | null {
  const warnings: string[] = [];
  const numberItems = items.filter((i) => PERIOD_NUMBER_RE.test(i.str.trim()));
  if (numberItems.length < 8) return null;

  const rows = clusterByY(numberItems, 2);
  const headerRow = rows.reduce((best, r) => (r.length > best.length ? r : best), [] as StructuredTextItem[]);
  if (headerRow.length < 8) return null;

  const sorted = [...headerRow].sort((a, b) => a.x - b.x);
  const nums = sorted.map((i) => parseInt(i.str.trim(), 10));
  const contiguous = nums.every((n, idx) => n === idx + 1);
  if (!contiguous) warnings.push('period header numbers are not contiguous 1..N — column mapping may be unreliable');

  const centers = sorted.map((i) => i.x + i.width / 2);
  const n = centers.length;
  const boundaries: number[] = new Array(n + 1);
  for (let k = 1; k < n; k++) boundaries[k] = (centers[k - 1] + centers[k]) / 2;
  boundaries[0] = centers[0] - (centers[1] - centers[0]) / 2;
  boundaries[n] = centers[n - 1] + (centers[n - 1] - centers[n - 2]) / 2;

  const headerFontSize = median(sorted.map((i) => i.fontSize));
  const headerTopY = Math.max(...sorted.map((i) => i.y + i.height));

  // time-range sub-row: cross-check + gives us the bottom edge of the header band
  const timeItems = items.filter((i) => TIME_RANGE_RE.test(i.str.trim()));
  let headerBottomY = Math.min(...sorted.map((i) => i.y)) - 2;
  if (timeItems.length > 0) {
    const timeSorted = [...timeItems].sort((a, b) => a.x - b.x);
    const timeCenters = timeSorted.map((i) => i.x + i.width / 2);
    if (timeSorted.length !== n) {
      warnings.push(`period-number row (${n} cols) and time-range row (${timeSorted.length}) disagree in count`);
    } else {
      const maxDelta = Math.max(...timeCenters.map((c, idx) => Math.abs(c - centers[idx])));
      if (maxDelta > 8) warnings.push('period-number row and time-range row column positions disagree — low confidence');
    }
    headerBottomY = Math.min(...timeItems.map((i) => i.y)) - 2;
  } else {
    warnings.push('no time-range header row found — period clock times unavailable, using column index only');
  }

  let periods: PeriodSlot[] = [];
  if (timeItems.length === n) {
    const timeSorted = [...timeItems].sort((a, b) => a.x - b.x);
    for (const t of timeSorted) {
      const parsed = parseTimeRange(t.str);
      periods.push(parsed ?? { start: '', end: '' });
    }
    periods = normalizeTo24h(periods);
  } else {
    for (let i = 0; i < n; i++) periods.push({ start: '', end: '' });
  }

  return { columnBoundaries: boundaries, periods, headerFontSize, headerTopY, headerBottomY, warnings };
}

/** Footer text sits at a known, low, roughly-fixed y on every page of this template. */
export function detectFooterTopY(items: StructuredTextItem[]): number {
  const footerItems = items.filter((i) => FOOTER_PATTERNS.some((re) => re.test(i.str)));
  if (footerItems.length === 0) return -Infinity; // no footer found — don't clamp anything away
  return Math.max(...footerItems.map((i) => i.y + i.height)) + 3;
}

export interface DayBandInfo {
  bands: Partial<Record<Day, [number, number]>>; // [bottomY, topY)
  warnings: string[];
}

/**
 * Day labels are detected by EXACT string match + position (left column),
 * not by font size — aSc auto-scales day-letter font size to fill the row
 * height, so a page with only 2 of 5 days present renders letters far
 * larger than a normal 5-day page. Only days actually found on the page
 * produce a band; missing days are simply absent keys, never defaulted.
 */
export function detectDayBands(
  items: StructuredTextItem[],
  header: HeaderInfo,
  footerTopY: number,
): DayBandInfo {
  const warnings: string[] = [];
  const leftEdge = header.columnBoundaries[0];

  const dayItems = items.filter((i) => isDayLabel(i.str) && i.x + i.width <= leftEdge);
  if (dayItems.length === 0) {
    return { bands: {}, warnings: ['no day labels found on this page'] };
  }

  const merged = clusterByY(dayItems, 3).map((row) => {
    const yc = row.reduce((sum, i) => sum + i.y + i.height / 2, 0) / row.length;
    return { day: row[0].str.trim() as Day, y: yc };
  });
  merged.sort((a, b) => b.y - a.y); // topmost first

  const n = merged.length;
  const gaps: number[] = [];
  for (let i = 0; i < n - 1; i++) gaps.push(merged[i].y - merged[i + 1].y);
  const rowHeight = gaps.length > 0 ? median(gaps) : 90; // arbitrary-but-harmless fallback for a single-day page

  const bands: Partial<Record<Day, [number, number]>> = {};
  for (let i = 0; i < n; i++) {
    const top = i === 0 ? header.headerBottomY : (merged[i - 1].y + merged[i].y) / 2;
    const bottom = i === n - 1 ? Math.max(merged[i].y - rowHeight / 2, footerTopY) : (merged[i].y + merged[i + 1].y) / 2;
    bands[merged[i].day] = [bottom, top];
  }

  return { bands, warnings };
}

/**
 * The section name is the large text directly below the small
 * "FAST-NUCES Multan Campus" title line and above the grid's header row —
 * distinguished from day labels by content (never an exact day string) and
 * position (above the header, day labels are below it), not by font size
 * (which, like day labels, is auto-scaled and not a stable constant).
 */
export function detectSectionName(
  items: StructuredTextItem[],
  header: HeaderInfo,
): { name: string | null; warning?: string } {
  // Only the actual campus title line anchors titleY — the corner mark
  // ("FAST-NU", also covered by TITLE_PATTERNS for exclusion purposes
  // below) sits much lower on the page and must not drag titleY down
  // below the section name's own y.
  const mainTitleItems = items.filter((i) => /FAST-NUCES/i.test(i.str) || /Multan Campus/i.test(i.str));
  const titleY = mainTitleItems.length > 0 ? Math.min(...mainTitleItems.map((i) => i.y)) : Infinity;

  const candidates = items.filter(
    (i) =>
      i.str.trim() !== '' &&
      !isDayLabel(i.str) &&
      !TITLE_PATTERNS.some((re) => re.test(i.str)) &&
      i.y > header.headerTopY &&
      i.y < titleY,
  );
  if (candidates.length === 0) return { name: null, warning: 'section name not found' };

  const rows = clusterByY(candidates, 3);
  const topRow = rows.reduce((best, r) => {
    const rY = r.reduce((s, i) => s + i.y, 0) / r.length;
    const bY = best.reduce((s, i) => s + i.y, 0) / best.length;
    return rY > bY ? r : best;
  }, rows[0]);

  const sorted = [...topRow].sort((a, b) => a.x - b.x);
  const name = sorted.map((i) => i.str).join('').trim();
  return { name: name || null };
}

export { isDayLabel, clusterByY, median };
