/*
  # Add Student Walk-in Rate Setting

  1. New Setting
    - Add student walk-in rate setting to system_settings table
    - Set default value of 8.00 RM for student walk-ins

  2. Purpose
    - Allow configurable pricing for student walk-ins
    - Provide discounted rate for students
*/

-- Insert student walk-in rate setting
INSERT INTO system_settings (key, value, description) VALUES
  ('walk_in_student_rate', '8.00', 'Daily rate for student walk-in gym access (discounted rate)')
ON CONFLICT (key) DO NOTHING;