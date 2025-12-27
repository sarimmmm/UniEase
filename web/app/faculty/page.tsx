'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import LoginModal from '@/components/LoginModal';
import { supabase } from '@/lib/supabase';
import { Faculty, FacultyReview } from '@/types';
import { Search, Star, Clock, Mail, GraduationCap, Building2, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function FacultyPage() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [allReviews, setAllReviews] = useState<FacultyReview[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      // Mapping Supabase underscore names to your CamelCase interface
      const { data: facultyData } = await supabase.from('faculty').select('*').order('name');
      const { data: reviewData } = await supabase.from('faculty_reviews').select('*');
      
      if (facultyData) {
        const formattedFaculty = facultyData.map(f => ({
          ...f,
          officeHours: f.office_hours // Syncing DB underscores to your CamelCase types
        }));
        setFacultyList(formattedFaculty);
      }
      
      if (reviewData) {
        const formattedReviews = reviewData.map(r => ({
          ...r,
          facultyId: r.faculty_id, // Syncing DB underscores to your CamelCase types
          studentId: r.student_id,
          studentName: r.student_name
        }));
        setAllReviews(formattedReviews);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredFaculty = facultyList.filter((faculty) => {
    const matchesSearch = faculty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faculty.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === 'all' || faculty.department === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const getFacultyReviews = (fId: string) => allReviews.filter((r) => r.facultyId === fId);

  const getAvgRating = (fId: string) => {
    const fReviews = getFacultyReviews(fId);
    if (fReviews.length === 0) return 0;
    return (fReviews.reduce((acc, r) => acc + r.rating, 0) / fReviews.length).toFixed(1);
  };

  const handleToggle = (id: string) => {
    setSelectedFacultyId(selectedFacultyId === id ? null : id);
    setShowReviewForm(false);
  };

  const handleSubmitReview = async (e: React.FormEvent, facultyId: string) => {
    e.preventDefault();
    if (!isAuthenticated) return setShowLoginModal(true);

    const newReview = {
      faculty_id: facultyId, // Sent as underscore for Supabase
      student_id: user.id,
      student_name: user.email?.split('@')[0] || 'Student',
      rating: reviewForm.rating,
      comment: reviewForm.comment,
    };

    const { data, error } = await supabase.from('faculty_reviews').insert([newReview]).select();
    
    if (data) {
      const formatted = { ...data[0], facultyId: data[0].faculty_id, studentName: data[0].student_name };
      setAllReviews([...allReviews, formatted]);
      setReviewForm({ rating: 5, comment: '' });
      setShowReviewForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-[#1e3a8a]">Faculty Directory</h1>
            <p className="text-gray-600">Browse faculty and read student reviews inline.</p>
          </header>

          {/* List and UI */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-gray-400 italic">Connecting to University Database...</div>
            ) : filteredFaculty.map((faculty) => {
              const expanded = selectedFacultyId === faculty.id;
              const reviews = getFacultyReviews(faculty.id);
              const rating = getAvgRating(faculty.id);

              return (
                <div key={faculty.id} className={`bg-white border rounded-xl overflow-hidden transition-all duration-300 ${expanded ? 'border-[#1e3a8a] shadow-md' : 'border-gray-200'}`}>
                  <div className="p-6 cursor-pointer" onClick={() => handleToggle(faculty.id)}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#1e3a8a] rounded-full flex items-center justify-center text-white font-bold text-xl">{faculty.name.charAt(0)}</div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{faculty.name}</h3>
                          <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-[#1e3a8a] rounded uppercase">{faculty.department}</span>
                        </div>
                      </div>

                      <div className="flex-1 max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> {faculty.officeHours}</div>
                        <a href={`mailto:${faculty.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-blue-600 hover:underline truncate">
                          <Mail className="w-4 h-4 text-blue-400" /> {faculty.email}
                        </a>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-bold text-yellow-700">{rating === 0 ? 'New' : rating}</span>
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
                          {showReviewForm ? 'Cancel' : 'Write a Review'}
                        </button>
                      </div>

                      {showReviewForm && (
                        <form onSubmit={e => handleSubmitReview(e, faculty.id)} onClick={e => e.stopPropagation()} className="mb-6 p-4 bg-white border rounded-xl shadow-sm">
                          <div className="flex gap-1.5 mb-4">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`w-6 h-6 cursor-pointer ${s <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} onClick={() => setReviewForm({ ...reviewForm, rating: s })} />
                            ))}
                          </div>
                          <textarea 
                            className="w-full p-4 border rounded-lg text-sm mb-4 outline-none focus:ring-1 focus:ring-[#1e3a8a]" 
                            placeholder="Share your experience..." 
                            rows={3}
                            value={reviewForm.comment}
                            onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                            required 
                          />
                          <button type="submit" className="bg-[#1e3a8a] text-white px-8 py-2.5 rounded-lg font-bold text-sm">Submit Review</button>
                        </form>
                      )}

                      <div className="space-y-4">
                        {reviews.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm italic">No reviews yet.</p>
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
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} title="Faculty Review" message="Please log in with your university account to review faculty." />
    </div>
  );
}
