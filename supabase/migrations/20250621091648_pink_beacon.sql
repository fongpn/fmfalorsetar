/*
  # Update Members Table Schema

  1. Schema Changes
    - Replace `email` column with `ic_passport_number`
    - Remove unique constraint on email
    - Add unique constraint on ic_passport_number (optional)

  2. Data Migration
    - Safely handle existing data
    - Update any references to email field
*/

-- Add new ic_passport_number column
ALTER TABLE members ADD COLUMN IF NOT EXISTS ic_passport_number text;

-- Remove unique constraint on email if it exists
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_email_key;

-- Add unique constraint on ic_passport_number (optional - can be removed if duplicates are allowed)
-- ALTER TABLE members ADD CONSTRAINT members_ic_passport_unique UNIQUE (ic_passport_number);

-- Update any existing email data to ic_passport_number if needed
-- UPDATE members SET ic_passport_number = email WHERE ic_passport_number IS NULL AND email IS NOT NULL;

-- Drop email column (uncomment when ready to remove email completely)
-- ALTER TABLE members DROP COLUMN IF EXISTS email;