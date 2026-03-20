-- Fix DELETE policy to allow company members to delete
DROP POLICY IF EXISTS "Users delete own audios" ON public.audio_files;
CREATE POLICY "Users delete own or company audios" ON public.audio_files
  FOR DELETE TO authenticated USING (
    user_id = auth.uid()
    OR public.is_global_admin(auth.uid())
    OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  );

-- Backfill existing audio_files with correct company_id
UPDATE public.audio_files af
SET company_id = (
  SELECT uc.company_id 
  FROM public.user_companies uc 
  WHERE uc.user_id = af.user_id AND uc.is_active = true 
  ORDER BY uc.created_at ASC 
  LIMIT 1
)
WHERE af.company_id IS NULL;