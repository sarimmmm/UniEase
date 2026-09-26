import type { StructuredTextItem } from 'unpdf';
import { Day, LineSegment, ParsedSection } from './types';
import { DAY_LABELS, TIME_RANGE_RE, PERIOD_NUMBER_RE, FOOTER_PATTERNS, TITLE_PATTERNS, COLUMN_OVERLAP_EPSILON } from './constants';
import { detectHeader, detectFooterTopY, detectDayBands, detectSectionName, isDayLabel } from './geometry';
import { detectClassCards } from './cards';

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

export function parsePage(items: StructuredTextItem[], lines: LineSegment[] = []): ParsedSection {
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

  const blocks = detectClassCards(contentItems, lines, header.columnBoundaries, dayBandInfo.bands, days);

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
