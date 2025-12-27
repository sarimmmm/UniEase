'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import LoginModal from '@/components/LoginModal';
import { dummyFaculty, dummyFacultyReviews } from '@/lib/data';
import { Faculty, FacultyReview } from '@/types';
import { Search, Star, Clock, Mail, GraduationCap, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function FacultyPage() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [reviews, setReviews] = useState<FacultyReview[]>(dummyFacultyReviews);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
  });

  const departments = Array.from(new Set(dummyFaculty.map((f) => f.department)));

  const filteredFaculty = dummyFaculty.filter((faculty) => {
    const matchesSearch =
      faculty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faculty.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || faculty.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getFacultyReviews = (facultyId: string) => {
    return reviews.filter((review) => review.facultyId === facultyId);
  };

  const getAverageRating = (facultyId: string) => {
    const facultyReviews = getFacultyReviews(facultyId);
    if (facultyReviews.length === 0) return 0;
    const sum = facultyReviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / facultyReviews.length).toFixed(1);
  };

  const handleWriteReview = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setShowReviewForm(!showReviewForm);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    const newReview: FacultyReview = {
      id: Date.now().toString(),
      facultyId: selectedFaculty.id,
      studentId: 'current-user',
      studentName: 'You',
      rating: reviewForm.rating,
      comment: reviewForm.comment,
      createdAt: new Date(),
    };

    setReviews([...reviews, newReview]);
    setReviewForm({ rating: 5, comment: '' });
    setShowReviewForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Faculty Directory</h1>
            <p className="text-gray-600">Browse faculty members and read reviews</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or department..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none"
                />
              </div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFaculty.map((faculty) => {
                const averageRating = getAverageRating(faculty.id);
                const facultyReviews = getFacultyReviews(faculty.id);

                return (
                  <div
                    key={faculty.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedFaculty(faculty)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-[#1e3a8a] rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {faculty.name.charAt(0)}
                      </div>
                      {averageRating !== '0' && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold text-gray-700">{averageRating}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{faculty.name}</h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 className="w-4 h-4" />
                        <span>{faculty.department}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{faculty.officeHours}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{faculty.email}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      {facultyReviews.length} {facultyReviews.length === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedFaculty && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedFaculty.name}</h2>
                  <div className="flex items-center gap-2 text-gray-600">
                    <GraduationCap className="w-5 h-5" />
                    <span>{selectedFaculty.department}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFaculty(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Office Hours</h3>
                  <p className="text-gray-600 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {selectedFaculty.officeHours}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Email</h3>
                  <p className="text-gray-600 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {selectedFaculty.email}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Reviews</h3>
                  <button
                    onClick={handleWriteReview}
                    className="px-4 py-2 bg-[#1e3a8a] text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                  >
                    {showReviewForm ? 'Cancel' : 'Write Review'}
                  </button>
                </div>

                {showReviewForm && (
                  <form onSubmit={handleSubmitReview} className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= reviewForm.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        placeholder="Share your experience..."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#1e3a8a] text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Submit Review
                    </button>
                  </form>
                )}

                <div className="space-y-4">
                  {getFacultyReviews(selectedFaculty.id).length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No reviews yet. Be the first to review!</p>
                  ) : (
                    getFacultyReviews(selectedFaculty.id).map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{review.studentName}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-700">{review.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Login Required"
        message="Please sign in to write a review."
      />
    </div>
  );
}
