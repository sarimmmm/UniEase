'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createStudyRequest(data: {
  studentId: string;
  studentName: string;
  studentEmail: string;
  subject: string;
  topic: string;
  description: string;
  difficultyLevel: string;
}) {
  const { data: request, error } = await supabase
    .from('study_requests')
    .insert([
      {
        student_id: data.studentId,
        student_name: data.studentName,
        student_email: data.studentEmail,
        subject: data.subject,
        topic: data.topic,
        description: data.description,
        difficulty_level: data.difficultyLevel,
        status: 'open',
      },
    ])
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/study-buddy');
  return { data: request };
}

export async function getStudyRequests() {
  // Get requests from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: requests, error } = await supabase
    .from('study_requests')
    .select('*')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message, data: [] };
  }

  return { data: requests || [] };
}

