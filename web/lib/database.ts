import { supabase } from './supabase';
import { HelpRequest, Faculty, FacultyReview } from '@/types';

/**
 * HELPER: handleAuthError
 * This function checks for 401 errors and redirects users if their session expires.
 */
async function handleAuthError(error: any) {
  if (error?.message?.includes('401') || error?.status === 401) {
    console.warn("Session expired. Redirecting to login...");
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
    const { data, error } = await supabase
      .from('faculty')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      await handleAuthError(error);
      throw error;
    }

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

    if (error) {
      await handleAuthError(error);
      throw error;
    }

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

export async function addFacultyReview(review: {
  facultyId: string;
  facultyName: string;
  studentId: string;
  studentName: string;
  rating: number;
  comment: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('faculty_reviews').insert([
      {
        faculty_id: review.facultyId,
        faculty_name: review.facultyName,
        student_id: review.studentId,
        student_name: review.studentName,
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
    const { data, error } = await supabase
      .from('study_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      await handleAuthError(error);
      throw error;
    }

    return data?.map((request) => ({
      id: request.id,
      studentId: request.student_id,
      studentName: request.student_name,
      studentEmail: request.student_email,
      subject: request.subject,
      topic: request.topic,
      description: request.description,
      difficultyLevel: request.difficulty_level,
      createdAt: request.created_at,
      status: request.status,
    })) || [];
  } catch (error) {
    console.error('Error fetching study requests:', error);
    return [];
  }
}

export async function createStudyRequest(request: {
  studentId: string;
  studentName: string;
  studentEmail: string;
  subject: string;
  topic: string;
  description: string;
  difficultyLevel: 'Beginner' | 'Intermediate' | 'Advanced';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('study_requests').insert([
      {
        student_id: request.studentId,
        student_name: request.studentName,
        student_email: request.studentEmail,
        subject: request.subject,
        topic: request.topic,
        description: request.description,
        difficulty_level: request.difficultyLevel,
        status: 'Open',
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

// --- 3. STUDENT GRADES (GPA CALCULATOR) ---

export async function fetchStudentGrades(studentId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('student_grades')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      await handleAuthError(error);
      throw error;
    }

    const gradePoints: Record<string, number> = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.67, 'B+': 3.33, 'B': 3.0,
      'B-': 2.67, 'C+': 2.33, 'C': 2.0, 'C-': 1.67, 'D+': 1.33,
      'D': 1.0, 'D-': 0.7, 'F': 0.0,
    };

    return data?.map((grade) => ({
      id: grade.id,
      courseName: grade.course_name,
      credits: grade.credits,
      grade: grade.grade,
      breakdown: grade.breakdown,
      percentage: grade.percentage || 0,
      points: gradePoints[grade.grade] || 0,
    })) || [];
  } catch (error) {
    console.error('Error fetching student grades:', error);
    return [];
  }
}

export async function saveStudentGrade(
  studentId: string, 
  course: { courseName: string; credits: number; grade: string; breakdown?: any; percentage?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('student_grades').insert([
      {
        user_id: studentId,
        course_name: course.courseName,
        credits: course.credits,
        grade: course.grade,
        breakdown: course.breakdown || null,
        percentage: course.percentage !== undefined ? course.percentage : null,
      }
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

export async function updateStudentGrade(
  studentId: string,
  gradeId: string,
  course: { courseName: string; credits: number; grade: string; breakdown?: any; percentage?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('student_grades')
      .update({
        course_name: course.courseName,
        credits: course.credits,
        grade: course.grade,
        breakdown: course.breakdown || null,
        percentage: course.percentage !== undefined ? course.percentage : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gradeId)
      .eq('user_id', studentId);

    if (error) {
      await handleAuthError(error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteStudentGrade(
  studentId: string,
  gradeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('student_grades')
      .delete()
      .eq('id', gradeId)
      .eq('user_id', studentId);

    if (error) {
      await handleAuthError(error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
