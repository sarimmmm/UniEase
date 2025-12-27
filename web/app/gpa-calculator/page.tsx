'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Calculator, X, Settings2 } from 'lucide-react';
import { saveStudentGrade, fetchStudentGrades, deleteStudentGrade, updateStudentGrade } from '@/lib/database';
import { useToast } from '@/components/Toaster';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import LoginModal from '@/components/LoginModal';

// Grade mapping based on percentage
const getGradeFromPercentage = (percentage: number) => {
  if (percentage >= 90) return { grade: 'A+', points: 4.0 };
  if (percentage >= 86) return { grade: 'A', points: 4.0 };
  if (percentage >= 82) return { grade: 'A-', points: 3.67 };
  if (percentage >= 78) return { grade: 'B+', points: 3.33 };
  if (percentage >= 74) return { grade: 'B', points: 3.0 };
  if (percentage >= 70) return { grade: 'B-', points: 2.67 };
  if (percentage >= 66) return { grade: 'C+', points: 2.33 };
  if (percentage >= 62) return { grade: 'C', points: 2.0 };
  if (percentage >= 58) return { grade: 'C-', points: 1.67 };
  if (percentage >= 54) return { grade: 'D+', points: 1.33 };
  if (percentage >= 50) return { grade: 'D', points: 1.0 };
  return { grade: 'F', points: 0.0 };
};

interface AssessmentBreakdown {
  quizzes: { total: number; obt: number };
  assignments: { total: number; obt: number };
  classParticipation: { total: number; obt: number };
  sessional1: { total: number; obt: number };
  sessional2: { total: number; obt: number };
  finalExam: { total: number; obt: number };
  project: { total: number; obt: number };
  labTasks: { total: number; obt: number };
}

interface Course {
  id: string;
  courseName: string;
  credits: number;
  grade: string;
  points: number;
  percentage: number;
  breakdown: AssessmentBreakdown;
}

const defaultBreakdown: AssessmentBreakdown = {
  quizzes: { total: 10, obt: 0 },
  assignments: { total: 10, obt: 0 },
  classParticipation: { total: 5, obt: 0 },
  sessional1: { total: 15, obt: 0 },
  sessional2: { total: 15, obt: 0 },
  finalExam: { total: 45, obt: 0 },
  project: { total: 0, obt: 0 },
  labTasks: { total: 0, obt: 0 },
};

export default function GPACalculatorPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadGrades();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const data = await fetchStudentGrades(user?.id || '');
      const sanitizedData = data.map((c: any) => ({
        ...c,
        breakdown: c.breakdown || defaultBreakdown,
        percentage: c.percentage || 0,
        points: c.points || 0,
      }));
      setCourses(sanitizedData);
    } catch (error) {
      showToast('Failed to load grades', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (breakdown: AssessmentBreakdown): number => {
    const totalObtained = Object.values(breakdown).reduce((acc, curr) => acc + curr.obt, 0);
    const totalPossible = Object.values(breakdown).reduce((acc, curr) => acc + curr.total, 0);
    
    // If no total weightage is set, return 0
    if (totalPossible === 0) return 0;
    
    // Calculate percentage: (obtained / possible) * 100
    return (totalObtained / totalPossible) * 100;
  };

  const openModal = (course?: Course) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (course) {
      setActiveCourse({ ...course });
    } else {
      const newCourse: Course = {
        id: `new-${Date.now()}`,
        courseName: '',
        credits: 3,
        grade: 'F',
        points: 0,
        percentage: 0,
        breakdown: { ...defaultBreakdown },
      };
      setActiveCourse(newCourse);
    }
    setIsModalOpen(true);
  };

  const updateBreakdown = (component: keyof AssessmentBreakdown, field: 'total' | 'obt', value: number) => {
    if (!activeCourse) return;
    const newBreakdown = {
      ...activeCourse.breakdown,
      [component]: {
        ...activeCourse.breakdown[component],
        [field]: value,
      },
    };
    const percentage = calculatePercentage(newBreakdown);
    const { grade, points } = getGradeFromPercentage(percentage);
    setActiveCourse({
      ...activeCourse,
      breakdown: newBreakdown,
      percentage,
      grade,
      points,
    });
  };

  const saveCourse = async () => {
    if (!activeCourse || !user || !activeCourse.courseName.trim()) {
      showToast('Please enter a course name', 'error');
      return;
    }

    setSaving(true);
    try {
      const courseData = {
        courseName: activeCourse.courseName,
        credits: activeCourse.credits,
        grade: activeCourse.grade,
        breakdown: activeCourse.breakdown,
        percentage: activeCourse.percentage,
        points: activeCourse.points,
      };

      console.log('Saving course data:', JSON.stringify(courseData, null, 2));
      console.log('Active course:', JSON.stringify(activeCourse, null, 2));

      if (activeCourse.id.startsWith('new-')) {
        // New course
        console.log('Creating new course...');
        const result = await saveStudentGrade(user.id, courseData);
        console.log('Save result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
          showToast('Course saved successfully', 'success');
          await loadGrades();
          setIsModalOpen(false);
          setActiveCourse(null);
        } else {
          console.error('Failed to save course:', result.error);
          showToast(result.error || 'Failed to save course', 'error');
        }
      } else {
        // Update existing course
        console.log('Updating existing course:', activeCourse.id);
        const result = await updateStudentGrade(user.id, activeCourse.id, courseData);
        console.log('Update result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
          showToast('Course updated successfully', 'success');
          await loadGrades();
          setIsModalOpen(false);
          setActiveCourse(null);
        } else {
          console.error('Failed to update course:', result.error);
          showToast(result.error || 'Failed to update course', 'error');
        }
      }
    } catch (error) {
      console.error('Exception in saveCourse:', JSON.stringify(error, null, 2));
      showToast('An error occurred while saving', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!user || !confirm('Are you sure you want to delete this course?')) return;

    try {
      const result = await deleteStudentGrade(user.id, courseId);
      if (result.success) {
        showToast('Course deleted successfully', 'success');
        await loadGrades();
      } else {
        showToast(result.error || 'Failed to delete course', 'error');
      }
    } catch (error) {
      showToast('An error occurred while deleting', 'error');
    }
  };

  const calculateTotalGPA = (): number => {
    let totalPoints = 0;
    let totalCredits = 0;
    courses.forEach((c) => {
      if (c.credits > 0 && c.courseName.trim()) {
        totalPoints += c.points * c.credits;
        totalCredits += c.credits;
      }
    });
    return totalCredits === 0 ? 0 : totalPoints / totalCredits;
  };

  const assessmentComponents = [
    { key: 'quizzes' as const, label: 'Quizzes' },
    { key: 'assignments' as const, label: 'Assignments' },
    { key: 'classParticipation' as const, label: 'Class Participation' },
    { key: 'sessional1' as const, label: 'Sessional 1' },
    { key: 'sessional2' as const, label: 'Sessional 2' },
    { key: 'finalExam' as const, label: 'Final Exam' },
    { key: 'project' as const, label: 'Project' },
    { key: 'labTasks' as const, label: 'Lab Tasks' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1e3a8a] mb-2">GPA Calculator</h1>
            <p className="text-gray-600">Track your academic performance with detailed assessment breakdown</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-[#1e3a8a] text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" /> Add Course
          </button>
        </div>

        {/* GPA Display */}
        <div className="bg-gradient-to-r from-[#1e3a8a] to-blue-700 rounded-xl shadow-lg p-8 mb-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-2">Semester GPA</p>
              <h2 className="text-5xl font-black">{calculateTotalGPA().toFixed(2)}</h2>
              <p className="text-blue-100 text-sm mt-2">
                Based on {courses.filter((c) => c.courseName.trim() && c.credits > 0).length} course
                {courses.filter((c) => c.courseName.trim() && c.credits > 0).length !== 1 ? 's' : ''}
              </p>
            </div>
            <Calculator className="w-16 h-16 text-blue-200" />
          </div>
        </div>

        {/* Courses List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">No courses added yet. Click "Add Course" to get started.</p>
            {!user && (
              <p className="text-sm text-gray-400">You need to be logged in to save your courses.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-4">
                    <h3 className="text-xl font-bold text-gray-900">{course.courseName || 'Untitled Course'}</h3>
                    <p className="text-sm text-gray-500">{course.credits} Credit Hours</p>
                  </div>
                  <div className="md:col-span-2 text-center">
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Grade</p>
                    <p className="text-3xl font-black text-[#1e3a8a]">{course.grade}</p>
                  </div>
                  <div className="md:col-span-2 text-center">
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Percentage</p>
                    <p className="text-2xl font-bold text-gray-700">{course.percentage.toFixed(1)}%</p>
                  </div>
                  <div className="md:col-span-2 text-center">
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Points</p>
                    <p className="text-2xl font-bold text-gray-700">{course.points.toFixed(2)}</p>
                  </div>
                  <div className="md:col-span-2 flex gap-2 justify-end">
                    <button
                      onClick={() => openModal(course)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 transition-colors flex items-center gap-2"
                    >
                      <Settings2 className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assessment Breakdown Modal */}
      {isModalOpen && activeCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center z-10">
              <h3 className="text-2xl font-bold text-[#1e3a8a]">Assessment Breakdown</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Course Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Course Name</label>
                  <input
                    type="text"
                    value={activeCourse.courseName}
                    onChange={(e) => setActiveCourse({ ...activeCourse, courseName: e.target.value })}
                    placeholder="e.g., Calculus I"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Credit Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={activeCourse.credits}
                    onChange={(e) => setActiveCourse({ ...activeCourse, credits: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Assessment Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Component</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Weightage %</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                        Obtained Weightage %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assessmentComponents.map(({ key, label }) => (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{label}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={activeCourse.breakdown[key].total}
                            onChange={(e) => updateBreakdown(key, 'total', parseFloat(e.target.value) || 0)}
                            className="w-24 mx-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none text-center"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={activeCourse.breakdown[key].obt}
                            onChange={(e) => updateBreakdown(key, 'obt', parseFloat(e.target.value) || 0)}
                            className="w-24 mx-auto px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none text-center font-semibold text-blue-700"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-[#1e3a8a] to-blue-700 rounded-xl p-6 text-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-blue-200 text-sm font-medium mb-1">Total Percentage</p>
                    <p className="text-3xl font-black">{activeCourse.percentage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-sm font-medium mb-1">Letter Grade</p>
                    <p className="text-3xl font-black">{activeCourse.grade}</p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-sm font-medium mb-1">Grade Points</p>
                    <p className="text-3xl font-black">{activeCourse.points.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCourse}
                  disabled={saving || !activeCourse.courseName.trim()}
                  className="px-6 py-2 bg-[#1e3a8a] text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          if (user) {
            loadGrades();
          }
        }}
        title="Login Required"
        message="Please sign in to add and save your courses."
      />
    </div>
  );
}
