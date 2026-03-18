

## SMS — Verificação de Status Yup Chat + Relatório Inteligente

### Contexto

A API Yup Chat oferece dois mecanismos para verificar status de entrega:
1. **Consulta individual**: `GET /v1/sms/messages/:id` — retorna status, error_code, error_message, carrier
2. **status_callback**: URL enviada no momento do disparo que recebe updates automáticos

O sistema atual salva `provider_message_id` no `sms_history` mas nunca consulta o status real depois. O relatório CSV mostra apenas "sent" ou "failed" sem saber se realmente foi entregue.

### Mudanças

| Componente | Ação |
|---|---|
| `supabase/functions/send-sms/index.ts` | Adicionar `status_callback` no envio Yup Chat; salvar `error_code` |
| Nova edge function `sms-status-callback` | Receber callbacks da Yup com status real (delivered/undelivered/failed) e atualizar `sms_history` |
| Nova edge function `sms-check-status` | Consultar `GET /v1/sms/messages/:id` para mensagens pendentes (auditoria/relatório) |
| Migration SQL | Adicionar colunas `error_code`, `carrier`, `delivery_status` ao `sms_history`; adicionar `undelivered` como status |
| `src/modules/sms/views/CampaignsView.tsx` | No `handleDownloadReport`, chamar `sms-check-status` antes de gerar CSV para atualizar status em tempo real |
| `src/modules/sms/views/HistoryView.tsx` | Adicionar status "Não Entregue" (undelivered) com ícone dedicado; mostrar carrier e error_code |
| `src/modules/sms/types.ts` | Adicionar `undelivered` ao tipo `SmsHistoryRecord.status` |
| `supabase/config.toml` | Registrar as novas edge functions |

### Detalhes Técnicos

**1. Migration — novas colunas no `sms_history`**

```sql
ALTER TABLE sms_history ADD COLUMN IF NOT EXISTS error_code text;
ALTER TABLE sms_history ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE sms_history ADD COLUMN IF NOT EXISTS delivery_status text; -- granular: accepted, sent, delivered, undelivered, failed
```

**2. Edge Function `sms-status-callback`**

Endpoint público (verify_jwt = false) que a Yup Chat chama automaticamente:
- Recebe `{ status, error_code, error_message, id }` no body
- Busca `sms_history` por `provider_message_id = id`
- Atualiza `status` (mapped: delivered→delivered, undelivered→failed, failed→failed, sent→sent)
- Salva `error_code`, `error_message`, `carrier`
- Se status = "delivered", seta `delivered_at = now()`

**3. Edge Function `sms-check-status`**

Chamada pelo frontend antes de gerar relatório:
- Recebe `{ campaign_id }` 
- Busca todos `sms_history` da campanha com `provider = 'yup_chat'` e `provider_message_id IS NOT NULL`
- Para cada um, faz `GET https://api.yup.chat/v1/sms/messages/:id` com Basic Auth
- Atualiza status, error_code, error_message, carrier no banco
- Retorna resumo: `{ checked: N, updated: N, delivered: N, failed: N, undelivered: N }`

**4. Envio com callback — `send-sms/index.ts`**

Na função `sendViaYupChat` e `sendBatchViaYupChat`, adicionar `status_callback` apontando para a nova edge function:

```typescript
const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-status-callback`;

body: JSON.stringify({
  messages: [{ to: formatted, body: message }],
  default: { normalize: true, status_callback: callbackUrl },
})
```

**5. Relatório inteligente — `CampaignsView.tsx`**

Ao clicar "Relatório", antes de gerar CSV:
1. Chamar `sms-check-status` com `campaign_id`
2. Mostrar toast com progresso: "Verificando status de X mensagens..."
3. Aguardar retorno
4. Gerar CSV com status atualizado incluindo novas colunas: Nome, Telefone, Status (Entregue/Enviado/Não Entregue/Falhou), Operadora, Código Erro, Mensagem Erro, Data

**6. HistoryView — novos status**

Adicionar ao mapa de status:
- `undelivered`: ícone PhoneOff, cor amber, label "Não Entregue"
- Mostrar `carrier` (operadora) como badge quando disponível
- Mostrar `error_code` quando presente

### Fluxo Completo

```
Disparo SMS
  → send-sms envia com status_callback URL
  → Yup aceita (status: accepted)
  → sms_history salva com status "sent"
  
  [Tempo real - Callback]
  → Yup envia callback para sms-status-callback
  → Edge function atualiza sms_history com delivered/undelivered/failed + error_code
  
  [Relatório - Auditoria]
  → Usuário clica "Relatório"
  → Frontend chama sms-check-status
  → Edge function consulta API Yup para cada mensagem
  → Atualiza banco com status real
  → Gera CSV com dados atualizados
```

