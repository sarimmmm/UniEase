export interface Student {
  id: string;
  name: string;
  email: string;
  university: string;
  createdAt: Date;
}














export interface Faculty {
  id: string;
  name: string;
  department: string;
  officeHours: string;
  email: string;
  campus: string; // ADD THIS LINE
  createdAt: Date;
}

export interface FacultyReview {
  id: string;
  facultyId: string;
  studentId: string;
  studentName: string;
  rating: number; 
  comment: string;
  createdAt: Date;
}













export interface HelpRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  subject: string;
  topic: string;
  description: string;
  difficultyLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  createdAt: Date;
  status: 'Open' | 'Connected' | 'Closed';
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  officeHours: string;
  email: string;
  createdAt: Date;
}

export interface FacultyReview {
  id: string;
  facultyId: string;
  studentId: string;
  studentName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Date;
}

export interface Course {
  id: string;
  courseName: string;
  credits: number;
  grade: string; // Letter grade: A, B, C, D, F
}

export interface ConnectionRequest {
  id: string;
  helpRequestId: string;
  requesterId: string;
  requesteeId: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: Date;
}




