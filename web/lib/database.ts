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
        createdAt: request.created_at, // FIXED: Removed 'new Date()' to keep it as a string
        status: request.status,
      })) || []
    );
  } catch (error) {
    console.error('Error fetching study requests:', error);
    return [];
  }
}
  } catch (error) {
    console.error('Error fetching study requests:', error);
    return [];
  }
}
