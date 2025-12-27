import { supabase } from './supabase';
import { HelpRequest, Faculty, FacultyReview } from '@/types';

/**
 * HELPER: handleAuthError
 * Detects 401 (Unauthorized) errors and redirects to login.
 */
async function handleAuthError(error: any) {
  if (error?.message?.includes('401') || error?.status === 401) {
    console.warn("Session expired. Redirecting...");
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      window.location.href = '/login?reason=expired';
    }
    return true;
  }
  return false;
}

// --- 1. FACULTY DIRECTORY & REVIEWS ---

export async function fetchFaculty(): Promise<Faculty[]> {
  try {
    const { data, error } = await supabase.from('faculty').select('*').order('name');
    if (error) { await handleAuthError(error); throw error; }
    return data.map((f) => ({ ...f, officeHours: f.office_hours }));
  } catch (error) { return []; }
}

export async function fetchFacultyReviews(): Promise<FacultyReview[]> {
  try {
    const { data, error } = await supabase.from('faculty_reviews').select('*').order('created_at', { ascending: false });
    if (error) { await handleAuthError(error); throw error; }
    return data.map((r) => ({
      id: r.id, facultyId: r.faculty_id, studentId: r.student_id,
      studentName: r.student_name, rating: r.rating, comment: r.comment, createdAt: r.created_at
    }));
  } catch (error) { return []; }
}

export async function addFacultyReview(review: {
  facultyId: string;
  facultyName: string;
  studentId: string;
  studentName: string;
  rating: number;
  comment: string;
  isAnonymous?: boolean; // Toggle flag
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('faculty_reviews').insert([
      {
        faculty_id: review.facultyId,
        faculty_name: review.facultyName,
        student_id: review.studentId,
        // Mask the name if anonymous is selected
        student_name: review.isAnonymous ? "Anonymous Student" : review.studentName,
        rating: review.rating,
        comment: review.comment,
      },
    ]);

    if (error) {
      await handleAuthError(error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- 2. STUDY REQUESTS ---

export async function fetchStudyRequests(): Promise<HelpRequest[]> {
  try {
    const { data, error } = await supabase.from('study_requests').select('*').order('created_at', { ascending: false });
    if (error) { await handleAuthError(error); throw error; }
    return data?.map((r) => ({
      id: r.id, studentId: r.student_id, studentName: r.student_name,
      studentEmail: r.student_email, subject: r.subject, topic: r.topic,
      description: r.description, difficultyLevel: r.difficulty_level,
      createdAt: r.created_at, status: r.status,
    })) || [];
  } catch (error) { return []; }
}

// --- 3. STUDENT GRADES ---

export async function fetchStudentGrades(studentId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('student_grades').select('*').eq('user_id', studentId);
    if (error) { await handleAuthError(error); throw error; }
    return data || [];
  } catch (error) { return []; }
}
