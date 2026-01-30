-- Add payment date column to televendas table
ALTER TABLE public.televendas
ADD COLUMN IF NOT EXISTS data_pagamento DATE NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.televendas.data_pagamento IS 'Data em que o pagamento foi efetivado';