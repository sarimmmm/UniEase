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
      // REMOVED difficulty_level mapping to match updated interface
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
  // REMOVED difficultyLevel from input parameters
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
        // Removed difficulty_level from the insert payload
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
