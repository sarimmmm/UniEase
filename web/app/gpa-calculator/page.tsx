'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Calculator, X, Settings2 } from 'lucide-react';
import { saveStudentGrade, fetchStudentGrades, deleteStudentGrade, updateStudentGrade } from '@/lib/database';
import { useToast } from '@/components/Toaster';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import LoginModal from '@/components/LoginModal';

// --- HELPERS & TYPES ---
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
  quizzes: { total: 0, obt: 0 },
  assignments: { total: 0, obt: 0 },
  classParticipation: { total: 0, obt: 0 },
  sessional1: { total: 0, obt: 0 },
  sessional2: { total: 0, obt: 0 },
  finalExam: { total: 0, obt: 0 },
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
    if (user) loadGrades();
    else setLoading(false);
  }, [user]);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const data = await fetchStudentGrades(user?.id || '');
      setCourses(data || []);
    } catch (error) {
      showToast('Failed to load grades', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- MISSING FUNCTIONS RESTORED HERE ---
  
  const openModal = (course?: Course) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (course) {
      setActiveCourse({ ...course });
    } else {
      setActiveCourse({
        id: `new-${Date.now()}`,
        courseName: '',
        credits: 3,
        grade: 'F',
        points: 0,
        percentage: 0,
        breakdown: { ...defaultBreakdown },
      });
    }
    setIsModalOpen(true);
  };

  const updateBreakdown = (component: keyof AssessmentBreakdown, field: 'total' | 'obt', value: number) => {
    if (!activeCourse) return;
    const newBreakdown = {
      ...activeCourse.breakdown,
      [component]: { ...activeCourse.breakdown[component], [field]: value },
    };
    
    const totalObtained = Object.values(newBreakdown).reduce((acc, curr) => acc + curr.obt, 0);
    const totalPossible = Object.values(newBreakdown).reduce((acc, curr) => acc + curr.total, 0);
    const percentage = totalPossible === 0 ? 0 : (totalObtained / totalPossible) * 100;
    const { grade, points } = getGradeFromPercentage(percentage);

    setActiveCourse({ ...activeCourse, breakdown: newBreakdown, percentage, grade, points });
  };

  const saveCourse = async () => {
    if (!activeCourse || !user || !activeCourse.courseName.trim()) {
      showToast('Enter a valid course name', 'error');
      return;
    }
    setSaving(true);
    const result = activeCourse.id.startsWith('new-') 
      ? await saveStudentGrade(user.id, activeCourse)
      : await updateStudentGrade(user.id, activeCourse.id, activeCourse);
    
    if (result.success) {
      showToast('Saved!', 'success');
      await loadGrades();
      setIsModalOpen(false);
    } else {
      showToast(result.error || 'Save failed', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Delete this course?')) return;
    const result = await deleteStudentGrade(user.id, id);
    if (result.success) {
      showToast('Deleted', 'success');
      await loadGrades();
    }
  };

  const calculateTotalGPA = () => {
    let totalPoints = 0, totalCredits = 0;
    courses.forEach(c => {
      totalPoints += (c.points * c.credits);
      totalCredits += c.credits;
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
    <div className="min-h-screen bg-gray-50 pb-10">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1e3a8a] mb-1">GPA Calculator</h1>
            <p className="text-sm text-gray-600">Track performance with assessment breakdowns</p>
          </div>
          <button
            onClick={() => openModal()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1e3a8a] text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" /> Add Course
          </button>
        </div>

        {/* GPA Display */}
        <div className="bg-gradient-to-r from-[#1e3a8a] to-blue-700 rounded-2xl shadow-lg p-6 sm:p-8 mb-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm font-medium mb-1">Semester GPA</p>
              <h2 className="text-4xl sm:text-5xl font-black">{calculateTotalGPA().toFixed(2)}</h2>
              <p className="text-blue-100 text-xs mt-2 opacity-80">
                {courses.length} Enrolled Courses
              </p>
            </div>
            <Calculator className="w-12 h-12 sm:w-16 sm:h-16 text-blue-200 opacity-50" />
          </div>
        </div>

        {/* Courses List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-dashed border-gray-300">
            <p className="text-gray-500">No courses added yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                <div className="flex flex-col md:grid md:grid-cols-12 gap-4 items-center">
                  <div className="w-full md:col-span-4 text-center md:text-left">
                    <h3 className="text-lg font-bold text-gray-900">{course.courseName}</h3>
                    <p className="text-xs text-gray-500">{course.credits} Credits</p>
                  </div>
                  <div className="w-full md:col-span-6 grid grid-cols-3 gap-2">
                    <div className="text-center"><p className="text-[10px] uppercase font-bold text-gray-400">Grade</p><p className="text-xl font-black text-[#1e3a8a]">{course.grade}</p></div>
                    <div className="text-center"><p className="text-[10px] uppercase font-bold text-gray-400">Perc.</p><p className="text-xl font-bold text-gray-700">{course.percentage.toFixed(0)}%</p></div>
                    <div className="text-center"><p className="text-[10px] uppercase font-bold text-gray-400">Points</p><p className="text-xl font-bold text-gray-700">{course.points.toFixed(2)}</p></div>
                  </div>
                  <div className="w-full md:col-span-2 flex gap-2 justify-center md:justify-end">
                    <button onClick={() => openModal(course)} className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-semibold text-gray-600"><Settings2 className="w-4 h-4"/></button>
                    <button onClick={() => handleDelete(course.id)} className="p-2 text-red-500"><Trash2 className="w-5 h-5"/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Overlay */}
      {isModalOpen && activeCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#1e3a8a]">Assessment Setup</h3>
              <button onClick={() => setIsModalOpen(false)}><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold uppercase text-gray-400">Course Name</label>
                  <input type="text" value={activeCourse.courseName} onChange={(e) => setActiveCourse({...activeCourse, courseName: e.target.value})} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold uppercase text-gray-400">Credits</label>
                  <input type="number" value={activeCourse.credits} onChange={(e) => setActiveCourse({...activeCourse, credits: parseFloat(e.target.value) || 0})} className="w-full mt-1 p-3 bg-gray-50 border rounded-xl" />
                </div>
              </div>
              <div className="overflow-x-auto -mx-6 sm:mx-0">
                <table className="w-full min-w-[450px]">
                  <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                    <tr><th className="px-6 py-3 text-left">Component</th><th className="px-4 py-3 text-center">Total %</th><th className="px-4 py-3 text-center">Obtained %</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {assessmentComponents.map(({ key, label }) => (
                      <tr key={key}>
                        <td className="px-6 py-4 text-sm font-medium">{label}</td>
                        <td><input type="number" value={activeCourse.breakdown[key].total} onChange={(e) => updateBreakdown(key, 'total', parseFloat(e.target.value) || 0)} className="w-16 mx-auto block p-2 text-center bg-gray-50 rounded-lg text-sm" /></td>
                        <td><input type="number" value={activeCourse.breakdown[key].obt} onChange={(e) => updateBreakdown(key, 'obt', parseFloat(e.target.value) || 0)} className="w-16 mx-auto block p-2 text-center bg-blue-50 text-blue-700 font-bold rounded-lg text-sm" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold">Cancel</button>
              <button onClick={saveCourse} className="flex-[2] py-3 bg-[#1e3a8a] text-white rounded-xl font-bold">{saving ? 'Saving...' : 'Save Course'}</button>
            </div>
          </div>
        </div>
      )}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} title="Login Required" />
    </div>
  );
}
