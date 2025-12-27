'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import LoginModal from '@/components/LoginModal';
import { subjects } from '@/lib/data'; // Removed difficultyLevels
import { fetchStudyRequests, createStudyRequest } from '@/lib/database';
import { HelpRequest } from '@/types';
import { Search, Plus, User, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toaster';
import { StudyRequestSkeleton } from '@/components/LoadingSkeleton';

export default function StudyBuddyPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAuthenticated = !!user;
  const [showForm, setShowForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [connectedRequests, setConnectedRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchStudyRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simplified Form state (Removed difficultyLevel)
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    description: '',
  });

  const handlePostRequest = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setShowForm(!showForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      setShowLoginModal(true);
      return;
    }

    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    const userEmail = user.email || '';

    const result = await createStudyRequest({
      studentId: user.id,
      studentName: userName,
      studentEmail: userEmail,
      subject: formData.subject,
      topic: formData.topic,
      description: formData.description,
      // Pass a default or omit if you updated the database column
      difficultyLevel: 'Beginner', 
    });

    if (result.success) {
      setFormData({ subject: '', topic: '', description: '' });
      setShowForm(false);
      showToast('Request posted successfully!', 'success');
      await loadRequests();
    } else {
      showToast(result.error || 'Failed to post request. Please try again.', 'error');
    }
  };

  const handleConnect = (requestId: string) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setConnectedRequests(new Set([...connectedRequests, requestId]));
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || request.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Buddy</h1>
              <p className="text-gray-600">Find or offer study help with your peers</p>
            </div>
            <button
              onClick={handlePostRequest}
              className="flex items-center gap-2 bg-[#1e3a8a] text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {showForm ? 'Cancel' : 'Post Request'}
            </button>
          </div>

          {/* SIMPLIFIED POST FORM */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Post a Help Request</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    required
                  >
                    <option value="">Select a subject</option>
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="e.g., Integration by Parts, Bitwise Operations"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what help you need..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1e3a8a] text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Post Request
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            {/* CLEANER FILTER SECTION */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by topic, subject, or description..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              >
                <option value="all">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Note:</span> Requests expire after 30 days. Only active requests from the last 30 days are displayed.
              </p>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <StudyRequestSkeleton key={i} />)}
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No help requests found. Be the first to post one!</p>
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-[#1e3a8a] rounded-full flex items-center justify-center text-white font-semibold">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{request.studentName}</h3>
                            <p className="text-sm text-gray-500">{request.subject}</p>
                          </div>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">{request.topic}</h4>
                        <p className="text-gray-600 mb-4">{request.description}</p>
                        <div className="text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                        
                        {connectedRequests.has(request.id) && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2 text-sm text-[#1e3a8a]">
                            <Mail className="w-4 h-4" />
                            <span className="font-semibold">Contact:</span>
                            <span>{request.studentEmail}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {connectedRequests.has(request.id) ? (
                          <button disabled className="px-6 py-2 bg-gray-200 text-gray-600 rounded-lg font-semibold cursor-not-allowed">
                            Request Sent
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(request.id)}
                            className="px-6 py-2 bg-[#1e3a8a] text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          if (user) loadRequests();
        }}
        title="Login Required"
        message="Please sign in to post a request or connect with other students."
      />
    </div>
  );
}
