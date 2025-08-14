-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a new policy using the has_role function to avoid recursion
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also ensure admins can manage (insert/update/delete) profiles for user creation
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));