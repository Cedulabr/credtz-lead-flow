-- Fix RLS policies for televendas - the parameters for is_company_gestor are inverted

-- Drop and recreate UPDATE policy with correct parameter order
DROP POLICY IF EXISTS "Users can update televendas (owner or gestor)" ON public.televendas;

CREATE POLICY "Users can update televendas (owner or gestor)" 
ON public.televendas 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  is_company_gestor(auth.uid(), company_id)
);

-- Drop and recreate DELETE policy with correct parameter order
DROP POLICY IF EXISTS "Users can delete televendas (owner or gestor)" ON public.televendas;

CREATE POLICY "Users can delete televendas (owner or gestor)" 
ON public.televendas 
FOR DELETE 
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  is_company_gestor(auth.uid(), company_id)
);