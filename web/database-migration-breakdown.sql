-- Migration: Add breakdown and percentage columns to student_grades table
-- Run this in your Supabase SQL Editor if you've already created the table

-- Add breakdown JSONB column
ALTER TABLE student_grades 
ADD COLUMN IF NOT EXISTS breakdown JSONB;

-- Add percentage column
ALTER TABLE student_grades 
ADD COLUMN IF NOT EXISTS percentage NUMERIC(5, 2);

-- Add comment to explain the breakdown structure
COMMENT ON COLUMN student_grades.breakdown IS 'JSON object containing assessment breakdown: quizzes, assignments, classParticipation, sessional1, sessional2, finalExam, project, labTasks. Each has {total: number, obt: number}';

COMMENT ON COLUMN student_grades.percentage IS 'Calculated percentage from breakdown obtained values';

