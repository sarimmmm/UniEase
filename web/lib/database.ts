'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import LoginModal from '@/components/LoginModal';
import { fetchFaculty, fetchFacultyReviews, addFacultyReview } from '@/lib/database'; 
import { Faculty, FacultyReview } from '@/types';
import { Search, Star, Clock, Mail, ChevronDown, ChevronUp, MessageSquare, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function FacultyPage() {
  const { user } = useAuth();
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [allReviews, setAllReviews] = useState<FacultyReview[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [f, r] = await Promise.all([fetchFaculty(), fetchFacultyReviews()]);
      setFacultyList(f);
      setAllReviews(r);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSubmitReview = async (e: React.FormEvent, facultyId: string) => {
    e.preventDefault();
    if (!user) return;

    const currentF = facultyList.find(f => f.id === facultyId);
    const displayName = isAnonymous ? "Anonymous Student" : (user.email?.split('@')[0] || 'Student');

    const result = await addFacultyReview({
      facultyId,
      facultyName: currentF?.name || 'Faculty',
      studentId: user.id,
      studentName: displayName,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
      isAnonymous
    });

    if (result.success) {
      setAllReviews([{ id: Math.random().toString(), facultyId, studentId: user.id, studentName: displayName, rating: reviewForm.rating, comment: reviewForm.comment, createdAt: new Date().toISOString() }, ...allReviews]);
      setShowReviewForm(false);
      setReviewForm({ rating: 5, comment: '' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* FORMAL HEADER SECTION */}
        <header className="mb-10 border-l-4 border-[#1e3a8a] pl-6 py-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#1e3a8a] mb-1">Faculty Directory</h1>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
            Faculty Information & Student Evaluations
          </p>
        </header>

        {/* SEARCH SECTION */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search faculty members..." 
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* DIRECTORY LISTING */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Synchronizing Database...</div>
          ) : (
            facultyList.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).map((faculty) => (
              <div key={faculty.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 cursor-pointer flex justify-between items-center" onClick={() => setSelectedFacultyId(selectedFacultyId === faculty.id ? null : faculty.id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1e3a8a] rounded-full flex items-center justify-center text-white font-bold">{faculty.name[0]}</div>
                    <div>
                      <h3 className="font-bold text-gray-900">{faculty.name}</h3>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{faculty.department}</p>
                    </div>
                  </div>
                  <ChevronDown className={`text-gray-400 transition-transform ${selectedFacultyId === faculty.id ? 'rotate-180' : ''}`} />
                </div>

                {selectedFacultyId === faculty.id && (
                  <div className="px-6 pb-6 bg-slate-50 border-t">
                    <div className="py-4 flex justify-between items-center">
                      <h4 className="font-bold text-sm text-slate-700 uppercase tracking-widest">Student Reviews</h4>
                      <button onClick={() => setShowReviewForm(!showReviewForm)} className="text-xs font-bold text-[#1e3a8a] uppercase">
                        {showReviewForm ? 'Cancel' : 'Add Evaluation'}
                      </button>
                    </div>

                    {showReviewForm && (
                      <form onSubmit={(e) => handleSubmitReview(e, faculty.id)} className="bg-white p-4 rounded-lg border mb-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} onClick={() => setReviewForm({...reviewForm, rating: s})} className={`w-5 h-5 cursor-pointer ${s <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="rounded border-gray-300 text-[#1e3a8a]" />
                            <span className="text-[10px] font-bold uppercase text-slate-500">Anonymous</span>
                          </label>
                        </div>
                        <textarea className="w-full p-3 border rounded text-sm focus:ring-1 focus:ring-[#1e3a8a] outline-none" rows={3} placeholder="Provide professional feedback..." value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} required />
                        <button type="submit" className="bg-[#1e3a8a] text-white px-6 py-2 rounded font-bold text-xs uppercase tracking-widest">Submit</button>
                      </form>
                    )}

                    <div className="space-y-3">
                      {allReviews.filter(r => r.facultyId === faculty.id).map(r => (
                        <div key={r.id} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-bold text-slate-800">{r.studentName}</span>
                            <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-100'}`} />)}</div>
                          </div>
                          <p className="text-sm text-slate-600 italic">"{r.comment}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* INSTITUTIONAL FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500 font-medium">© 2025 UniEase Systems. Secure Campus Network.</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Developed by <span className="text-[#1e3a8a]">Sarim</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
