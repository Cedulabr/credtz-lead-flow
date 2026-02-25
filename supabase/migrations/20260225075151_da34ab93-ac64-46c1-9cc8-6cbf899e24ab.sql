
-- Enable pg_cron and pg_net extensions (if not already)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule hourly SMS automation
SELECT cron.schedule(
  'sms-automation-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwgsplcqyongfsqdjrme.supabase.co/functions/v1/sms-automation-run',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3Z3NwbGNxeW9uZ2ZzcWRqcm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjcxODMsImV4cCI6MjA1OTIwMzE4M30.mEsDs4OMA7ns6O1v-0-UHUMEYFInN7ykhe8Gs4JuR3Y"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
