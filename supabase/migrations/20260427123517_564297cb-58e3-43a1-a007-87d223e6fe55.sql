
ALTER TABLE public.clock_employees
  ADD COLUMN IF NOT EXISTS hourly_rate_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_per_period_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email text;
