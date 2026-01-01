-- Create table for saved proposals
CREATE TABLE public.saved_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  contracts JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_proposals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own proposals" 
ON public.saved_proposals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own proposals" 
ON public.saved_proposals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proposals" 
ON public.saved_proposals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proposals" 
ON public.saved_proposals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_proposals_updated_at
BEFORE UPDATE ON public.saved_proposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();