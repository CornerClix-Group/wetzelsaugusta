-- Add display_name to clock_employees
ALTER TABLE clock_employees ADD COLUMN display_name text;

-- Create employee_permissions table
CREATE TABLE employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clock_employee_id uuid REFERENCES clock_employees(id) ON DELETE CASCADE NOT NULL,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  granted_by uuid,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (clock_employee_id, permission)
);

ALTER TABLE employee_permissions ENABLE ROW LEVEL SECURITY;

-- Owners can do everything with permissions
CREATE POLICY "Owners can manage permissions"
ON employee_permissions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner'::user_role))
WITH CHECK (has_role(auth.uid(), 'owner'::user_role));

-- Authenticated can read permissions (needed for nav filtering)
CREATE POLICY "Authenticated can view permissions"
ON employee_permissions FOR SELECT TO authenticated
USING (true);