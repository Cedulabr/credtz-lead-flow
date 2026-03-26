
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule autolead-worker to run every minute
SELECT cron.schedule(
  'autolead-worker-cron',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://qwgsplcqyongfsqdjrme.supabase.co/functions/v1/autolead-worker',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3Z3NwbGNxeW9uZ2ZzcWRqcm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjcxODMsImV4cCI6MjA1OTIwMzE4M30.mEsDs4OMA7ns6O1v-0-UHUMEYFInN7ykhe8Gs4JuR3Y"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
