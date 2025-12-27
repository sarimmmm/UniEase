// lib/data.ts
// Dummy data for development
import { HelpRequest, Faculty, FacultyReview } from '@/types';

export const subjects = [
  'Calculus',
  'Programming Fundamentals',
  'Applied Physics',
  'Object Oriented Programming',
  'Multivariable Calculus',
  'Digital Logic Design',
  'Expository Writings',
  'Civics and Community Engagement',
  'Data Structures',
  'Computer Networks',
  'Database Systems',
];

// REMOVED difficultyLevels array to match UI changes

export const dummyHelpRequests: HelpRequest[] = [
  {
    id: '1',
    studentId: 's1',
    studentName: 'John Doe',
    studentEmail: 'john@example.com',
    subject: 'Mathematics',
    topic: 'Integration by Parts',
    description: 'Struggling with understanding integration by parts.',
    // REMOVED difficultyLevel property to match updated interface
    createdAt: new Date('2024-01-15').toISOString(),
    status: 'Open',
  }
];

export const dummyFaculty: Faculty[] = [
  {
    id: 'f1',
    name: 'Dr. Emily Watson',
    department: 'Mathematics',
    officeHours: 'Monday, Wednesday 2:00 PM - 4:00 PM',
    email: 'emily.watson@university.edu',
    createdAt: new Date('2023-08-01').toISOString(),
    campus: 'mtn',
  },
  {
    id: 'f2',
    name: 'Prof. James Miller',
    department: 'Computer Science',
    officeHours: 'Tuesday, Thursday 10:00 AM - 12:00 PM',
    email: 'james.miller@university.edu',
    createdAt: new Date('2023-08-01').toISOString(),
    campus: 'mtn',
  },
  {
    id: 'f3',
    name: 'Dr. Lisa Anderson',
    department: 'Physics',
    officeHours: 'Monday 1:00 PM - 3:00 PM, Friday 9:00 AM - 11:00 AM',
    email: 'lisa.anderson@university.edu',
    createdAt: new Date('2023-08-01').toISOString(),
    campus: 'mtn',
  },
  {
    id: 'f4',
    name: 'Prof. David Lee',
    department: 'Chemistry',
    officeHours: 'Wednesday 3:00 PM - 5:00 PM',
    email: 'david.lee@university.edu',
    createdAt: new Date('2023-08-01').toISOString(),
    campus: 'mtn',
  },
];

export const dummyFacultyReviews: FacultyReview[] = [
  {
    id: 'r1',
    facultyId: 'f1',
    studentId: 's1',
    studentName: 'Alex Johnson',
    rating: 5,
    comment: 'Dr. Watson is an excellent teacher! She explains complex calculus concepts in a very clear and understandable way.',
    createdAt: new Date('2024-01-10').toISOString(),
  },
  {
    id: 'r2',
    facultyId: 'f1',
    studentId: 's2',
    studentName: 'Sarah Chen',
    rating: 4,
    comment: 'Very helpful during office hours. Made integration by parts much clearer for me.',
    createdAt: new Date('2024-01-12').toISOString(),
  },
  {
    id: 'r3',
    facultyId: 'f2',
    studentId: 's2',
    studentName: 'Sarah Chen',
    rating: 5,
    comment: 'Prof. Miller is amazing! His explanations of programming concepts are top-notch.',
    createdAt: new Date('2024-01-08').toISOString(),
  },
];

export const gradePoints: Record<string, number> = {
  'A+': 4.0,
  'A': 4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B': 3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C': 2.0,
  'C-': 1.7,
  'D+': 1.3,
  'D': 1.0,
  'D-': 0.7,
  'F': 0.0,
};

