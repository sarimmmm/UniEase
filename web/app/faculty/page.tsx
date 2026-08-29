'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import LoginModal from '@/components/LoginModal';
import { fetchFaculty, fetchFacultyReviews, addFacultyReview } from '@/lib/database'; 
import { Faculty, FacultyReview } from '@/types';
import { Search, Star, Clock, Mail, ChevronDown, ChevronUp, MessageSquare, ShieldCheck, User } from 'lucide-react';import { useAuth } from '@/contexts/AuthContext';

export default function FacultyPage() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [allReviews, setAllReviews] = useState<FacultyReview[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [facultyData, reviewData] = await Promise.all([
          fetchFaculty(),
          fetchFacultyReviews()
        ]);
        setFacultyList(facultyData);
        setAllReviews(reviewData);
      } catch (error) {
        console.error("Failed to load directory data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredFaculty = facultyList.filter((faculty) => {
    const matchesSearch = faculty.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === 'all' || faculty.department === selectedDepartment;
    const matchesCampus = selectedCampus === 'all' || faculty.campus === selectedCampus;
    return matchesSearch && matchesDept && matchesCampus;
  });

  const campuses = Array.from(new Set(facultyList.map((f) => f.campus))).sort();
  const departments = Array.from(
    new Set(
      facultyList
        .filter((f) => selectedCampus === 'all' || f.campus === selectedCampus)
        .map((f) => f.department)
    )
  ).sort();

  const getFacultyReviews = (fId: string) => allReviews.filter((r) => r.facultyId === fId);

  const getAvgRating = (fId: string) => {
    const fReviews = getFacultyReviews(fId);
    if (fReviews.length === 0) return 0;
    const sum = fReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / fReviews.length).toFixed(1);
  };

  const handleToggle = (id: string) => {
    setSelectedFacultyId(selectedFacultyId === id ? null : id);
    setShowReviewForm(false);
  };

  const handleSubmitReview = async (e: React.FormEvent, facultyId: string) => {
    e.preventDefault();
    if (!isAuthenticated) return setShowLoginModal(true);

    const currentFaculty = facultyList.find(f => f.id === facultyId);
    const displayUserName = user.email?.split('@')[0] || 'Student';

    const result = await addFacultyReview({
      facultyId: facultyId,
      facultyName: currentFaculty?.name || 'Faculty Member',
      studentId: user.id,
      studentName: displayUserName,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
    });

    if (result.success) {
      const newLocalReview: FacultyReview = {
        id: Math.random().toString(),
        facultyId: facultyId,
        studentId: user.id,
        studentName: displayUserName,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        createdAt: new Date().toISOString(),
      };
      setAllReviews([newLocalReview, ...allReviews]);
      setReviewForm({ rating: 5, comment: '' });
      setShowReviewForm(false);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="space-y-6">
          {/* FORMAL HEADER SECTION */}
          <header className="mb-8 border-l-4 border-[#1e3a8a] pl-5 py-0.5">
            <h1 className="text-3xl font-bold tracking-tight text-[#1e3a8a] mb-1">
              Faculty Directory
            </h1>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
              Faculty Information & Student Reviews
            </p>
          </header>

          {/* SEARCH & FILTERS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search faculty by name..." 
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select 
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 text-sm"
                onChange={(e) => setSelectedDepartment(e.target.value)}
                value={selectedDepartment}
              >
                <option value="all">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none bg-gray-50 text-sm"
                onChange={(e) => { setSelectedCampus(e.target.value); setSelectedDepartment('all'); }}
                value={selectedCampus}
              >
                <option value="all">All Campuses</option>
                {campuses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* DIRECTORY LIST */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-gray-400 italic">Connecting to University Database...</div>
            ) : filteredFaculty.map((faculty) => {
              const expanded = selectedFacultyId === faculty.id;
              const reviews = getFacultyReviews(faculty.id);
              const rating = getAvgRating(faculty.id);

              return (
                <div key={faculty.id} className={`bg-white border rounded-xl overflow-hidden transition-all duration-300 ${expanded ? 'border-[#1e3a8a] shadow-md ring-1 ring-[#1e3a8a]/5' : 'border-gray-200 shadow-sm hover:border-gray-300'}`}>
                  <div className="p-6 cursor-pointer" onClick={() => handleToggle(faculty.id)}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#1e3a8a] rounded-full flex items-center justify-center text-white font-bold text-xl">{faculty.name.charAt(0)}</div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{faculty.name}</h3>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-[#1e3a8a] rounded uppercase">{faculty.department}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded uppercase">{faculty.campus}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-300" /> {faculty.officeHours}</div>
                        <a href={`mailto:${faculty.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-blue-600 hover:underline truncate">
                          <Mail className="w-4 h-4 text-blue-300" /> {faculty.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-bold text-yellow-700">{rating === '0.0' ? 'New' : rating}</span>
                        </div>
                        {expanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="bg-gray-50/50 border-t border-gray-100 p-6 animate-in slide-in-from-top duration-300">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-[#1e3a8a]" /> Student Reviews ({reviews.length})</h4>
                        <button onClick={e => { e.stopPropagation(); setShowReviewForm(!showReviewForm); }} className="text-xs font-bold text-[#1e3a8a] hover:underline uppercase">
                          {showReviewForm ? 'Close' : 'Add Review'}
                        </button>
                      </div>

                      {showReviewForm && (
                        <form onSubmit={e => handleSubmitReview(e, faculty.id)} onClick={e => e.stopPropagation()} className="mb-6 p-6 bg-white border rounded-xl shadow-sm space-y-4">
                          <div className="bg-blue-50 border-l-4 border-[#1e3a8a] p-4 rounded-r-lg flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-[#1e3a8a] mt-0.5" />
                            <p className="text-xs text-[#1e3a8a] font-medium leading-relaxed italic">
                              Professional feedback helps the entire UniEase community make better decisions.
                            </p>
                          </div>
                          
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`w-6 h-6 cursor-pointer transition-colors ${s <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} onClick={() => setReviewForm({ ...reviewForm, rating: s })} />
                            ))}
                          </div>

                          <textarea className="w-full p-4 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a]/20" placeholder="Share your experience..." rows={3} value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} required />
                          <button type="submit" className="bg-[#1e3a8a] hover:bg-blue-800 text-white px-8 py-2.5 rounded-lg font-bold text-sm transition-colors">Post Review</button>
                        </form>
                      )}

                      <div className="space-y-4">
                        {reviews.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm italic">No reviews yet for {faculty.name}.</p>
                        ) : (
                          reviews.map((r) => (
                            <div key={r.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-gray-800">{r.studentName}</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-100'}`} />)}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 italic">"{r.comment}"</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} title="Faculty Review" message="Please sign in with your student account to share feedback." />
    </div>
  );
}
