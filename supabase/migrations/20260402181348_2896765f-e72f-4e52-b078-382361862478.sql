CREATE OR REPLACE FUNCTION public.has_role_safe(_user_id text, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id::uuid
      AND role::text = _role
  );
END;
$$;