import { supabase } from './supabase';
import { HelpRequest } from '@/types';

// --- STUDY REQUESTS ---

export async function fetchStudyRequests(): Promise<HelpRequest[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('study_requests')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching study requests:', error);
      return [];
    }

    return (
      data?.map((request) => ({
        id: request.id,
        studentId: request.student_id,
        studentName: request.student_name,
        studentEmail: request.student_email,
        subject: request.subject,
        topic: request.topic,
        description: request.description,
        difficultyLevel: request.difficulty_level,
        createdAt: request.created_at, // Keep as string to match Interface
        status: request.status,
      })) || []
    );
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

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- STUDENT GRADES ---

export async function fetchStudentGrades(studentId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('student_grades')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching student grades:', JSON.stringify(error, null, 2));
      return [];
    }

    const gradePoints: Record<string, number> = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.67, 'B+': 3.33, 'B': 3.0,
      'B-': 2.67, 'C+': 2.33, 'C': 2.0, 'C-': 1.67, 'D+': 1.33,
      'D': 1.0, 'D-': 0.7, 'F': 0.0,
    };

    return (
      data?.map((grade) => ({
        id: grade.id,
        courseName: grade.course_name,
        credits: grade.credits,
        grade: grade.grade,
        breakdown: grade.breakdown,
        percentage: grade.percentage || 0,
        points: gradePoints[grade.grade] || 0,
      })) || []
    );
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

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message };
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

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message };
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

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
