'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function saveGrades(studentId: string, courses: Array<{ courseName: string; credits: number; grade: string }>) {
  // Delete existing grades for this student
  await supabase.from('student_grades').delete().eq('student_id', studentId);

  if (courses.length === 0) {
    revalidatePath('/gpa-calculator');
    return { success: true };
  }

  // Insert new grades
  const gradesToInsert = courses
    .filter((c) => c.courseName.trim() && c.credits > 0)
    .map((course) => ({
      student_id: studentId,
      course_name: course.courseName,
      credits: course.credits,
      grade: course.grade,
    }));

  if (gradesToInsert.length > 0) {
    const { error } = await supabase.from('student_grades').insert(gradesToInsert);

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath('/gpa-calculator');
  return { success: true };
}

export async function getGrades(studentId: string) {
  const { data: grades, error } = await supabase
    .from('student_grades')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message, data: [] };
  }

  return { data: grades || [] };
}

