import type { StructuredTextItem } from 'unpdf';
import { Day, ParsedSection, TimetableBlock } from './types';
import { DAY_LABELS, TIME_RANGE_RE, PERIOD_NUMBER_RE, FOOTER_PATTERNS, TITLE_PATTERNS, COLUMN_OVERLAP_EPSILON } from './constants';
import { detectHeader, detectFooterTopY, detectDayBands, detectSectionName, isDayLabel, clusterByY } from './geometry';

// A page that yields implausibly few items for what should be a full grid
// is treated as unparseable, not as "a fully free section" — see the
// "never silently free" rule in the feature plan.
const MIN_ITEMS_FOR_PLAUSIBLE_PAGE = 20;

function isExcluded(
  item: StructuredTextItem,
  ctx: { sectionName: string | null; footerTopY: number; headerTopY: number; headerBottomY: number; bands: Partial<Record<Day, [number, number]>> },
): boolean {
  const s = item.str.trim();
  if (s === '') return true;
  if (TITLE_PATTERNS.some((re) => re.test(s))) return true;
  if (FOOTER_PATTERNS.some((re) => re.test(s))) return true;
  if (isDayLabel(s)) return true;
  if (PERIOD_NUMBER_RE.test(s)) return true;
  if (TIME_RANGE_RE.test(s)) return true;

  const yc = item.y + item.height / 2;
  if (yc <= ctx.footerTopY) return true;
  if (yc >= ctx.headerBottomY && yc <= ctx.headerTopY) return true;
  if (yc > ctx.headerTopY) return true; // above the grid entirely (e.g. section name itself)

  const inAnyBand = Object.values(ctx.bands).some((band) => band && yc >= band[0] && yc < band[1]);
  if (!inAnyBand) return true;

  return false;
}

function dayForY(yc: number, bands: Partial<Record<Day, [number, number]>>): Day | null {
  for (const day of DAYS_ORDER) {
    const band = bands[day];
    if (band && yc >= band[0] && yc < band[1]) return day;
  }
  return null;
}
const DAYS_ORDER: Day[] = [...DAY_LABELS];

function joinByX(items: StructuredTextItem[], sep = ''): string {
  return [...items].sort((a, b) => a.x - b.x).map((i) => i.str).join(sep).trim();
}

export function parsePage(items: StructuredTextItem[]): ParsedSection {
  const warnings: string[] = [];

  if (items.length < MIN_ITEMS_FOR_PLAUSIBLE_PAGE) {
    return {
      name: null,
      periods: [],
      days: {},
      blocks: [],
      confidence: { daysFound: 0, columnsFound: 0, sectionNameFound: false },
      warnings: ['too little extractable text on this page — possibly a scanned/image PDF or blank page, cannot parse'],
    };
  }

  const header = detectHeader(items);
  if (!header) {
    return {
      name: null,
      periods: [],
      days: {},
      blocks: [],
      confidence: { daysFound: 0, columnsFound: 0, sectionNameFound: false },
      warnings: ['could not find a period-number header row (1..N) — page does not match the expected timetable grid format'],
    };
  }
  warnings.push(...header.warnings);

  const footerTopY = detectFooterTopY(items);
  const dayBandInfo = detectDayBands(items, header, footerTopY);
  warnings.push(...dayBandInfo.warnings);

  const sectionNameResult = detectSectionName(items, header);
  if (sectionNameResult.warning) warnings.push(sectionNameResult.warning);

  const N = header.columnBoundaries.length - 1;
  const days: Partial<Record<Day, boolean[]>> = {};
  for (const day of Object.keys(dayBandInfo.bands) as Day[]) {
    days[day] = new Array(N).fill(false);
  }

  const ctx = {
    sectionName: sectionNameResult.name,
    footerTopY,
    headerTopY: header.headerTopY,
    headerBottomY: header.headerBottomY,
    bands: dayBandInfo.bands,
  };

  const contentItems = items.filter((i) => !isExcluded(i, ctx));

  for (const item of contentItems) {
    const yc = item.y + item.height / 2;
    const day = dayForY(yc, dayBandInfo.bands);
    if (!day) continue; // shouldn't happen given isExcluded already checked band membership, but stay safe
    const x0 = item.x;
    const x1 = item.x + item.width;
    for (let p = 0; p < N; p++) {
      const overlap = Math.min(x1, header.columnBoundaries[p + 1]) - Math.max(x0, header.columnBoundaries[p]);
      if (overlap >= COLUMN_OVERLAP_EPSILON) {
        days[day]![p] = true;
      }
    }
  }

  const blocks: TimetableBlock[] = [];
  for (const day of Object.keys(days) as Day[]) {
    const grid = days[day]!;
    let p = 0;
    while (p < N) {
      if (!grid[p]) { p++; continue; }
      const startPeriod = p;
      while (p < N && grid[p]) p++;
      const endPeriod = p - 1;

      const xRange: [number, number] = [header.columnBoundaries[startPeriod], header.columnBoundaries[endPeriod + 1]];
      const band = dayBandInfo.bands[day]!;
      const members = contentItems.filter((i) => {
        const iyc = i.y + i.height / 2;
        if (iyc < band[0] || iyc >= band[1]) return false;
        const overlap = Math.min(i.x + i.width, xRange[1]) - Math.max(i.x, xRange[0]);
        return overlap >= COLUMN_OVERLAP_EPSILON;
      });

      const lines = clusterByY(members, 2).sort((a, b) => {
        const ay = a.reduce((s, i) => s + i.y, 0) / a.length;
        const by = b.reduce((s, i) => s + i.y, 0) / b.length;
        return by - ay; // topmost first
      });

      let room: string | undefined;
      let instructor: string | undefined;
      let titleLines = lines;
      if (lines.length > 0) {
        const bottomLine = lines[lines.length - 1];
        const midX = (xRange[0] + xRange[1]) / 2;
        const leftItems = bottomLine.filter((i) => i.x + i.width <= midX + 5);
        const rightItems = bottomLine.filter((i) => i.x > midX - 5);
        const spread = Math.max(...bottomLine.map((i) => i.x + i.width)) - Math.min(...bottomLine.map((i) => i.x));
        if (spread > 0.4 * (xRange[1] - xRange[0]) && leftItems.length > 0 && rightItems.length > 0) {
          room = joinByX(leftItems, '') || undefined;
          instructor = joinByX(rightItems, ' ') || undefined;
          titleLines = lines.slice(0, -1);
        }
      }
      const courseText = titleLines.map((l) => joinByX(l, '')).join(' ').trim() || undefined;

      blocks.push({ day, startPeriod, endPeriod, courseText, room, instructor });
    }
  }

  return {
    name: sectionNameResult.name,
    periods: header.periods,
    days,
    blocks,
    confidence: {
      daysFound: Object.keys(days).length,
      columnsFound: N,
      sectionNameFound: sectionNameResult.name !== null,
    },
    warnings,
  };
}
