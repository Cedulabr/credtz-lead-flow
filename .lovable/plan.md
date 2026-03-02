

## Correcao: Migracao Automatica de "Aguardando Retorno" para SMS Remarketing

### Problema Identificado

A coluna usada para o status do cliente em "Meus Clientes" (tabela `propostas`) e `client_status`, **nao** `status`. Tanto o trigger do banco quanto o codigo de sincronizacao estao consultando a coluna errada (`status`), que esta sempre NULL para esses registros.

**Evidencia:**
- `client_status` tem 58 registros com "aguardando_retorno" e 257 com "contato_futuro"
- `status` tem 0 registros com qualquer valor

### Correcoes Necessarias

#### 1. Atualizar trigger `sms_remarketing_enqueue_propostas` (Migracao SQL)

O trigger precisa:
- Disparar em mudancas de `client_status` (em vez de `status`)
- Usar `NEW.client_status` em toda a logica interna
- Manter a mesma logica de enfileirar para `aguardando_retorno` e `contato_futuro`, e finalizar para qualquer outro status

```text
Trigger: trg_sms_remarketing_propostas
ANTES: AFTER INSERT OR UPDATE OF status, pipeline_stage, future_contact_date
DEPOIS: AFTER INSERT OR UPDATE OF client_status, pipeline_stage, future_contact_date

Logica interna: trocar todas as referencias de NEW.status / OLD.status para NEW.client_status / OLD.client_status
```

#### 2. Corrigir sincronizacao em `RemarketingSmsView.tsx`

Na secao "Sync Propostas (Meus Clientes)", trocar:
```text
ANTES: .in("status", ["contato_futuro", "aguardando_retorno"])
DEPOIS: .in("client_status", ["contato_futuro", "aguardando_retorno"])

ANTES: if (p.status === "contato_futuro" ...)
DEPOIS: if (p.client_status === "contato_futuro" ...)

ANTES: if (p.status === "aguardando_retorno")
DEPOIS: if (p.client_status === "aguardando_retorno")

ANTES: status_original: p.status
DEPOIS: status_original: p.client_status
```

### Arquivos a Modificar

| Arquivo | Alteracao |
|---|---|
| Nova migracao SQL | Recriar trigger `sms_remarketing_enqueue_propostas` usando `client_status` e atualizar o evento do trigger |
| `src/modules/sms/views/RemarketingSmsView.tsx` | Trocar `status` por `client_status` na query e logica de sync de Meus Clientes |

### Resultado Esperado

- Os 58 clientes com "Aguardando Retorno" serao sincronizados automaticamente para o modulo Remarketing SMS ao clicar "Sincronizar"
- O trigger passara a detectar mudancas reais de `client_status`, enfileirando automaticamente novos clientes
- Quando o cliente mudar de "Aguardando Retorno" ou "Contato Futuro" para qualquer outro status, ele sera finalizado automaticamente na fila SMS

