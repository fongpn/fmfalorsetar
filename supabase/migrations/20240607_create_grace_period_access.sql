-- Create grace_period_access table
CREATE TABLE IF NOT EXISTS grace_period_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) NOT NULL,
  access_date timestamptz NOT NULL DEFAULT now(),
  walk_in_price numeric(10,2) NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE grace_period_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can record grace period access"
  ON grace_period_access FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read grace period access"
  ON grace_period_access FOR SELECT TO authenticated
  USING (true); 