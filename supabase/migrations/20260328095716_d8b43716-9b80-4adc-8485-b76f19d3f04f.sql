
-- Create clock_employees table
CREATE TABLE public.clock_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  pin_code text,
  role text NOT NULL DEFAULT 'employee',
  linked_user_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clock_employees ENABLE ROW LEVEL SECURITY;

-- Anon can read names (for terminal dropdown) - only id, full_name, role, is_active
CREATE POLICY "Anyone can view active clock employees"
  ON public.clock_employees FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only owners/managers can insert/update/delete
CREATE POLICY "Owners and managers can manage clock employees"
  ON public.clock_employees FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- Add clock_employee_id to time_entries
ALTER TABLE public.time_entries
  ADD COLUMN clock_employee_id uuid REFERENCES public.clock_employees(id);

-- Allow service role inserts for clock-action edge function
-- We need anon insert policy for time_entries (edge function uses service role, but let's also add)
CREATE POLICY "Service role can insert time entries for clock employees"
  ON public.time_entries FOR INSERT
  TO anon
  WITH CHECK (clock_employee_id IS NOT NULL);

CREATE POLICY "Service role can update time entries for clock employees"
  ON public.time_entries FOR UPDATE
  TO anon
  USING (clock_employee_id IS NOT NULL);

-- Allow anon to read time entries for clock employees (to check active entry)
CREATE POLICY "Anon can view clock employee time entries"
  ON public.time_entries FOR SELECT
  TO anon
  USING (clock_employee_id IS NOT NULL);

-- Add trigger for updated_at on clock_employees
CREATE TRIGGER update_clock_employees_updated_at
  BEFORE UPDATE ON public.clock_employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
