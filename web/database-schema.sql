-- UniEase Database Schema
-- Run this in your Supabase SQL Editor to create the required tables

-- Study Requests Table
CREATE TABLE IF NOT EXISTS study_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Connected', 'Closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student Grades Table
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  credits NUMERIC(3, 1) NOT NULL CHECK (credits > 0),
  grade TEXT NOT NULL CHECK (grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')),
  breakdown JSONB,
  percentage NUMERIC(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Faculty Table (can be populated manually or through admin)
CREATE TABLE IF NOT EXISTS faculty (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  office_hours TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Faculty Reviews Table
CREATE TABLE IF NOT EXISTS faculty_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE study_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_requests
-- Anyone can read study requests
CREATE POLICY "Anyone can view study requests" ON study_requests
  FOR SELECT USING (true);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can create study requests" ON study_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own requests
CREATE POLICY "Users can update their own study requests" ON study_requests
  FOR UPDATE USING (auth.uid() = student_id);

-- RLS Policies for student_grades
-- Users can only view their own grades
CREATE POLICY "Users can view their own grades" ON student_grades
  FOR SELECT USING (auth.uid() = student_id);

-- Users can insert their own grades
CREATE POLICY "Users can create their own grades" ON student_grades
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Users can update their own grades
CREATE POLICY "Users can update their own grades" ON student_grades
  FOR UPDATE USING (auth.uid() = student_id);

-- Users can delete their own grades
CREATE POLICY "Users can delete their own grades" ON student_grades
  FOR DELETE USING (auth.uid() = student_id);

-- RLS Policies for faculty
-- Anyone can view faculty
CREATE POLICY "Anyone can view faculty" ON faculty
  FOR SELECT USING (true);

-- RLS Policies for faculty_reviews
-- Anyone can view reviews
CREATE POLICY "Anyone can view faculty reviews" ON faculty_reviews
  FOR SELECT USING (true);

-- Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews" ON faculty_reviews
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON faculty_reviews
  FOR UPDATE USING (auth.uid() = student_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_study_requests_created_at ON study_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_requests_student_id ON study_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_student_id ON student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_faculty_reviews_faculty_id ON faculty_reviews(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_reviews_student_id ON faculty_reviews(student_id);

