-- Migrate televendas where commercial status is em_andamento but status_bancario is incorrectly set to aguardando_digitacao
UPDATE televendas 
SET status_bancario = 'em_andamento'
WHERE status = 'em_andamento' 
  AND status_bancario = 'aguardando_digitacao';