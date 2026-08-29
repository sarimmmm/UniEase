'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toaster';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { fetchStudyRequests, deleteStudyRequestAdmin, updateStudyRequestStatus } from '@/lib/database';
import { HelpRequest } from '@/types';
import { Trash2 } from 'lucide-react';

const STATUS_STYLES: Record<HelpRequest['status'], string> = {
  Open: 'bg-blue-50 text-blue-700 border-blue-200',
  Connected: 'bg-green-50 text-green-700 border-green-200',
  Closed: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function AdminStudyRequestsPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      setRequests(await fetchStudyRequests());
    } finally {
      setLoading(false);
    }
  };

  async function handleDelete(id: string) {
    if (!confirm('Delete this study request?')) return;
    const result = await deleteStudyRequestAdmin(id);
    if (result.success) {
      showToast('Request deleted.', 'success');
      await load();
    } else {
      showToast(result.error || 'Failed to delete.', 'error');
    }
  }

  async function handleStatusChange(id: string, status: HelpRequest['status']) {
    const result = await updateStudyRequestStatus(id, status);
    if (result.success) {
      showToast('Status updated.', 'success');
      await load();
    } else {
      showToast(result.error || 'Failed to update.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Study Requests ({requests.length})</h2>
      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="border border-gray-100 rounded-lg p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-900 text-sm">{r.studentName}</span>
                <span className="text-xs font-bold text-[#1e3a8a] uppercase">{r.subject}</span>
              </div>
              <p className="font-semibold text-gray-800 text-sm">{r.topic}</p>
              <p className="text-sm text-gray-500 truncate">{r.description}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString()} &middot; {r.studentEmail}</p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <select
                value={r.status}
                onChange={(e) => handleStatusChange(r.id, e.target.value as HelpRequest['status'])}
                className={`text-xs font-bold rounded-full px-3 py-1 border outline-none ${STATUS_STYLES[r.status]}`}
              >
                <option value="Open">Open</option>
                <option value="Connected">Connected</option>
                <option value="Closed">Closed</option>
              </select>
              <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {requests.length === 0 && <p className="text-center text-gray-400 italic py-8">No study requests yet.</p>}
      </div>
    </div>
  );
}
