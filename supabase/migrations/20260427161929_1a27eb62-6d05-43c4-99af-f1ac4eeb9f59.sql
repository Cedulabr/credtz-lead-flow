-- Remove previous schedule if it exists, then create fresh schedule
DO $$
BEGIN
  PERFORM cron.unschedule('novavida-token-refresh-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'novavida-token-refresh-daily',
  '0 6 * * *', -- 03:00 BRT = 06:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://qwgsplcqyongfsqdjrme.supabase.co/functions/v1/novavida-refresh-tokens',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3Z3NwbGNxeW9uZ2ZzcWRqcm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjcxODMsImV4cCI6MjA1OTIwMzE4M30.mEsDs4OMA7ns6O1v-0-UHUMEYFInN7ykhe8Gs4JuR3Y"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);