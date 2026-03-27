

## Fix Historico WhatsApp + Editar/Reenviar Agendamentos Falhos

### Problemas Identificados

1. **Historico incompleto**: A tabela `whatsapp_messages` nao tem coluna `source_module` — impossivel saber de qual modulo veio a mensagem. O `send-whatsapp` edge function nao recebe nem salva `instance_id` ou `source_module`. O `autolead-worker` insere em `whatsapp_messages` mas tambem sem `source_module`.

2. **Agendamentos falhos sem acao**: Tab "Agendamentos" so tem botao Cancelar para pendentes. Mensagens com status `failed` nao tem opcao de editar numero ou reenviar/reagendar.

3. **Historico nao mostra WhatsApp usado**: A query de historico faz `select("*")` mas nao traz o join com `whatsapp_instances` para mostrar qual instancia/numero foi usado.

### Solucao

#### 1. Migration: adicionar `source_module` a `whatsapp_messages`

```sql
ALTER TABLE public.whatsapp_messages 
  ADD COLUMN IF NOT EXISTS source_module text;
```

#### 2. Edge Function `send-whatsapp` — receber e salvar `instanceId` e `sourceModule`

- Aceitar `instanceId` e `sourceModule` no body
- No insert em `whatsapp_messages`, incluir `instance_id: instanceId`, `source_module: sourceModule`

#### 3. Hook `useWhatsApp.ts` — passar `instanceId` e `sourceModule` para edge function

- `sendTextMessage` e `sendMediaMessage`: adicionar param `sourceModule` e enviar no body junto com `instanceId: targetId`

#### 4. `autolead-worker` — incluir `source_module: 'autolead'` e `instance_id`

No insert em `whatsapp_messages` (linha 172), adicionar:
```
source_module: 'autolead',
instance_id: msg.whatsapp_instance_id,
```

#### 5. `WhatsAppConfig.tsx` — Historico completo

**Historico (fetchMessages)**:
- Mudar query para `select("*, whatsapp_instances(instance_name, phone_number)")` 
- Adicionar coluna "WhatsApp Usado" na tabela (instance_name + phone)
- Adicionar coluna "Modulo" mostrando source_module traduzido (autolead → AutoLead, leads_premium → Leads Premium, etc.)
- Aumentar limit de 100 para 200

**Agendamentos (tab scheduled)**:
- Para mensagens com status `failed`: mostrar `error_message` e botoes "Editar Numero" + "Enviar Agora" + "Reagendar"
- Dialog de edicao: campo para editar telefone, opcao de enviar imediatamente ou escolher nova data/hora
- Ao "Enviar Agora": chamar `send-whatsapp` edge function diretamente e atualizar status
- Ao "Reagendar": update `scheduled_at` e resetar status para `pending`

### Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | Adicionar coluna `source_module` |
| `supabase/functions/send-whatsapp/index.ts` | Receber/salvar `instanceId` e `sourceModule` |
| `supabase/functions/autolead-worker/index.ts` | Incluir `source_module` e `instance_id` no log |
| `src/hooks/useWhatsApp.ts` | Passar `instanceId` e `sourceModule` no body |
| `src/components/WhatsAppConfig.tsx` | Historico com join + colunas extras; agendamentos falhos editaveis |

