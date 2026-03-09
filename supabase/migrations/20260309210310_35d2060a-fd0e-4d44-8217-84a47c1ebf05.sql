CREATE OR REPLACE FUNCTION public.set_employee_pin(_target_user_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _pin IS NOT NULL AND (length(_pin) != 4 OR _pin !~ '^\d{4}$') THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;
  UPDATE public.profiles SET pin_code = _pin WHERE id = _target_user_id;
END;
$$;