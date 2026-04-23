CREATE TABLE public.televendas_observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  televendas_id uuid NOT NULL REFERENCES public.televendas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  observacao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_televendas_observacoes_tv_created ON public.televendas_observacoes(televendas_id, created_at DESC);

ALTER TABLE public.televendas_observacoes ENABLE ROW LEVEL SECURITY;

-- SELECT: dono da televenda, gestor da empresa, ou admin
CREATE POLICY "View observacoes for accessible televendas"
ON public.televendas_observacoes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.televendas tv
    WHERE tv.id = televendas_observacoes.televendas_id
      AND (
        tv.user_id = auth.uid()
        OR public.has_role_safe(auth.uid()::text, 'admin')
        OR public.has_role_safe(auth.uid()::text, 'gestor')
      )
  )
);

-- INSERT: usuário autenticado com acesso à televenda
CREATE POLICY "Insert observacoes for accessible televendas"
ON public.televendas_observacoes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.televendas tv
    WHERE tv.id = televendas_observacoes.televendas_id
      AND (
        tv.user_id = auth.uid()
        OR public.has_role_safe(auth.uid()::text, 'admin')
        OR public.has_role_safe(auth.uid()::text, 'gestor')
      )
  )
);

-- UPDATE: autor ou admin
CREATE POLICY "Update own observacoes or admin"
ON public.televendas_observacoes
FOR UPDATE
USING (auth.uid() = user_id OR public.has_role_safe(auth.uid()::text, 'admin'));

-- DELETE: autor ou admin
CREATE POLICY "Delete own observacoes or admin"
ON public.televendas_observacoes
FOR DELETE
USING (auth.uid() = user_id OR public.has_role_safe(auth.uid()::text, 'admin'));