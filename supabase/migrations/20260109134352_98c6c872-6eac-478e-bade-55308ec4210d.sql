
-- Enum para tipos de ponto
CREATE TYPE public.time_clock_type AS ENUM ('entrada', 'pausa_inicio', 'pausa_fim', 'saida');

-- Enum para status do ponto
CREATE TYPE public.time_clock_status AS ENUM ('completo', 'incompleto', 'ajustado', 'pendente');

-- Tabela principal de controle de ponto
CREATE TABLE public.time_clock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  clock_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_type time_clock_type NOT NULL,
  clock_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city TEXT,
  state TEXT,
  photo_url TEXT,
  user_agent TEXT,
  device_info JSONB,
  status time_clock_status NOT NULL DEFAULT 'pendente',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de logs de ajustes
CREATE TABLE public.time_clock_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  time_clock_id UUID NOT NULL REFERENCES public.time_clock(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configurações de ponto
CREATE TABLE public.time_clock_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  default_entry_time TIME DEFAULT '08:00:00',
  default_exit_time TIME DEFAULT '18:00:00',
  tolerance_minutes INTEGER DEFAULT 10,
  require_photo BOOLEAN DEFAULT true,
  require_location BOOLEAN DEFAULT true,
  allow_manual_adjustment BOOLEAN DEFAULT true,
  block_duplicate_clock BOOLEAN DEFAULT true,
  retention_years INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Tabela de consentimento LGPD
CREATE TABLE public.time_clock_consent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_time_clock_user_date ON public.time_clock(user_id, clock_date);
CREATE INDEX idx_time_clock_company_date ON public.time_clock(company_id, clock_date);
CREATE INDEX idx_time_clock_date ON public.time_clock(clock_date);
CREATE INDEX idx_time_clock_logs_clock_id ON public.time_clock_logs(time_clock_id);

-- Enable RLS
ALTER TABLE public.time_clock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_consent ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para time_clock (usando has_role e is_company_gestor existentes)
CREATE POLICY "Users can view own time clock"
ON public.time_clock FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time clock"
ON public.time_clock FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all time clock"
ON public.time_clock FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestors can view company time clock"
ON public.time_clock FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid() 
    AND uc.company_id = time_clock.company_id
    AND uc.company_role = 'gestor' 
    AND uc.is_active = true
  )
);

CREATE POLICY "Admins can update all time clock"
ON public.time_clock FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestors can update company time clock"
ON public.time_clock FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid() 
    AND uc.company_id = time_clock.company_id
    AND uc.company_role = 'gestor' 
    AND uc.is_active = true
  )
);

-- Políticas RLS para time_clock_logs
CREATE POLICY "Users can view logs of own time clock"
ON public.time_clock_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.time_clock tc
    WHERE tc.id = time_clock_id AND tc.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all logs"
ON public.time_clock_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert logs"
ON public.time_clock_logs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = performed_by);

-- Políticas RLS para time_clock_settings
CREATE POLICY "Admins can manage settings"
ON public.time_clock_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated can view settings"
ON public.time_clock_settings FOR SELECT
TO authenticated
USING (true);

-- Políticas RLS para time_clock_consent
CREATE POLICY "Users can manage own consent"
ON public.time_clock_consent FOR ALL
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_time_clock_updated_at
BEFORE UPDATE ON public.time_clock
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_clock_settings_updated_at
BEFORE UPDATE ON public.time_clock_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket para fotos de ponto
INSERT INTO storage.buckets (id, name, public) VALUES ('time-clock-photos', 'time-clock-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Users can upload time clock photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'time-clock-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own time clock photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'time-clock-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all time clock photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'time-clock-photos' AND public.has_role(auth.uid(), 'admin'::app_role)
);
