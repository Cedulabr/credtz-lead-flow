-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule priority update and notifications every 6 hours
SELECT cron.schedule(
  'update-televendas-prioridade',
  '0 */6 * * *',
  $$
  SELECT public.update_televendas_prioridade();
  SELECT public.notify_critical_televendas();
  $$
);