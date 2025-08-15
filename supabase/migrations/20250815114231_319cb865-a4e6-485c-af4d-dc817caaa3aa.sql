-- Adicionar novos status na tabela commissions
UPDATE commissions SET status = 'preview' WHERE status = 'approved';
UPDATE commissions SET status = 'pending' WHERE status = 'pending';
UPDATE commissions SET status = 'paid' WHERE status = 'paid';

-- Criar um índice para melhorar performance nas consultas por usuário e status
CREATE INDEX IF NOT EXISTS idx_commissions_user_status ON commissions (user_id, status);

-- Criar um índice para consultas por data de pagamento
CREATE INDEX IF NOT EXISTS idx_commissions_payment_date ON commissions (payment_date) WHERE payment_date IS NOT NULL;