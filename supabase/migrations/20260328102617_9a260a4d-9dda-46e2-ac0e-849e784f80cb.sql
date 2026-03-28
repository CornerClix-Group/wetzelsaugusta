
-- Business managers can view all time entries (for payroll)
CREATE POLICY "Business managers can view all time entries"
ON public.time_entries FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'business_manager'::user_role));

-- Business managers can view all employee onboarding
CREATE POLICY "Business managers can view all onboarding"
ON public.employee_onboarding FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'business_manager'::user_role));

-- Business managers can view all employee documents
CREATE POLICY "Business managers can view all documents"
ON public.employee_documents FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'business_manager'::user_role));

-- Business managers can view all profiles
CREATE POLICY "Business managers can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'business_manager'::user_role));

-- Business managers can view and manage timesheet email recipients
CREATE POLICY "Business managers can manage email recipients"
ON public.timesheet_email_recipients FOR ALL TO authenticated
USING (has_role(auth.uid(), 'business_manager'::user_role))
WITH CHECK (has_role(auth.uid(), 'business_manager'::user_role));
