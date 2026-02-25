
# Plano: Automacao SMS Televendas - Sistema Completo

## Resumo

Criar um sistema completo de automacao SMS integrado ao Televendas, com envio automatico por dias consecutivos, notificacao de propostas pagas, confirmacao real de status via Twilio, historico completo e controle total pelo admin/gestor.

---

## Fase 1: Correcoes Criticas no Sistema Atual

### 1.1 Corrigir Edge Function `send-sms`

O edge function atual insere colunas inexistentes na tabela `sms_history`:
- Usa `contact_id` (nao existe) -- deve usar `contact_name`
- Usa `message_content` (nao existe) -- deve usar `message`
- Nao envia `sent_by` (NOT NULL) -- deve enviar o `user.id`

Isso faz com que TODOS os inserts de historico falhem silenciosamente e o status fique travado em "enviando".

**Correcao**: Atualizar o edge function para usar as colunas corretas e garantir que o status final da campanha seja sempre atualizado (completed/failed), nunca ficando em "sending".

### 1.2 Atualizar campo `sent_at` da campanha

O edge function tenta gravar `sent_at` na tabela `sms_campaigns`, mas essa coluna nao existe. Deve usar `completed_at`.

---

## Fase 2: Migracao de Banco de Dados

### 2.1 Nova tabela `sms_televendas_queue`

Tabela central que vincula clientes do televendas ao sistema de SMS automatico:

```text
sms_televendas_queue
+----------------------------+
| id (uuid PK)               |
| televendas_id (uuid FK)    |
| cliente_nome (text)        |
| cliente_telefone (text)    |
| tipo_operacao (text)       |
| status_proposta (text)     |
| data_cadastro (timestamptz)|
| automacao_status (text)    |
|   -> ativo/pausado/finalizado
| automacao_ativa (boolean)  |
| dias_envio_total (int)     |
| dias_enviados (int)        |
| ultimo_envio_at (timestamptz)|
| company_id (uuid)          |
| user_id (uuid)             |
| created_at (timestamptz)   |
| updated_at (timestamptz)   |
+----------------------------+
```

### 2.2 Nova tabela `sms_automation_settings`

Configuracoes editaveis pelo admin:

```text
sms_automation_settings
+----------------------------+
| id (uuid PK)               |
| setting_key (text UNIQUE)  |
| setting_value (text)       |
| description (text)         |
| updated_by (uuid)          |
| updated_at (timestamptz)   |
+----------------------------+
```

Settings iniciais:
- `automacao_em_andamento_ativa` = true
- `automacao_em_andamento_dias` = 5
- `automacao_em_andamento_intervalo_horas` = 24
- `automacao_pago_ativa` = true
- `msg_em_andamento` = "Ola {{nome}}, sua proposta de {{tipo_operacao}} da Credtz esta em andamento..."
- `msg_pago_novo_emprestimo` = "Ola {{nome}}, seu emprestimo foi aprovado e pago com sucesso..."

### 2.3 Adicionar colunas na `sms_history`

- `televendas_id` (uuid, nullable) -- vincular ao registro de televendas
- `send_type` (text, default 'manual') -- 'manual' ou 'automatico'

### 2.4 Trigger no Televendas

Criar trigger `after insert` na tabela `televendas` que automaticamente insere um registro na `sms_televendas_queue`.

Criar trigger `after update` que detecta mudanca de status para `proposta_paga` + tipo_operacao = 'Novo emprestimo' e dispara SMS automatico.

### 2.5 RLS Policies

- Admin: acesso total
- Gestor: acesso aos registros da mesma company
- Colaborador: acesso apenas aos proprios registros

---

## Fase 3: Edge Functions

### 3.1 Atualizar `send-sms`

- Corrigir mapeamento de colunas (`message`, `contact_name`, `sent_by`)
- Usar `completed_at` em vez de `sent_at`
- Garantir tratamento de erro que nunca deixa status em "sending"
- Aceitar envio individual (sem campaign, direto por telefone+mensagem) para automacoes

### 3.2 Nova Edge Function `sms-automation-run`

Funcao agendavel (via cron ou chamada manual) que:
1. Busca registros em `sms_televendas_queue` com `automacao_ativa = true` e `dias_enviados < dias_envio_total`
2. Verifica intervalo desde ultimo envio
3. Envia SMS via Twilio usando template configurado
4. Atualiza `dias_enviados` e `ultimo_envio_at`
5. Quando `dias_enviados >= dias_envio_total`, marca `automacao_status = 'finalizado'`

### 3.3 Nova Edge Function `sms-send-single`

Para envios individuais (notificacao de proposta paga, reenvio manual):
- Recebe: phone, message, televendas_id (opcional), send_type
- Envia via Twilio
- Registra em sms_history com status correto baseado na resposta da API

---

## Fase 4: Interface do Usuario

### 4.1 Nova aba "Notificacao SMS Televendas"

Nova view `TelevendasSmsView.tsx` com:
- Tabela de clientes do televendas com colunas: cliente, telefone, proposta, tipo operacao, status automacao, status envio, data ultimo envio
- Filtros por status de automacao (ativo/pausado/finalizado)
- Botao para pausar/reativar automacao individual
- Botao para reenviar manualmente
- Botao para enviar SMS avulso

### 4.2 Nova aba "Automacao"

Nova view `AutomationView.tsx` com:
- Painel de configuracoes editaveis (admin/gestor):
  - Toggle ativar/desativar automacao em andamento
  - Campo para quantidade de dias
  - Campo para intervalo entre envios (horas)
  - Toggle ativar/desativar notificacao de pago
- Editor de mensagens com preview de variaveis
- Botao para executar automacao manualmente (admin)
- Dashboard de metricas: total enviados hoje, erros, taxa de entrega

### 4.3 Atualizar tabs do SmsModule

Expandir de 4 para 6 abas (ou usar sub-navegacao):

```text
| Televendas SMS | Automacao | Disparos | Templates | Historico | Contatos |
```

### 4.4 Melhorar HistoryView

- Adicionar coluna "Proposta vinculada" (link para televendas_id)
- Adicionar coluna "Tipo" (manual/automatico)
- Adicionar filtros por tipo e status

---

## Fase 5: Integracao Automatica com Televendas

### 5.1 Trigger de insercao automatica

Quando novo registro e criado no televendas:
- Trigger SQL insere automaticamente na `sms_televendas_queue`
- Status de automacao inicia como "ativo"
- dias_envio_total puxado da configuracao global

### 5.2 Trigger de proposta paga

Quando status muda para `proposta_paga` e tipo_operacao = 'Novo emprestimo':
- Trigger chama edge function `sms-send-single` via pg_net
- Mensagem usa template configurado em `sms_automation_settings`

### 5.3 Sincronizacao de status

Manter `sms_televendas_queue.status_proposta` sincronizado com `televendas.status` via trigger de update.

---

## Detalhes Tecnicos

### Arquivos a criar:
1. `supabase/migrations/xxx_sms_automation.sql` -- tabelas, triggers, RLS
2. `supabase/functions/sms-automation-run/index.ts` -- automacao agendada
3. `supabase/functions/sms-send-single/index.ts` -- envio individual
4. `src/modules/sms/views/TelevendasSmsView.tsx` -- aba Televendas SMS
5. `src/modules/sms/views/AutomationView.tsx` -- aba Automacao
6. `src/modules/sms/hooks/useSmsAutomation.ts` -- hook de dados

### Arquivos a modificar:
1. `supabase/functions/send-sms/index.ts` -- corrigir colunas e status
2. `src/modules/sms/SmsModule.tsx` -- adicionar novas abas
3. `src/modules/sms/types.ts` -- novos tipos
4. `src/modules/sms/hooks/useSmsData.ts` -- buscar novos dados
5. `src/modules/sms/views/HistoryView.tsx` -- colunas extras

### Ordem de execucao:
1. Migracao de banco (tabelas + triggers + RLS)
2. Corrigir edge function `send-sms`
3. Criar edge functions novas
4. Implementar views e hooks do frontend
5. Atualizar SmsModule com novas abas
6. Testar fluxo completo
