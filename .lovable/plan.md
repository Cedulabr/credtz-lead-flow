
# Plano: Correcoes SMS - Propostas Pagas, Deduplicacao por Telefone e Historico

## Problemas Identificados

### 1. Propostas pagas continuam recebendo SMS
O trigger `sms_sync_televendas_status` atualiza o campo `status_proposta` na fila, mas NAO desativa a automacao. Quando uma portabilidade e marcada como `proposta_paga`, a fila continua ativa.

### 2. Cliente com multiplas propostas recebe SMS duplicado
Confirmado no banco: existem clientes com 2, 3 e ate 4 entradas ativas na fila com o mesmo telefone. Exemplo: telefone `7187847804` tem 4 entradas ativas. Cada uma dispara um SMS independente.

### 3. Historico de envios manuais e campanhas
O historico ja registra os envios, mas precisa de melhor visibilidade.

---

## Correcao 1: Desativar automacao quando proposta e paga

Atualizar o trigger `sms_sync_televendas_status` para que, ao detectar mudanca para `proposta_paga` ou `proposta_cancelada`, desative automaticamente a automacao:

```text
sms_sync_televendas_status():
  IF NEW.status IN ('proposta_paga', 'proposta_cancelada') THEN
    UPDATE sms_televendas_queue
    SET status_proposta = NEW.status,
        automacao_ativa = false,
        automacao_status = 'finalizado'
    WHERE televendas_id = NEW.id;
  ELSE
    UPDATE sms_televendas_queue
    SET status_proposta = NEW.status
    WHERE televendas_id = NEW.id;
  END IF;
```

Tambem executar limpeza imediata: desativar todas as entradas da fila que ja estao com status `proposta_paga` ou `proposta_cancelada`.

---

## Correcao 2: Deduplicacao por telefone na automacao

### 2.1 Edge Function `sms-automation-run`

Antes de iterar sobre a fila, agrupar por `cliente_telefone` (normalizado). Para cada telefone, enviar apenas 1 SMS e marcar todas as entradas daquele telefone como enviadas.

Logica:
1. Buscar fila ativa
2. Criar um Map de telefone -> lista de itens
3. Para cada telefone unico, enviar 1 SMS
4. Atualizar `dias_enviados` e `ultimo_envio_at` em TODAS as entradas daquele telefone

### 2.2 Limpeza de dados existentes

Marcar como finalizado entradas duplicadas que ja foram processadas, mantendo apenas 1 por telefone ativo.

---

## Correcao 3: Historico com mais detalhes

O HistoryView ja funciona corretamente. Nenhuma mudanca necessaria - os envios manuais e automaticos ja aparecem com badges "Manual" e "Auto", e campanhas com badge "Campanha".

---

## Detalhes Tecnicos

### Migracao SQL:
1. `CREATE OR REPLACE FUNCTION sms_sync_televendas_status()` - adicionar logica de desativacao para status finais
2. `UPDATE sms_televendas_queue SET automacao_ativa = false, automacao_status = 'finalizado' WHERE status_proposta IN ('proposta_paga', 'proposta_cancelada')` - limpeza imediata

### Arquivos a modificar:
1. `supabase/functions/sms-automation-run/index.ts` - deduplicacao por telefone antes de enviar
2. `src/modules/sms/views/TelevendasSmsView.tsx` - mostrar indicador visual quando ha telefones duplicados na fila

### Ordem de execucao:
1. Migracao SQL (trigger + limpeza)
2. Atualizar edge function com deduplicacao + deploy
3. Atualizar frontend para visibilidade
