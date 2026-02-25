
-- Insert schedule settings for automation
INSERT INTO public.sms_automation_settings (setting_key, setting_value, description)
VALUES 
  ('automacao_horario_inicio', '08', 'Hora de início dos envios automáticos (0-23, fuso Brasília)'),
  ('automacao_horario_fim', '20', 'Hora de fim dos envios automáticos (0-23, fuso Brasília)')
ON CONFLICT (setting_key) DO NOTHING;
