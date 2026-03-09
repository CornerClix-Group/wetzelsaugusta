-- Fix: Allow authenticated users to INSERT audit logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.checklist_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix: Allow owners/managers to view all profiles (needed for dashboards)
CREATE POLICY "Owners can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

-- Add email_recipients table for timesheet reports
CREATE TABLE public.timesheet_email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  active boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.timesheet_email_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage email recipients"
ON public.timesheet_email_recipients
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
WITH CHECK (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

CREATE POLICY "Owners can view email recipients"
ON public.timesheet_email_recipients
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));