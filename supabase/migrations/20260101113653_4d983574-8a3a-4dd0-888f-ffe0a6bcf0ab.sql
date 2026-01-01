-- Create financial_transactions table
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  type TEXT NOT NULL DEFAULT 'despesa',
  responsible_id UUID,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_day INTEGER,
  parent_transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  is_recurring_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_receipts table
CREATE TABLE public.payment_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  payment_date DATE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_financial_transactions_company ON public.financial_transactions(company_id);
CREATE INDEX idx_financial_transactions_status ON public.financial_transactions(status);
CREATE INDEX idx_financial_transactions_due_date ON public.financial_transactions(due_date);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX idx_payment_receipts_transaction ON public.payment_receipts(transaction_id);

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for financial_transactions
CREATE POLICY "Admins can manage all financial transactions"
ON public.financial_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestors can manage financial transactions in their company"
ON public.financial_transactions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.company_role = 'gestor'
    AND uc.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.company_role = 'gestor'
    AND uc.is_active = true
  )
);

CREATE POLICY "Colaboradores can view financial transactions in their company"
ON public.financial_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.is_active = true
  )
);

-- RLS Policies for payment_receipts
CREATE POLICY "Admins can manage all payment receipts"
ON public.payment_receipts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestors can manage payment receipts in their company"
ON public.payment_receipts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = payment_receipts.company_id
    AND uc.user_id = auth.uid()
    AND uc.company_role = 'gestor'
    AND uc.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = payment_receipts.company_id
    AND uc.user_id = auth.uid()
    AND uc.company_role = 'gestor'
    AND uc.is_active = true
  )
);

CREATE POLICY "Colaboradores can view payment receipts in their company"
ON public.payment_receipts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = payment_receipts.company_id
    AND uc.user_id = auth.uid()
    AND uc.is_active = true
  )
);

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('financial-receipts', 'financial-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts
CREATE POLICY "Users can view receipts from their company"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'financial-receipts' 
  AND EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.is_active = true
    AND (storage.foldername(name))[1] = uc.company_id::text
  )
);

CREATE POLICY "Gestors can upload receipts to their company"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'financial-receipts'
  AND EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.company_role = 'gestor'
    AND uc.is_active = true
    AND (storage.foldername(name))[1] = uc.company_id::text
  )
);

CREATE POLICY "Gestors can delete receipts from their company"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'financial-receipts'
  AND EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.company_role = 'gestor'
    AND uc.is_active = true
    AND (storage.foldername(name))[1] = uc.company_id::text
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();