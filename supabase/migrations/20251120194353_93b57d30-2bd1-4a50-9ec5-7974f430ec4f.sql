-- Drop and recreate the view without security definer
DROP VIEW IF EXISTS public.compliance_scores;

CREATE VIEW public.compliance_scores AS
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