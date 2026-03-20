CREATE OR REPLACE FUNCTION public.get_profiles_by_ids(user_ids uuid[])
RETURNS TABLE(id uuid, name text, email text, level text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT p.id, p.name, p.email, p.level
  FROM public.profiles p
  WHERE p.id = ANY(user_ids);
$$;