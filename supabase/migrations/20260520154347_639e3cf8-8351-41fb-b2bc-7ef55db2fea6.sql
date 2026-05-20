
-- Module settings table
CREATE TABLE public.module_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_name TEXT NOT NULL UNIQUE,
  title TEXT,
  subtitle TEXT,
  description TEXT,
  buy_url TEXT,
  learn_more_url TEXT,
  access_url TEXT,
  banner_image_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.module_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read module_settings"
ON public.module_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert module_settings"
ON public.module_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role_safe(auth.uid(), 'admin'));

CREATE POLICY "Admins can update module_settings"
ON public.module_settings FOR UPDATE
TO authenticated
USING (public.has_role_safe(auth.uid(), 'admin'))
WITH CHECK (public.has_role_safe(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete module_settings"
ON public.module_settings FOR DELETE
TO authenticated
USING (public.has_role_safe(auth.uid(), 'admin'));

CREATE TRIGGER update_module_settings_updated_at
BEFORE UPDATE ON public.module_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed easyn_flow defaults
INSERT INTO public.module_settings (module_name, title, subtitle, description, buy_url, learn_more_url, access_url, is_enabled)
VALUES (
  'easyn_flow',
  'Easyn Flow',
  'Gerencie seus atendimentos com inteligência',
  'A plataforma completa para gestão de atendimentos, automações e produtividade da sua equipe. Centralize conversas, organize fluxos e acompanhe métricas em um único lugar.',
  'https://easynflow.com.br/comprar',
  'https://easynflow.com.br',
  'https://app.easynflow.com.br',
  true
);

-- Public storage bucket for module banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-banners', 'module-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read module-banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'module-banners');

CREATE POLICY "Admins upload module-banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'module-banners' AND public.has_role_safe(auth.uid(), 'admin'));

CREATE POLICY "Admins update module-banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'module-banners' AND public.has_role_safe(auth.uid(), 'admin'));

CREATE POLICY "Admins delete module-banners"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'module-banners' AND public.has_role_safe(auth.uid(), 'admin'));
