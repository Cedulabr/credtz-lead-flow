

## Plano: Multi-Instancia WhatsApp + Agendamento de Mensagens

### Visao Geral

Evoluir o sistema WhatsApp para suportar multiplas instancias por usuario (vendedor com varios numeros), seletor de instancia no envio, e agendamento de mensagens nos modulos Activate Leads, Leads Premium e Meus Clientes.

---

### Parte 1: Banco de Dados

**1A. Nova tabela `whatsapp_scheduled_messages`**

```text
Colunas:
- id (uuid, PK)
- user_id (uuid, FK profiles, NOT NULL)
- instance_id (uuid, FK whatsapp_instances, NOT NULL)
- phone (text, NOT NULL)
- message (text)
- client_name (text)
- media_base64 (text) -- para PDFs/arquivos
- media_name (text)
- scheduled_at (timestamptz, NOT NULL) -- quando enviar
- status (text, default 'pending') -- pending, sent, failed, cancelled
- sent_at (timestamptz)
- error_message (text)
- source_module (text) -- 'activate_leads', 'leads_premium', 'meus_clientes'
- source_record_id (text) -- ID do lead/cliente de origem
- created_at (timestamptz, default now())
```

Indexes: `user_id`, `status`, `scheduled_at`, `instance_id`

RLS: Usuario ve/edita seus proprios agendamentos. Admin ve todos.

**1B. Adicionar coluna `phone_number` na tabela `whatsapp_instances`**

Campo para identificar visualmente qual numero esta vinculado a cada instancia (ex: "85 99999-9999").

---

### Parte 2: Edge Function - Processador de Agendamentos

**Nova edge function: `process-whatsapp-schedule`**

- Executada via cron job a cada 5 minutos
- Busca mensagens com `status = 'pending'` e `scheduled_at <= now()`
- Para cada mensagem: busca o token da instancia, envia via Ticketz API, atualiza status
- Registra na `whatsapp_messages` apos envio

**Cron job SQL:**
```text
cron.schedule('process-whatsapp-schedule', '*/5 * * * *', ...)
```

---

### Parte 3: Hook useWhatsApp - Suporte Multi-Instancia

Refatorar `src/hooks/useWhatsApp.ts`:

- Retornar array `instances` com todas as instancias do usuario (proprias + empresa)
- Cada instancia: `{ id, name, phoneNumber, hasToken }`
- Funcoes `sendTextMessage` e `sendMediaMessage` passam a receber `instanceId` como parametro
- Nova funcao `scheduleMessage(instanceId, phone, message, scheduledAt, sourceModule, sourceRecordId)`
- Manter compatibilidade: se nao passar instanceId, usa a primeira instancia disponivel

---

### Parte 4: WhatsAppConfig - Gerenciamento Multi-Instancia

Refatorar `src/components/WhatsAppConfig.tsx`:

- Listar todas as instancias do usuario em cards
- Botao "Nova Instancia" para adicionar mais conexoes
- Cada card mostra: nome, numero de telefone, status da conexao, botao testar, botao editar/excluir
- Campo novo: "Numero do WhatsApp" (para identificacao visual)
- Historico de mensagens filtrado por instancia
- Nova aba: "Agendamentos" mostrando mensagens programadas com opcao de cancelar

---

### Parte 5: WhatsAppSendDialog - Seletor de Instancia + Agendamento

Refatorar `src/components/WhatsAppSendDialog.tsx`:

- Adicionar Select para escolher a instancia (quando usuario tem mais de uma)
- Mostrar nome + numero da instancia no select
- Adicionar toggle "Agendar envio" com date/time picker
- Quando agendado: chama `scheduleMessage` em vez de enviar imediatamente
- Renomear titulo do dialog para "API WhatsApp"
- Manter fallback wa.me quando nenhuma instancia configurada

---

### Parte 6: Integracao nos Modulos

**6A. Activate Leads (`ActivateLeads.tsx`)**
- Renomear botao de "WhatsApp" para "API WhatsApp"
- Manter a mesma logica: abre WhatsAppSendDialog com dados pre-preenchidos
- O dialog agora tera seletor de instancia e opcao de agendamento

**6B. Leads Premium (`LeadDetailDrawer.tsx`)**
- Renomear botao de "WhatsApp" para "API WhatsApp"
- Manter abertura do WhatsAppSendDialog (ja implementado)

**6C. Meus Clientes (`MyClientsKanban.tsx`)**
- Renomear botao de "WhatsApp" para "API WhatsApp"
- Manter abertura do WhatsAppSendDialog (ja implementado)

---

### Arquivos a Criar

| Arquivo | Descricao |
|---|---|
| Migracao SQL | Tabela `whatsapp_scheduled_messages` + coluna `phone_number` em instances |
| `supabase/functions/process-whatsapp-schedule/index.ts` | Processador cron de mensagens agendadas |

### Arquivos a Modificar

| Arquivo | Alteracao |
|---|---|
| `src/hooks/useWhatsApp.ts` | Retornar array de instancias, aceitar instanceId, adicionar scheduleMessage |
| `src/components/WhatsAppSendDialog.tsx` | Seletor de instancia, toggle agendamento, date/time picker |
| `src/components/WhatsAppConfig.tsx` | Listagem multi-instancia, CRUD completo, aba agendamentos |
| `src/components/ActivateLeads.tsx` | Renomear botao para "API WhatsApp" |
| `src/modules/leads-premium/components/LeadDetailDrawer.tsx` | Renomear botao para "API WhatsApp" |
| `src/components/MyClientsKanban.tsx` | Renomear botao para "API WhatsApp" |
| `supabase/functions/send-whatsapp/index.ts` | Aceitar instanceId para buscar token automaticamente |
| `supabase/config.toml` | Registrar nova edge function |

### Fluxo do Usuario

1. Acessa modulo "WhatsApp" e cadastra multiplas instancias (uma por numero)
2. Nos modulos de leads/clientes, clica "API WhatsApp" no lead desejado
3. Dialog abre com seletor de instancia (se tiver mais de uma)
4. Escreve a mensagem, pode agendar para data/hora futura
5. Envia imediatamente ou agenda
6. Mensagens agendadas sao processadas automaticamente pelo cron a cada 5 minutos
7. Historico completo visivel no modulo WhatsApp

