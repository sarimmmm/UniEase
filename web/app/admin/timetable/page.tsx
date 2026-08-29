'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toaster';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { supabase } from '@/lib/supabase';
import { loadOfficialTimetable, parseUploadedTimetable } from '@/app/actions/timetable';
import { OFFICIAL_TIMETABLE_BUCKET, OFFICIAL_TIMETABLE_PATH } from '@/lib/timetable-constants';
import { ParsedSection } from '@/lib/timetable-parser/types';
import { Upload, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminTimetablePage() {
  const { showToast } = useToast();
  const [currentSections, setCurrentSections] = useState<ParsedSection[] | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewSections, setPreviewSections] = useState<ParsedSection[] | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCurrent = async () => {
    setLoadingCurrent(true);
    try {
      const result = await loadOfficialTimetable();
      if ('error' in result) {
        showToast(result.error, 'error');
        return;
      }
      setCurrentSections(result.sections);
    } finally {
      setLoadingCurrent(false);
    }
  };

  async function handleFileSelected(file: File) {
    setPendingFile(file);
    setPreviewSections(null);
    setPreviewing(true);
    const formData = new FormData();
    formData.append('file', file);
    const result = await parseUploadedTimetable(formData);
    setPreviewing(false);
    if ('error' in result) {
      showToast(result.error, 'error');
      setPendingFile(null);
      return;
    }
    setPreviewSections(result.sections);
    setPreviewWarnings(result.warnings);
  }

  async function handleConfirmReplace() {
    if (!pendingFile) return;
    setUploading(true);
    const { error } = await supabase.storage
      .from(OFFICIAL_TIMETABLE_BUCKET)
      .upload(OFFICIAL_TIMETABLE_PATH, pendingFile, { upsert: true, contentType: 'application/pdf' });
    setUploading(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Official timetable replaced.', 'success');
    setPendingFile(null);
    setPreviewSections(null);
    await loadCurrent();
  }

  const readableCount = (sections: ParsedSection[] | null) => (sections ?? []).filter((s) => s.name).length;
  const warningCount = (sections: ParsedSection[] | null) => (sections ?? []).filter((s) => s.warnings.length > 0).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Current official timetable</h2>
        {loadingCurrent ? (
          <CardSkeleton />
        ) : (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <p className="text-2xl font-black text-gray-900">{readableCount(currentSections)}</p>
              <p className="text-gray-500">sections readable</p>
            </div>
            {warningCount(currentSections) > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                {warningCount(currentSections)} section(s) with parser warnings
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Replace with a new PDF</h2>
        <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">
          <Upload className="w-6 h-6 text-[#1e3a8a]" />
          <div>
            <p className="font-bold text-gray-900">Choose a PDF file</p>
            <p className="text-sm text-gray-500">Same aSc Timetables grid format, max 10MB. Will replace the file everyone sees on the public Timetable page.</p>
          </div>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
              e.target.value = '';
            }}
          />
        </label>

        {previewing && <CardSkeleton />}

        {previewSections && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-[#1e3a8a]">
              Preview: {readableCount(previewSections)} section(s) readable
              {warningCount(previewSections) > 0 && `, ${warningCount(previewSections)} with warnings`}.
              Nothing is replaced until you confirm below.
            </div>
            {previewWarnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
                {previewWarnings.join('; ')}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {previewSections.map((s, i) => (
                <div
                  key={i}
                  title={s.warnings.join('; ')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold ${
                    s.name && s.warnings.length === 0 ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}
                >
                  {s.name && s.warnings.length === 0 ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                  {s.name ?? 'Unreadable page'}
                </div>
              ))}
            </div>
            <button
              onClick={handleConfirmReplace}
              disabled={uploading}
              className="flex items-center gap-2 bg-[#1e3a8a] text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${uploading ? 'animate-spin' : ''}`} />
              {uploading ? 'Replacing...' : 'Confirm Replace'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
