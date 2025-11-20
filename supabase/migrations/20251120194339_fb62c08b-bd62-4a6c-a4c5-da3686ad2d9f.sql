-- Add audit and compliance tracking columns to compliance_checklists
ALTER TABLE public.compliance_checklists
ADD COLUMN started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN completion_duration_minutes INTEGER,
ADD COLUMN flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN flag_reason TEXT,
ADD COLUMN quality_score TEXT CHECK (quality_score IN ('pass', 'needs_improvement', 'fail')),
ADD COLUMN requires_owner_review BOOLEAN DEFAULT FALSE;

-- Create audit logs table
CREATE TABLE public.checklist_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.compliance_checklists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  changes JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.checklist_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view all audit logs"
ON public.checklist_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

-- Create temperature logs table with validation
CREATE TABLE public.temperature_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.compliance_checklists(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  temperature_f DECIMAL(5,2) NOT NULL,
  expected_min_f DECIMAL(5,2),
  expected_max_f DECIMAL(5,2),
  is_in_range BOOLEAN,
  corrective_action TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.temperature_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert temperature logs"
ON public.temperature_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = recorded_by);

CREATE POLICY "Users can view temperature logs"
ON public.temperature_logs
FOR SELECT
TO authenticated
USING (true);

-- Create checklist photo requirements table
CREATE TABLE public.checklist_photo_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  photo_requirement TEXT NOT NULL CHECK (photo_requirement IN ('optional', 'required', 'minimum')),
  minimum_photos INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(checklist_type, item_id)
);

ALTER TABLE public.checklist_photo_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view photo requirements"
ON public.checklist_photo_requirements
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Owners can manage photo requirements"
ON public.checklist_photo_requirements
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

-- Create compliance scoring view
CREATE OR REPLACE VIEW public.compliance_scores AS
SELECT 
  truck_id,
  checklist_date,
  COUNT(*) as total_checklists,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_checklists,
  COUNT(*) FILTER (WHERE flagged = TRUE) as flagged_checklists,
  COUNT(*) FILTER (WHERE quality_score = 'pass') as passed_checklists,
  COUNT(*) FILTER (WHERE quality_score = 'fail') as failed_checklists,
  ROUND(
    (COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as completion_percentage,
  CASE 
    WHEN COUNT(*) FILTER (WHERE completed_at IS NOT NULL) = COUNT(*) THEN 'green'
    WHEN COUNT(*) FILTER (WHERE flagged = TRUE OR quality_score = 'fail') > 0 THEN 'red'
    ELSE 'yellow'
  END as status_color
FROM public.compliance_checklists
GROUP BY truck_id, checklist_date;

-- Add index for performance
CREATE INDEX idx_compliance_date_truck ON public.compliance_checklists(checklist_date, truck_id);
CREATE INDEX idx_temperature_logs_checklist ON public.temperature_logs(checklist_id);
CREATE INDEX idx_audit_logs_checklist ON public.checklist_audit_logs(checklist_id);