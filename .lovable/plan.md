

## Notificacao SMS Automatica apos Criacao de Proposta

### Resumo

Quando o usuario criar uma proposta no Gerador de Propostas, aparecera um dialog perguntando se deseja notificar o cliente via SMS. Se sim, o sistema agenda o envio para 2 horas depois. A mensagem padrao inclui o nome do consultor e da empresa. Gestores e admins podem ativar/desativar e editar a mensagem no painel Comunicacao SMS (aba Automacao).

---

### 1. Banco de Dados (2 migracoes)

**Novas configuracoes em `sms_automation_settings`:**
- `proposta_sms_ativa` = `true` (toggle ativar/desativar)
- `msg_proposta_criada` = `INSS Informa: Confira a proposta que o consultor {{consultor}} Correspondente da {{empresa}}, tem uma proposta especial para voce, confira a proposta no seu whatsapp`

**Nova tabela `sms_proposal_notifications`:**

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | Identificador |
| televendas_id | uuid | Referencia a proposta |
| cliente_nome | text | Nome do cliente |
| cliente_telefone | text | Telefone do cliente |
| consultor_nome | text | Nome do consultor que criou |
| empresa_nome | text | Nome da empresa |
| scheduled_at | timestamptz | Horario programado (created_at + 2h) |
| sent | boolean default false | Se ja foi enviado |
| sent_at | timestamptz | Quando foi enviado |
| company_id | uuid | Empresa |
| user_id | uuid | Quem criou |
| created_at | timestamptz | Criacao |

Com RLS: usuarios veem apenas da propria empresa; admins veem tudo.

### 2. Edge Function (`sms-automation-run`)

Adicionar uma nova secao no processamento (apos as secoes existentes):

- Verificar se `proposta_sms_ativa` esta ativa
- Buscar registros de `sms_proposal_notifications` onde `sent = false` e `scheduled_at <= now()`
- Para cada registro, montar a mensagem substituindo `{{consultor}}`, `{{empresa}}` e `{{nome}}`
- Enviar via provedor ativo e marcar como `sent = true`
- Responde ao filtro `section = "proposta"` para envio manual

### 3. SalesWizard -- Dialog de Notificacao SMS

Apos o sucesso da criacao (no fluxo atual, entre o success animation e o DocumentUploadModal), inserir um novo dialog:

- Titulo: "Notificar cliente via SMS?"
- Descricao: "O cliente recebera uma mensagem SMS em 2 horas informando sobre a proposta"
- Botoes: "Sim, notificar" (insere registro em `sms_proposal_notifications`) e "Nao, obrigado" (pula)
- O dialog so aparece se a configuracao `proposta_sms_ativa` estiver ativa
- Ao clicar "Sim", busca o nome da empresa via `companies` + `user_companies` e insere o agendamento

### 4. AutomationView -- Novo Card "Notificacao de Proposta"

Adicionar um novo card com cor teal/cyan na secao de automacoes:

- Toggle ativar/desativar (`proposta_sms_ativa`)
- Campo de mensagem editavel (`msg_proposta_criada`)
- Contador de caracteres (limite 160)
- Dica de variaveis disponiveis: `{{nome}}`, `{{consultor}}`, `{{empresa}}`
- Botao "Disparar Agora" para processar fila pendente manualmente

---

### Arquivos a criar/editar

| Arquivo | Alteracao |
|---|---|
| **Migracao SQL** | Criar tabela `sms_proposal_notifications` + inserir 2 settings |
| `supabase/functions/sms-automation-run/index.ts` | Nova secao para processar fila de notificacoes de proposta |
| `src/modules/sales-wizard/SalesWizard.tsx` | Novo dialog pos-criacao perguntando sobre SMS + logica de agendamento |
| `src/modules/sales-wizard/components/SmsNotifyDialog.tsx` | **Novo** -- componente do dialog de notificacao SMS |
| `src/modules/sms/views/AutomationView.tsx` | Novo card "Notificacao de Proposta" com toggle, mensagem editavel e disparar agora |

### Fluxo do Usuario

1. Usuario cria proposta no Gerador de Propostas
2. Escolhe status inicial (dialog existente)
3. Proposta e salva com sucesso
4. Novo dialog aparece: "Deseja notificar o cliente via SMS?"
5. Se "Sim": registro e inserido em `sms_proposal_notifications` com `scheduled_at = now() + 2h`
6. O cron job (que roda a cada hora) processa a fila e envia o SMS quando `scheduled_at` chegar
7. Gestor/Admin pode editar a mensagem e ativar/desativar no painel Comunicacao SMS > Automacao

