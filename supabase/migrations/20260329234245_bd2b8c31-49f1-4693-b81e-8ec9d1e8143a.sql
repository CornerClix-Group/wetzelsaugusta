CREATE TABLE public.schedule_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  recipient_employee_id uuid REFERENCES public.clock_employees(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  sent_by uuid,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE public.schedule_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and managers can manage notifications"
  ON public.schedule_notifications
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

CREATE POLICY "Employees can view own notifications"
  ON public.schedule_notifications
  FOR SELECT
  TO authenticated
  USING (
    recipient_employee_id IN (
      SELECT id FROM public.clock_employees WHERE linked_user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update own notifications"
  ON public.schedule_notifications
  FOR UPDATE
  TO authenticated
  USING (
    recipient_employee_id IN (
      SELECT id FROM public.clock_employees WHERE linked_user_id = auth.uid()
    )
  );