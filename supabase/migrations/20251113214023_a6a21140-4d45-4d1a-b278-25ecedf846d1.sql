-- Create televendas table
CREATE TABLE public.televendas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  cpf text NOT NULL,
  data_venda date NOT NULL,
  telefone text NOT NULL,
  banco text NOT NULL,
  parcela numeric NOT NULL,
  troco numeric,
  tipo_operacao text NOT NULL CHECK (tipo_operacao IN ('Portabilidade', 'Novo empréstimo', 'Refinanciamento', 'Cartão')),
  observacao text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.televendas ENABLE ROW LEVEL SECURITY;

-- Users can view their own televendas
CREATE POLICY "Users can view their own televendas"
ON public.televendas
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Users can create their own televendas
CREATE POLICY "Users can create their own televendas"
ON public.televendas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own televendas
CREATE POLICY "Users can update their own televendas"
ON public.televendas
FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all televendas
CREATE POLICY "Admins can view all televendas"
ON public.televendas
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all televendas
CREATE POLICY "Admins can manage all televendas"
ON public.televendas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_televendas_updated_at
BEFORE UPDATE ON public.televendas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();