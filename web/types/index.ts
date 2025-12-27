export interface Student {
  id: string;
  name: string;
  email: string;
  university: string;
  createdAt: string; 
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  officeHours: string;
  email: string;
  campus: string; 
  createdAt: string; 
}

export interface FacultyReview {
  id: string;
  facultyId: string;
  studentId: string;
  studentName: string;
  rating: number; 
  comment: string;
  createdAt: string; 
}

export interface HelpRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  subject: string;
  topic: string;
  description: string;
  // difficultyLevel has been removed to simplify the UI
  status: 'Open' | 'Connected' | 'Closed';
  createdAt: string; 
}

export interface Course {
  id: string;
  courseName: string;
  credits: number;
  grade: string;
}

export interface ConnectionRequest {
  id: string;
  helpRequestId: string;
  requesterId: string;
  requesteeId: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string; 
}
