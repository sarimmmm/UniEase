'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toaster';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import {
  fetchFaculty,
  fetchFacultyReviews,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  deleteFacultyReview,
} from '@/lib/database';
import { Faculty, FacultyReview } from '@/types';
import { Plus, Pencil, Trash2, X, Star } from 'lucide-react';

const emptyForm = { name: '', department: '', officeHours: '', email: '', campus: 'Multan' };

export default function AdminFacultyPage() {
  const { showToast } = useToast();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [reviews, setReviews] = useState<FacultyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [f, r] = await Promise.all([fetchFaculty(), fetchFacultyReviews()]);
      setFaculty(f);
      setReviews(r);
    } finally {
      setLoading(false);
    }
  };

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(f: Faculty) {
    setEditingId(f.id);
    setForm({ name: f.name, department: f.department, officeHours: f.officeHours, email: f.email, campus: f.campus });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.department.trim() || !form.email.trim()) {
      showToast('Name, department, and email are required.', 'error');
      return;
    }
    setSaving(true);
    const result = editingId ? await updateFaculty(editingId, form) : await createFaculty(form);
    setSaving(false);
    if (result.success) {
      showToast(editingId ? 'Faculty updated.' : 'Faculty added.', 'success');
      setModalOpen(false);
      await loadAll();
    } else {
      showToast(result.error || 'Failed to save.', 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this faculty member? Their reviews will be removed too.')) return;
    const result = await deleteFaculty(id);
    if (result.success) {
      showToast('Faculty deleted.', 'success');
      await loadAll();
    } else {
      showToast(result.error || 'Failed to delete.', 'error');
    }
  }

  async function handleDeleteReview(id: string) {
    if (!confirm('Delete this review?')) return;
    const result = await deleteFacultyReview(id);
    if (result.success) {
      showToast('Review deleted.', 'success');
      await loadAll();
    } else {
      showToast(result.error || 'Failed to delete.', 'error');
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
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Faculty ({faculty.length})</h2>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#1e3a8a] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Add Faculty
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase text-gray-400 border-b">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Department</th>
                <th className="py-2 pr-4">Campus</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {faculty.map((f) => (
                <tr key={f.id}>
                  <td className="py-3 pr-4 font-semibold text-gray-900">{f.name}</td>
                  <td className="py-3 pr-4 text-gray-600">{f.department}</td>
                  <td className="py-3 pr-4 text-gray-600">{f.campus}</td>
                  <td className="py-3 pr-4 text-gray-600">{f.email}</td>
                  <td className="py-3 pr-4 flex gap-2 justify-end">
                    <button onClick={() => openEdit(f)} className="p-1.5 text-gray-500 hover:text-[#1e3a8a]">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(f.id)} className="p-1.5 text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {faculty.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 italic">No faculty yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Review Moderation ({reviews.length})</h2>
        <div className="space-y-3">
          {reviews.map((r) => {
            const f = faculty.find((x) => x.id === r.facultyId);
            return (
              <div key={r.id} className="flex items-start justify-between gap-4 border border-gray-100 rounded-lg p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900 text-sm">{r.studentName}</span>
                    <span className="text-xs text-gray-400">on</span>
                    <span className="text-xs font-semibold text-[#1e3a8a]">{f?.name ?? 'Unknown faculty'}</span>
                    <span className="flex gap-0.5 ml-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{r.comment}</p>
                </div>
                <button onClick={() => handleDeleteReview(r.id)} className="p-1.5 text-red-500 hover:text-red-700 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {reviews.length === 0 && <p className="text-center text-gray-400 italic py-4">No reviews yet.</p>}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#1e3a8a]">{editingId ? 'Edit Faculty' : 'Add Faculty'}</h3>
              <button onClick={() => setModalOpen(false)}><X /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-gray-400">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-400">Department</label>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-400">Office Hours</label>
                <input value={form.officeHours} onChange={(e) => setForm({ ...form, officeHours: e.target.value })} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-400">Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-400">Campus</label>
                <select value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl">
                  <option value="Multan">Multan</option>
                  <option value="Lahore">Lahore</option>
                  <option value="Islamabad">Islamabad</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3 rounded-b-2xl">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-[2] py-3 bg-[#1e3a8a] text-white rounded-xl font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
