-- audio_generations: historico de audios gerados
CREATE TABLE public.audio_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid,
  campaign_id text,
  text_original text NOT NULL,
  text_converted text,
  voice_id text NOT NULL,
  voice_name text,
  audio_url text,
  file_path text,
  duration_seconds numeric,
  characters_count integer DEFAULT 0,
  credits_used numeric DEFAULT 0,
  settings_json jsonb DEFAULT '{}',
  ab_test_group text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.audio_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid REFERENCES public.audio_generations(id) ON DELETE CASCADE,
  variation_index integer DEFAULT 0,
  text_content text NOT NULL,
  audio_url text,
  file_path text,
  selected boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.voicer_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  amount numeric NOT NULL,
  description text,
  generation_id uuid REFERENCES public.audio_generations(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.voicer_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  generation_a_id uuid REFERENCES public.audio_generations(id),
  generation_b_id uuid REFERENCES public.audio_generations(id),
  winner_id uuid REFERENCES public.audio_generations(id),
  campaign_id text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audio_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voicer_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voicer_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own generations" ON public.audio_generations
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own variations" ON public.audio_variations
  FOR ALL TO authenticated USING (
    generation_id IN (SELECT id FROM public.audio_generations WHERE user_id = auth.uid())
  ) WITH CHECK (
    generation_id IN (SELECT id FROM public.audio_generations WHERE user_id = auth.uid())
  );
CREATE POLICY "Users manage own voicer credits" ON public.voicer_credit_transactions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own ab tests" ON public.voicer_ab_tests
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public) VALUES ('voicer-audios', 'voicer-audios', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload voicer audios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voicer-audios');

CREATE POLICY "Anyone can read voicer audios"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'voicer-audios');

CREATE POLICY "Users can delete own voicer audios"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'voicer-audios' AND (storage.foldername(name))[1] = auth.uid()::text);