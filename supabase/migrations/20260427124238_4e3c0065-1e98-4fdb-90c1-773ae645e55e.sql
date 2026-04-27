
DO $$
DECLARE
  v_key text;
  v_existing_jobid bigint;
BEGIN
  -- Look up the service role key stored in vault by the email infra setup
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE NOTICE 'Skipping cron schedule: email_queue_service_role_key not found in vault';
    RETURN;
  END IF;

  -- Unschedule existing job if present (idempotent)
  SELECT jobid INTO v_existing_jobid FROM cron.job WHERE jobname = 'weekly-payroll-email';
  IF v_existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_jobid);
  END IF;

  PERFORM cron.schedule(
    'weekly-payroll-email',
    '0 11 * * 1',
    format($cron$
      SELECT net.http_post(
        url     := 'https://lpzsjgffmxlgkecnpifl.supabase.co/functions/v1/send-timesheet-report',
        headers := jsonb_build_object(
                     'Content-Type',  'application/json',
                     'Authorization', 'Bearer %s'
                   ),
        body    := '{}'::jsonb
      );
    $cron$, v_key)
  );
END $$;
