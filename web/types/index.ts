export interface Student {
  id: string;
  name: string;
  email: string;
  university: string;
  createdAt: string; // Changed to string for consistency
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  officeHours: string;
  email: string;
  campus: string; 
  createdAt: string; // Changed to string for consistency
}

export interface FacultyReview {
  id: string;
  facultyId: string;
  studentId: string;
  studentName: string;
  rating: number; 
  comment: string;
  createdAt: string; // Changed to string for consistency
}

// THIS WAS THE MISSING EXPORT CAUSING THE ERROR
export interface HelpRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  subject: string;
  topic: string;
  description: string;
  difficultyLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  status: 'Open' | 'Connected' | 'Closed';
  createdAt: string; // Must be string to match database.ts mapping
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
  createdAt: string; // Changed to string
}
