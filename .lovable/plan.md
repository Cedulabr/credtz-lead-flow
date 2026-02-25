

# Plano: Evolucao Disparos SMS - Exclusao, Creditos e Registro Real

## Resumo

Corrigir campanhas travadas em "sending", adicionar exclusao de campanhas, implementar sistema de creditos SMS para colaboradores (igual leads premium), e garantir que o historico registra corretamente cada envio/falha.

---

## Diagnostico dos Problemas Encontrados

1. **Campanha travada em "sending"**: A campanha `24e9eddd` ficou com status "sending" permanentemente. Isso aconteceu antes da correcao do edge function. Precisa de um botao para corrigir campanhas antigas travadas.

2. **Historico funciona**: A campanha `ac629c7b` (teste mais recente) JA registrou 2 mensagens no `sms_history` corretamente com status "sent" e `provider_message_id`. A correcao anterior do edge function resolveu o problema de registro.

3. **Creditos SMS**: Nao existe sistema de creditos para SMS. Colaboradores podem disparar sem limite.

---

## Fase 1: Migracao de Banco de Dados

### 1.1 Tabelas de Creditos SMS

Criar tabelas espelhando o modelo de `user_credits` e `credits_history`, mas para SMS:

```text
sms_credits
+----------------------------+
| id (uuid PK)               |
| user_id (uuid FK UNIQUE)   |
| credits_balance (integer)  |
| created_at (timestamptz)   |
| updated_at (timestamptz)   |
+----------------------------+

sms_credits_history
+----------------------------+
| id (uuid PK)               |
| user_id (uuid FK)          |
| admin_id (uuid FK)         |
| action (text)              |
| amount (integer)           |
| balance_before (integer)   |
| balance_after (integer)    |
| reason (text)              |
| created_at (timestamptz)   |
+----------------------------+
```

### 1.2 Funcao RPC `admin_manage_sms_credits`

Similar a `admin_manage_credits` existente - apenas admins podem adicionar/remover creditos SMS.

### 1.3 Funcao RPC `get_user_sms_credits`

Retorna saldo atual de creditos SMS do usuario.

### 1.4 RLS Policies

- Admin: acesso total a ambas tabelas
- Usuario: leitura apenas do proprio saldo e historico

---

## Fase 2: Edge Function `send-sms` - Verificacao de Creditos

Antes de enviar uma campanha, verificar:
1. Se o usuario tem creditos SMS suficientes (total_recipients)
2. Descontar creditos apos o envio (1 credito por SMS enviado com sucesso)
3. Registrar consumo no `sms_credits_history`
4. Admin pode ser isento da verificacao de creditos (configuravel)

---

## Fase 3: Frontend - CampaignsView

### 3.1 Botao Excluir Campanha

Adicionar botao de exclusao (icone lixeira) com confirmacao via AlertDialog. Apenas admin pode excluir. Campanhas com status "sending" tambem podem ser excluidas (para limpar travadas).

### 3.2 Corrigir Campanhas Travadas

Adicionar acao para admin "Marcar como falhou" em campanhas com status "sending" que ficaram travadas.

### 3.3 Mostrar Saldo de Creditos SMS

Exibir saldo atual de creditos SMS do usuario no topo da pagina de Disparos, similar ao que existe no leads premium.

---

## Fase 4: Gestao de Creditos SMS (Admin)

### 4.1 Componente `AdminSmsCreditsManagement`

Criar componente espelhando `AdminCreditsManagement` existente:
- Lista de usuarios com saldo de creditos SMS
- Botoes para adicionar/remover creditos
- Historico de movimentacoes
- Campo de motivo para cada operacao

### 4.2 Integrar no AdminPanel

Adicionar nova aba "Creditos SMS" no painel administrativo.

---

## Fase 5: Historico Melhorado

### 5.1 Vinculo com Campanha

No HistoryView, mostrar o nome da campanha vinculada quando `campaign_id` esta presente.

### 5.2 Botao Atualizar no Historico

Adicionar botao de refresh no historico para recarregar registros apos disparos.

---

## Detalhes Tecnicos

### Arquivos a criar:
1. `supabase/migrations/xxx_sms_credits.sql` -- tabelas, RPCs, RLS
2. `src/components/AdminSmsCreditsManagement.tsx` -- gestao de creditos admin

### Arquivos a modificar:
1. `supabase/functions/send-sms/index.ts` -- verificacao de creditos antes do envio
2. `src/modules/sms/views/CampaignsView.tsx` -- excluir campanha, corrigir travadas, mostrar saldo
3. `src/modules/sms/views/HistoryView.tsx` -- nome da campanha, botao refresh
4. `src/modules/sms/SmsModule.tsx` -- passar refreshHistory para HistoryView
5. `src/components/AdminPanel.tsx` -- aba creditos SMS
6. `src/components/admin/AdminOperations.tsx` -- secao creditos SMS

### Ordem de execucao:
1. Migracao de banco (tabelas + RPCs + RLS)
2. Atualizar edge function send-sms com verificacao de creditos
3. Criar componente AdminSmsCreditsManagement
4. Atualizar CampaignsView (exclusao + saldo + corrigir travadas)
5. Atualizar HistoryView (campanha vinculada + refresh)
6. Integrar no AdminPanel

