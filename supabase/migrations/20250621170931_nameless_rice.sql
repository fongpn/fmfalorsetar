/*
  # Add IC/Passport Number Field to Members Table

  1. Schema Changes
    - Add `ic_passport_number` column to `members` table
    - This allows storing government ID information for better member identification

  2. Purpose
    - Improve member identification and verification
    - Support legal compliance requirements
    - Enhance member record-keeping
*/

-- Add ic_passport_number column to members table if it doesn't exist
ALTER TABLE members ADD COLUMN IF NOT EXISTS ic_passport_number text;

-- Add comment for documentation
COMMENT ON COLUMN members.ic_passport_number IS 'Government ID number (IC or passport) for member identification';