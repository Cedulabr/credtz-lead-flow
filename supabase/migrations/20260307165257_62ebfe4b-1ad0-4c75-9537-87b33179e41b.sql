
-- =============================================
-- Radar de Oportunidades — Tables + RLS
-- =============================================

-- 1. Radar Credits (per-user balance)
CREATE TABLE public.radar_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  credits_balance integer NOT NULL DEFAULT 200,
  monthly_limit integer NOT NULL DEFAULT 200,
  credits_used_month integer NOT NULL DEFAULT 0,
  current_month text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.radar_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own radar credits"
  ON public.radar_credits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_global_admin(auth.uid()));

CREATE POLICY "Admins can manage radar credits"
  ON public.radar_credits FOR ALL TO authenticated
  USING (public.is_global_admin(auth.uid()))
  WITH CHECK (public.is_global_admin(auth.uid()));

CREATE POLICY "Users can update own radar credits"
  ON public.radar_credits FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Radar Credits Usage (consumption log)
CREATE TABLE public.radar_credits_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL DEFAULT 'search',
  credits_used integer NOT NULL DEFAULT 1,
  filter_used jsonb,
  results_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.radar_credits_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own radar usage"
  ON public.radar_credits_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_global_admin(auth.uid()));

CREATE POLICY "Users can insert own radar usage"
  ON public.radar_credits_usage FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. Radar Credits Requests (recharge requests)
CREATE TABLE public.radar_credits_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_id uuid REFERENCES auth.users(id),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.radar_credits_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own radar requests"
  ON public.radar_credits_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_global_admin(auth.uid()));

CREATE POLICY "Users can create radar recharge requests"
  ON public.radar_credits_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage radar requests"
  ON public.radar_credits_requests FOR UPDATE TO authenticated
  USING (public.is_global_admin(auth.uid()))
  WITH CHECK (public.is_global_admin(auth.uid()));

-- 4. Radar Saved Filters
CREATE TABLE public.radar_saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.radar_saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own radar filters"
  ON public.radar_saved_filters FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Add can_access_radar permission to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_access_radar boolean DEFAULT false;
