
-- Update status_bancario for existing records based on commercial status mapping
UPDATE televendas SET status_bancario = 'em_andamento' WHERE status = 'em_andamento' AND (status_bancario IS NULL OR status_bancario = 'aguardando_digitacao');
UPDATE televendas SET status_bancario = 'pendente' WHERE status IN ('proposta_pendente', 'devolvido') AND (status_bancario IS NULL OR status_bancario = 'aguardando_digitacao');
UPDATE televendas SET status_bancario = 'pago_cliente' WHERE status IN ('proposta_paga', 'pago_aguardando') AND (status_bancario IS NULL OR status_bancario = 'aguardando_digitacao');
UPDATE televendas SET status_bancario = 'cancelado_banco' WHERE status IN ('proposta_cancelada', 'cancelado_aguardando', 'exclusao_aprovada') AND (status_bancario IS NULL OR status_bancario = 'aguardando_digitacao');

-- Only keep aguardando_digitacao for solicitar_digitacao (already correct)

-- Add bloqueado and pendente as valid status_bancario values
-- Drop and recreate the constraint to include all banking statuses
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'televendas_status_bancario_check' AND table_name = 'televendas') THEN
    ALTER TABLE televendas DROP CONSTRAINT televendas_status_bancario_check;
  END IF;
END $$;

ALTER TABLE televendas ADD CONSTRAINT televendas_status_bancario_check 
  CHECK (status_bancario IS NULL OR status_bancario IN (
    'aguardando_digitacao', 'bloqueado', 'em_andamento', 'pendente', 'pago_cliente', 'cancelado_banco'
  ));
