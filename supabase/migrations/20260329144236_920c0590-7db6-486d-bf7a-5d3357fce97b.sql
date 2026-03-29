
ALTER TABLE employee_onboarding 
ADD COLUMN clock_employee_id uuid REFERENCES clock_employees(id) ON DELETE SET NULL;

CREATE POLICY "Owners can insert onboarding for employees"
ON employee_onboarding FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

CREATE POLICY "Owners can update onboarding for employees"
ON employee_onboarding FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));
