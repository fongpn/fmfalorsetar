/*
  # Add Logo URL Setting

  1. New Setting
    - Add gym_logo_url setting to system_settings table
    - This will store the URL or base64 data for the gym logo
    - Used on login page and potentially other places in the app

  2. Purpose
    - Allow gym to customize their branding
    - Replace default dumbbell icon with custom logo
    - Improve brand identity throughout the application
*/

-- Insert gym_logo_url setting if it doesn't exist
INSERT INTO system_settings (key, value, description) VALUES
  ('gym_logo_url', '', 'URL or base64 data for the gym logo')
ON CONFLICT (key) DO NOTHING;