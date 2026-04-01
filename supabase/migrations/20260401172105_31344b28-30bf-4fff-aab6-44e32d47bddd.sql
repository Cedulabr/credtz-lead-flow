CREATE TABLE public.pipeline_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL DEFAULT 'leads_premium',
  column_key text NOT NULL,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'Circle',
  color_from text DEFAULT 'from-gray-500',
  color_to text DEFAULT 'to-gray-600',
  text_color text DEFAULT 'text-gray-700',
  bg_color text DEFAULT 'bg-gray-50',
  border_color text DEFAULT 'border-gray-200',
  dot_color text DEFAULT 'bg-gray-500',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, column_key)
);

ALTER TABLE public.pipeline_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read pipeline_columns"
  ON public.pipeline_columns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage pipeline_columns"
  ON public.pipeline_columns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));