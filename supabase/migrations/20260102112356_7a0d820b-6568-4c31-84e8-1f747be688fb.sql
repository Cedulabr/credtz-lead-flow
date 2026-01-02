-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criar o cron job para enviar alertas de reaproveitamento diariamente às 9h
SELECT cron.schedule(
  'send-reuse-alerts-daily',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://qwgsplcqyongfsqdjrme.supabase.co/functions/v1/send-reuse-alerts',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3Z3NwbGNxeW9uZ2ZzcWRqcm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjcxODMsImV4cCI6MjA1OTIwMzE4M30.mEsDs4OMA7ns6O1v-0-UHUMEYFInN7ykhe8Gs4JuR3Y"}'::jsonb,
      body := '{"source": "cron"}'::jsonb
    ) AS request_id;
  $$
);