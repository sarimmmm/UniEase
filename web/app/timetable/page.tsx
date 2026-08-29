'use client';

import { useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useToast } from '@/components/Toaster';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { loadOfficialTimetable, parseUploadedTimetable } from '@/app/actions/timetable';
import { computeCommonFreeSlots, formatClockTime, DayFreeResult } from '@/lib/timetable-freeslots';
import { Day, DAYS, ParsedSection } from '@/lib/timetable-parser/types';
import { OFFICIAL_TIMETABLE_URL } from '@/lib/timetable-constants';
import { Upload, School, CheckCircle2, AlertTriangle, Search, CalendarClock, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const DAY_LABELS: Record<Day, string> = { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday' };

type Source = 'none' | 'official' | 'upload';

export default function TimetablePage() {
  const { showToast } = useToast();

  const [source, setSource] = useState<Source>('none');
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<ParsedSection[] | null>(null);
  const [docWarnings, setDocWarnings] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dayFilter, setDayFilter] = useState<Day | ''>('');
  const [showResults, setShowResults] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  const selectedSections = useMemo(
    () => (sections ?? []).filter((s) => s.name && selected.has(s.name)),
    [sections, selected],
  );

  const results: DayFreeResult[] = useMemo(() => {
    if (!showResults || selectedSections.length === 0) return [];
    return computeCommonFreeSlots(selectedSections, dayFilter || undefined);
  }, [showResults, selectedSections, dayFilter]);

  const periods = selectedSections[0]?.periods ?? [];

  async function handleUseOfficial() {
    setSource('official');
    setLoading(true);
    setShowResults(false);
    const result = await loadOfficialTimetable();
    setLoading(false);
    if ('error' in result) {
      showToast(result.error, 'error');
      setSource('none');
      return;
    }
    setSections(result.sections);
    setDocWarnings(result.warnings);
    setSelected(new Set());
  }

  async function handleUpload(file: File) {
    setSource('upload');
    setLoading(true);
    setShowResults(false);
    const formData = new FormData();
    formData.append('file', file);
    const result = await parseUploadedTimetable(formData);
    setLoading(false);
    if ('error' in result) {
      showToast(result.error, 'error');
      setSource('none');
      return;
    }
    setSections(result.sections);
    setDocWarnings(result.warnings);
    setSelected(new Set());
  }

  function toggleSection(name: string) {
    setShowResults(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const readableSections = (sections ?? []).filter((s) => s.name);
  const unreadableSections = (sections ?? []).filter((s) => !s.name || s.warnings.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="mb-2 border-l-4 border-[#1e3a8a] pl-5 py-0.5">
          <h1 className="text-3xl font-bold tracking-tight text-[#1e3a8a] mb-1">Common Free-Slot Finder</h1>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
            Find a meeting time that works across sections
          </p>
        </header>

        {/* SOURCE STEP */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">1. Choose a timetable source</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleUseOfficial}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
                source === 'official' ? 'border-[#1e3a8a] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <School className="w-6 h-6 text-[#1e3a8a] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">FAST-NUCES Multan Campus</p>
                <p className="text-sm text-gray-500">Fall-2026 official batch timetable</p>
              </div>
            </button>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left cursor-pointer transition-colors ${
                source === 'upload' ? 'border-[#1e3a8a] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Upload className="w-6 h-6 text-[#1e3a8a] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Upload your own timetable</p>
                <p className="text-sm text-gray-500">A PDF in the same grid format (PDF only, max 10MB)</p>
              </div>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {source === 'official' && (
            <div className="pt-2">
              <button
                onClick={() => setShowPdf((v) => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-[#1e3a8a] hover:underline"
              >
                <FileText className="w-4 h-4" />
                {showPdf ? 'Hide original PDF' : 'View original PDF'}
                {showPdf ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showPdf && (
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
                  <iframe
                    src={OFFICIAL_TIMETABLE_URL}
                    title="Official FAST-NUCES Multan Campus timetable"
                    className="w-full h-[600px]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {/* PREVIEW / CONFIDENCE STEP */}
        {!loading && sections && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">2. Parsed sections</h2>
            {docWarnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
                {docWarnings.join('; ')}
              </div>
            )}
            {readableSections.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No sections could be read from this file — it may not match the expected timetable grid format.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {readableSections.map((s) => {
                  const hasWarning = s.warnings.length > 0;
                  return (
                    <button
                      key={s.name}
                      onClick={() => toggleSection(s.name!)}
                      title={hasWarning ? s.warnings.join('; ') : undefined}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                        selected.has(s.name!)
                          ? 'border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {hasWarning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${selected.has(s.name!) ? 'text-[#1e3a8a]' : 'text-gray-300'}`} />
                      )}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
            {unreadableSections.filter((s) => !s.name).length > 0 && (
              <p className="text-xs text-gray-400 italic">
                {unreadableSections.filter((s) => !s.name).length} page(s) in this file could not be read and are not shown above.
              </p>
            )}
          </div>
        )}

        {/* DAY FILTER + ACTION */}
        {!loading && sections && selected.size > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">3. Optional day filter</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={dayFilter}
                onChange={(e) => {
                  setDayFilter(e.target.value as Day | '');
                  setShowResults(false);
                }}
                className="w-full sm:w-64 px-4 py-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 text-sm"
              >
                <option value="">All days</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>{DAY_LABELS[d]}</option>
                ))}
              </select>
              <button
                onClick={() => setShowResults(true)}
                className="flex items-center justify-center gap-2 bg-[#1e3a8a] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <Search className="w-4 h-4" />
                Find Common Free Slots
              </button>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {showResults && selectedSections.length > 0 && (
          <div className="space-y-6">
            <ResultsList results={results} />
            <ResultsGrid results={results} periods={periods} sections={selectedSections} />
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsList({ results }: { results: DayFreeResult[] }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-[#1e3a8a]" /> Common free windows
      </h2>
      <div className="space-y-3">
        {results.map((r) => (
          <div key={r.day} className="border border-gray-100 rounded-lg p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">{DAY_LABELS[r.day]}</p>
            {r.incomplete ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {r.incompleteReason ?? 'No data for this day.'}
              </p>
            ) : r.slots.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No common free time.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {r.slots.map((s, i) => (
                  <li key={i} className="text-sm font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1">
                    {formatClockTime(s.start)} &ndash; {formatClockTime(s.end)} &middot; {s.minutes} min
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsGrid({
  results,
  periods,
  sections,
}: {
  results: DayFreeResult[];
  periods: { start: string; end: string }[];
  sections: ParsedSection[];
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly view</h2>
      <div className="min-w-[900px]">
        <div className="grid" style={{ gridTemplateColumns: `80px repeat(${periods.length}, 1fr)` }}>
          <div />
          {periods.map((p, i) => (
            <div key={i} className="text-[9px] text-center text-gray-400 font-semibold pb-1">
              {p.start ? formatClockTime(p.start) : `#${i + 1}`}
            </div>
          ))}
          {results.map((r) => (
            <GridRow key={r.day} result={r} periodCount={periods.length} sections={sections} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> Free for everyone</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Busy</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" /> No data</span>
      </div>
    </div>
  );
}

function GridRow({ result, periodCount, sections }: { result: DayFreeResult; periodCount: number; sections: ParsedSection[] }) {
  // Busy/free is derived directly from each section's own boolean grid for
  // this day (the same source computeCommonFreeSlots used) rather than
  // re-parsing the formatted clock-time slot strings back into indices.
  const busy = new Array(periodCount).fill(false);
  if (!result.incomplete) {
    for (const s of sections) {
      const dayGrid = s.days[result.day];
      if (!dayGrid) continue;
      for (let p = 0; p < periodCount; p++) if (dayGrid[p]) busy[p] = true;
    }
  }

  return (
    <>
      <div className="text-xs font-bold text-gray-600 flex items-center">{DAY_LABELS[result.day]}</div>
      {Array.from({ length: periodCount }).map((_, i) => (
        <div
          key={i}
          className={`h-6 border border-white ${result.incomplete ? 'bg-amber-100' : busy[i] ? 'bg-gray-200' : 'bg-green-200'}`}
        />
      ))}
    </>
  );
}
