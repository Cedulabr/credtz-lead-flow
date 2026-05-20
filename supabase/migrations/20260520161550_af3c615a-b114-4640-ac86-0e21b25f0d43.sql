
-- 1. menu_categories
CREATE TABLE public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  icon text DEFAULT 'Folder',
  position integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read categories"
  ON public.menu_categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage categories insert"
  ON public.menu_categories FOR INSERT
  TO authenticated WITH CHECK (public.has_role_safe(auth.uid(), 'admin'));

CREATE POLICY "Admins manage categories update"
  ON public.menu_categories FOR UPDATE
  TO authenticated USING (public.has_role_safe(auth.uid(), 'admin'));

CREATE POLICY "Admins manage categories delete"
  ON public.menu_categories FOR DELETE
  TO authenticated USING (public.has_role_safe(auth.uid(), 'admin') AND is_system = false);

CREATE TRIGGER trg_menu_categories_updated
  BEFORE UPDATE ON public.menu_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. module_permissions
CREATE TABLE public.module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  category_key text NOT NULL,
  display_name text,
  icon text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_key)
);

CREATE INDEX idx_module_permissions_user ON public.module_permissions(user_id);
CREATE INDEX idx_module_permissions_category ON public.module_permissions(category_key);

ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own module permissions"
  ON public.module_permissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role_safe(auth.uid(), 'admin'));

CREATE POLICY "Admins insert module permissions"
  ON public.module_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role_safe(auth.uid(), 'admin'));

CREATE POLICY "Admins update module permissions"
  ON public.module_permissions FOR UPDATE
  TO authenticated
  USING (public.has_role_safe(auth.uid(), 'admin'));

CREATE POLICY "Admins delete module permissions"
  ON public.module_permissions FOR DELETE
  TO authenticated
  USING (public.has_role_safe(auth.uid(), 'admin'));

CREATE TRIGGER trg_module_permissions_updated
  BEFORE UPDATE ON public.module_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. admin_audit_log
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  module_key text,
  target_user_id uuid,
  changed_by uuid NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role_safe(auth.uid(), 'admin'));

-- 4. Seed categories
INSERT INTO public.menu_categories (key, label, icon, position, is_system) VALUES
  ('gestao_whatsapp', 'Gestão Whatsapp', 'MessageCircle', 10, true),
  ('captacao', 'Captação', 'Target', 20, true),
  ('televendas', 'Televendas', 'Headphones', 30, true),
  ('financeiro', 'Financeiro', 'Wallet', 40, true),
  ('gestao', 'Gestão', 'Briefcase', 50, true)
ON CONFLICT (key) DO NOTHING;

-- 5. RPC: log admin action
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text,
  _module_key text,
  _target_user_id uuid,
  _payload jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT public.has_role_safe(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.admin_audit_log (action, module_key, target_user_id, changed_by, payload)
  VALUES (_action, _module_key, _target_user_id, auth.uid(), _payload)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
