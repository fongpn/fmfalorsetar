/*
  # Add Staff Selection for Handover

  1. Schema Changes
    - Add `handover_to_staff_id` column to shifts table
    - Add foreign key constraint to profiles table
    - Add index for performance

  2. Purpose
    - Allow staff to select who they are handing over to
    - Track handover assignments for accountability
    - Improve shift transition management
*/

-- Add handover_to_staff_id column to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS handover_to_staff_id uuid REFERENCES profiles(id);

-- Add index for performance on handover_to_staff_id lookups
CREATE INDEX IF NOT EXISTS idx_shifts_handover_to_staff ON shifts(handover_to_staff_id);

-- Add comment for documentation
COMMENT ON COLUMN shifts.handover_to_staff_id IS 'Staff member designated to receive the handover';