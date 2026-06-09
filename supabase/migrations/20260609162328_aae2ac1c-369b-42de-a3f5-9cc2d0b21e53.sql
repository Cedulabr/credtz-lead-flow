ALTER TABLE public.module_permissions ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN public.module_permissions.expires_at IS 'Data e hora em que a permissão expira. Se nulo, o acesso é permanente enquanto estiver ativo.';

-- Ensure grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_permissions TO authenticated;
GRANT ALL ON public.module_permissions TO service_role;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_module_permissions_user_expires ON public.module_permissions(user_id, expires_at);