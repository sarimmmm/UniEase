-- UniEase Database Schema
-- This reflects the schema as deployed to the live Supabase project
-- (applied via the Supabase MCP; kept here for reference / disaster recovery).

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- FACULTY
-- ============================================================
CREATE TABLE IF NOT EXISTS faculty (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  office_hours TEXT NOT NULL,
  email TEXT NOT NULL,
  campus TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER faculty_set_updated_at
  BEFORE UPDATE ON faculty
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- FACULTY REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS faculty_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  faculty_name TEXT,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER faculty_reviews_set_updated_at
  BEFORE UPDATE ON faculty_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- STUDY REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS study_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Connected', 'Closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER study_requests_set_updated_at
  BEFORE UPDATE ON study_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- STUDENT GRADES
-- ============================================================
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

CREATE TRIGGER student_grades_set_updated_at
  BEFORE UPDATE ON student_grades
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_faculty_reviews_faculty_id ON faculty_reviews(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_reviews_student_id ON faculty_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_study_requests_created_at ON study_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_requests_student_id ON study_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_student_id ON student_grades(student_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;

-- faculty: public read only (managed by admin/service role)
CREATE POLICY "Anyone can view faculty" ON faculty
  FOR SELECT USING (true);

-- faculty_reviews: public read, owner-only write
CREATE POLICY "Anyone can view faculty reviews" ON faculty_reviews
  FOR SELECT USING (true);
CREATE POLICY "Users can create their own faculty reviews" ON faculty_reviews
  FOR INSERT WITH CHECK ((select auth.uid()) = student_id);
CREATE POLICY "Users can update their own faculty reviews" ON faculty_reviews
  FOR UPDATE USING ((select auth.uid()) = student_id);
CREATE POLICY "Users can delete their own faculty reviews" ON faculty_reviews
  FOR DELETE USING ((select auth.uid()) = student_id);

-- study_requests: public read, owner-only write
CREATE POLICY "Anyone can view study requests" ON study_requests
  FOR SELECT USING (true);
CREATE POLICY "Users can create their own study requests" ON study_requests
  FOR INSERT WITH CHECK ((select auth.uid()) = student_id);
CREATE POLICY "Users can update their own study requests" ON study_requests
  FOR UPDATE USING ((select auth.uid()) = student_id);
CREATE POLICY "Users can delete their own study requests" ON study_requests
  FOR DELETE USING ((select auth.uid()) = student_id);

-- student_grades: fully private to owner
CREATE POLICY "Users can view their own grades" ON student_grades
  FOR SELECT USING ((select auth.uid()) = student_id);
CREATE POLICY "Users can create their own grades" ON student_grades
  FOR INSERT WITH CHECK ((select auth.uid()) = student_id);
CREATE POLICY "Users can update their own grades" ON student_grades
  FOR UPDATE USING ((select auth.uid()) = student_id);
CREATE POLICY "Users can delete their own grades" ON student_grades
  FOR DELETE USING ((select auth.uid()) = student_id);
