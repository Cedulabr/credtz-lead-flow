-- Base OFF
DROP TABLE IF EXISTS public.baseoff_bank_rates CASCADE;
DROP TABLE IF EXISTS public.baseoff_contracts CASCADE;
DROP TABLE IF EXISTS public.baseoff_clients CASCADE;
DROP TABLE IF EXISTS public.baseoff_import_batches CASCADE;
DROP TABLE IF EXISTS public.baseoff_notifications CASCADE;
DROP TABLE IF EXISTS public.baseoff_lead_tracking CASCADE;
DROP TABLE IF EXISTS public.baseoff_active_clients CASCADE;
DROP TABLE IF EXISTS public.baseoff_allowed_banks CASCADE;
DROP TABLE IF EXISTS public.baseoff CASCADE;
DROP TABLE IF EXISTS public.registrodiariobaseoff CASCADE;
DROP TABLE IF EXISTS public.baseoff_requests CASCADE;

-- Auto Lead
DROP TABLE IF EXISTS public.autolead_messages CASCADE;
DROP TABLE IF EXISTS public.autolead_jobs CASCADE;

-- Radar
DROP TABLE IF EXISTS public.radar_saved_filters CASCADE;
DROP TABLE IF EXISTS public.radar_credits_requests CASCADE;
DROP TABLE IF EXISTS public.radar_credits_usage CASCADE;
DROP TABLE IF EXISTS public.radar_credits CASCADE;

-- Áudios
DROP TABLE IF EXISTS public.audio_files CASCADE;
DROP TABLE IF EXISTS public.audio_variations CASCADE;
DROP TABLE IF EXISTS public.audio_generations CASCADE;

-- Catálogo de módulos
DELETE FROM public.modules WHERE slug IN ('baseoff', 'autolead', 'meu-numero', 'radar', 'audios');
DELETE FROM public.company_modules WHERE module_slug IN ('baseoff', 'autolead', 'meu-numero', 'radar', 'audios');
DELETE FROM public.module_permissions WHERE module_key IN ('baseoff', 'baseoff-consulta', 'autolead', 'meu-numero', 'radar', 'audios');
