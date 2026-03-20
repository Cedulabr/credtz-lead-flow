CREATE OR REPLACE FUNCTION public.sync_permission_columns(column_names text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  col text;
  added text[] := '{}';
BEGIN
  IF NOT public.is_global_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  FOREACH col IN ARRAY column_names LOOP
    IF col NOT LIKE 'can_access_%' THEN
      CONTINUE;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = col
    ) THEN
      EXECUTE format('ALTER TABLE public.profiles ADD COLUMN %I boolean DEFAULT true', col);
      added := array_append(added, col);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object('added', added, 'total_checked', array_length(column_names, 1));
END;
$$;