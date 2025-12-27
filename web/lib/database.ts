import { supabase } from './supabase';
import { HelpRequest, Faculty, FacultyReview } from '@/types';

// --- FACULTY DIRECTORY & REVIEWS ---

export async function fetchFaculty(): Promise<Faculty[]> {
  try {
    const { data, error } = await supabase
      .from('faculty')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return data.map((f) => ({
      id: f.id,
      name: f.name,
      department: f.department,
      officeHours: f.office_hours,
      email: f.email,
      campus: f.campus,
      createdAt: f.created_at,
    }));
  } catch (error) {
    console.error('Error fetching faculty:', error);
    return [];
  }
}

export async function fetchFacultyReviews(): Promise<FacultyReview[]> {
  try {
    const { data, error } = await supabase
      .from('faculty_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((r) => ({
      id: r.id,
      facultyId: r.faculty_id,
      studentId: r.student_id,
      studentName: r.student_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    }));
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

/**
 * NEW: addFacultyReview
 * This function saves the review to Supabase and requires the user to be logged in.
 */
export async function addFacultyReview(review: {
  facultyId: string;
  studentId: string;
  studentName: string;
  rating: number;
  comment: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('faculty_reviews').insert([
      {
        faculty_id: review.facultyId,
        student_id: review.studentId, // Matches RLS policy
        student_name: review.studentName,
        rating: review.rating,
        comment: review.comment,
      },
    ]);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- STUDY REQUESTS, GRADES, ETC (REMAINDERS KEPT AS IS) ---
// ... [Remaining fetchStudyRequests, createStudyRequest, fetchStudentGrades, etc. go here]
