INSERT INTO public.module_permissions (user_id, module_key, is_active, category_key, display_name, icon, position)
SELECT p.id, 'leads-agibank', true, 'captacao', 'Leads Agibank', 'TrendingUp', 0
FROM public.profiles p
ON CONFLICT (user_id, module_key) DO UPDATE
SET is_active = true,
    category_key = EXCLUDED.category_key;