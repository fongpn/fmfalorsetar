/*
  # Add Shift Handover Features

  1. Schema Changes
    - Add `next_shift_id` column to link shifts together
    - Add `handover_notes` column for staff communication
    - Add foreign key constraint for shift linking

  2. Purpose
    - Track shift transitions and handovers
    - Enable communication between shift staff
    - Maintain audit trail of shift changes
*/

-- Add handover columns to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS next_shift_id uuid REFERENCES shifts(id);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS handover_notes text;

-- Add index for performance on next_shift_id lookups
CREATE INDEX IF NOT EXISTS idx_shifts_next_shift ON shifts(next_shift_id);

-- Add comment for documentation
COMMENT ON COLUMN shifts.next_shift_id IS 'Links to the shift that followed this one';
COMMENT ON COLUMN shifts.handover_notes IS 'Notes left by ending staff for the next shift';