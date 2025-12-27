'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Calculator, X, Settings2 } from 'lucide-react';
import { saveStudentGrade, fetchStudentGrades, deleteStudentGrade, updateStudentGrade } from '@/lib/database';
import { useToast } from '@/components/Toaster';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import LoginModal from '@/components/LoginModal';

// ... (getGradeFromPercentage and interfaces remain the same) ...

export default function GPACalculatorPage() {
  // ... (Existing state and logic remain the same) ...

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        
        {/* Header Section: Now stacks on mobile */}
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

        {/* GPA Display: Responsive padding and font size */}
        <div className="bg-gradient-to-r from-[#1e3a8a] to-blue-700 rounded-2xl shadow-lg p-6 sm:p-8 mb-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm font-medium mb-1">Semester GPA</p>
              <h2 className="text-4xl sm:text-5xl font-black">{calculateTotalGPA().toFixed(2)}</h2>
              <p className="text-blue-100 text-xs mt-2 opacity-80">
                {courses.filter((c) => c.courseName.trim() && c.credits > 0).length} Enrolled Courses
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
              <div
                key={course.id}
                className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 hover:shadow-md transition-all"
              >
                {/* Mobile-friendly Grid: Stacks naturally, spreads on desktop */}
                <div className="flex flex-col md:grid md:grid-cols-12 gap-4 items-center">
                  <div className="w-full md:col-span-4 text-center md:text-left">
                    <h3 className="text-lg font-bold text-gray-900">{course.courseName || 'Untitled'}</h3>
                    <p className="text-xs text-gray-500">{course.credits} Credit Hours</p>
                  </div>
                  
                  {/* Stats Group: Horizontal row on mobile for space efficiency */}
                  <div className="w-full md:col-span-6 grid grid-cols-3 gap-2">
                    <div className="text-center border-r border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Grade</p>
                      <p className="text-xl font-black text-[#1e3a8a]">{course.grade}</p>
                    </div>
                    <div className="text-center border-r border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Perc.</p>
                      <p className="text-xl font-bold text-gray-700">{course.percentage.toFixed(0)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Points</p>
                      <p className="text-xl font-bold text-gray-700">{course.points.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="w-full md:col-span-2 flex gap-2 justify-center md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                    <button onClick={() => openModal(course)} className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-semibold">
                      <Settings2 className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => handleDelete(course.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Added overflow-x-auto to the table for mobile */}
      {isModalOpen && activeCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#1e3a8a]">Assessment Setup</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Course Name</label>
                  <input type="text" value={activeCourse.courseName} onChange={(e) => setActiveCourse({ ...activeCourse, courseName: e.target.value })} className="w-full mt-1 p-3 bg-gray-50 border-none rounded-xl outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#1e3a8a]" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Credits</label>
                  <input type="number" value={activeCourse.credits} onChange={(e) => setActiveCourse({ ...activeCourse, credits: parseFloat(e.target.value) || 0 })} className="w-full mt-1 p-3 bg-gray-50 border-none rounded-xl outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-[#1e3a8a]" />
                </div>
              </div>

              {/* Responsive Table Container */}
              <div className="overflow-x-auto -mx-6 sm:mx-0">
                <table className="w-full min-w-[500px] sm:min-w-0">
                  <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-3 text-left">Component</th>
                      <th className="px-4 py-3 text-center">Total %</th>
                      <th className="px-4 py-3 text-center">Obtained %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assessmentComponents.map(({ key, label }) => (
                      <tr key={key}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{label}</td>
                        <td className="px-4 py-4"><input type="number" value={activeCourse.breakdown[key].total} onChange={(e) => updateBreakdown(key, 'total', parseFloat(e.target.value) || 0)} className="w-16 mx-auto block p-2 text-center bg-gray-50 rounded-lg text-sm" /></td>
                        <td className="px-4 py-4"><input type="number" value={activeCourse.breakdown[key].obt} onChange={(e) => updateBreakdown(key, 'obt', parseFloat(e.target.value) || 0)} className="w-16 mx-auto block p-2 text-center bg-blue-50 text-blue-700 font-bold rounded-lg text-sm" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold text-sm">Cancel</button>
              <button onClick={saveCourse} className="flex-[2] py-3 bg-[#1e3a8a] text-white rounded-xl font-bold text-sm shadow-lg">{saving ? 'Saving...' : 'Save Course'}</button>
            </div>
          </div>
        </div>
      )}
      {/* ... (LoginModal remains same) ... */}
    </div>
  );
}
