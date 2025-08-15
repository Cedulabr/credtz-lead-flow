-- Fix remaining security issue: Add search_path to handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record record;
BEGIN
  -- Check if there's a valid invitation for this email
  SELECT * INTO invitation_record 
  FROM public.invitations 
  WHERE email = NEW.email 
    AND NOT is_used 
    AND expires_at > now();
  
  -- Create profile based on invitation or default to partner
  INSERT INTO public.profiles (id, role, name, email)
  VALUES (
    NEW.id,
    COALESCE(invitation_record.role, 'partner'::app_role),
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  
  -- Mark invitation as used if it exists
  IF invitation_record.id IS NOT NULL THEN
    UPDATE public.invitations 
    SET is_used = true, accepted_at = now()
    WHERE id = invitation_record.id;
  END IF;
  
  RETURN NEW;
END;
$$;