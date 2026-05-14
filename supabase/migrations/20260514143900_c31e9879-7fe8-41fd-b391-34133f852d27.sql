
CREATE TABLE public.digitacao_agibank_propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf text NOT NULL,
  nome_cliente text NOT NULL,
  telefone text NOT NULL,
  produto text NOT NULL CHECK (produto IN ('novo_emprestimo','refinanciamento','portabilidade')),
  banco text,
  parcela numeric NOT NULL,
  prazo int2 NOT NULL CHECK (prazo IN (84,96,108)),
  troco_calculado numeric NOT NULL,
  valor_bruto numeric NOT NULL,
  iof_estimado numeric NOT NULL,
  rg_frente_url text NOT NULL,
  rg_verso_url text NOT NULL,
  extrato_url text,
  status text NOT NULL DEFAULT 'pendente'
);

CREATE INDEX idx_digitacao_agibank_user ON public.digitacao_agibank_propostas(user_id, created_at DESC);

ALTER TABLE public.digitacao_agibank_propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digitacao agibank propostas"
ON public.digitacao_agibank_propostas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digitacao agibank propostas"
ON public.digitacao_agibank_propostas FOR INSERT
WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('digitacao-documentos', 'digitacao-documentos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own digitacao docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'digitacao-documentos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own digitacao docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'digitacao-documentos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
