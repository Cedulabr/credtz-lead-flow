-- Activate Yup Chat and deactivate Twilio
UPDATE public.sms_providers SET is_active = false, updated_at = now() WHERE name = 'twilio';
UPDATE public.sms_providers SET is_active = true, updated_at = now() WHERE name = 'yup_chat';