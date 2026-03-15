

## Integração API Bancária JoinBank (Ajin) — Digitação de Contratos

### Visão Geral

Integrar a API JoinBank (base URL `https://api.ajin.io/v3`) no sistema para permitir a digitação de contratos diretamente pela plataforma. O fluxo: usuário busca cliente no Base OFF → clica "Digitar Contrato" → formulário pré-preenchido com dados do sistema (editáveis) → simulação via API → criação da proposta.

### Arquitetura

```text
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Base OFF   │───▶│  Edge Function   │───▶│  api.ajin.io/v3 │
│  Frontend   │◀───│  joinbank-proxy  │◀───│  JoinBank API   │
└─────────────┘    └──────────────────┘    └─────────────────┘
                          │
                   API Key stored as
                   Supabase secret
```

### Credenciais

A API Key (`qpF8OAaMLfQ+...`) será armazenada como secret do Supabase (`JOINBANK_API_KEY`). O login ID será armazenado como `JOINBANK_LOGIN_ID`. Nunca expostas no frontend.

### Fase 1 — Infraestrutura

**1. Edge Function `joinbank-proxy/index.ts`**
- Proxy seguro que encaminha requests para `api.ajin.io/v3`
- Rotas suportadas:
  - `POST /loan-products/search/basic` — listar produtos
  - `POST /loan-product-rules/search/basic` — listar tabelas
  - `POST /loan-inss-simulations` — criar simulação INSS
  - `POST /loan-inss-simulations/calculation` — calculadora
  - `GET /loan-inss-simulations/:id` — consultar simulação
  - `PUT /loan-inss-simulations/:id` — atualizar simulação
  - `POST /loan-inss-simulations/:id/actions` — gerar contratos
  - `POST /query-inss-balances/finder` — consultar IN100
  - `POST /loans/search` — buscar empréstimos
  - `GET /loans/:id` — detalhes do empréstimo
- Header `apikey` injetado server-side via `Deno.env.get('JOINBANK_API_KEY')`
- Autenticação do usuário via JWT

**2. Tabela `joinbank_proposals`**
- Registra cada digitação feita pelo sistema
- Campos: `id`, `user_id`, `company_id`, `client_cpf`, `client_name`, `simulation_id` (retornado pela API), `operation_type`, `status`, `api_response`, `created_at`, `updated_at`
- RLS: usuário vê as próprias, gestor/admin vê todas da empresa

**3. Tabela `joinbank_config`**
- Configurações da API por empresa (produtos habilitados, tabelas padrão)
- Campos: `id`, `company_id`, `enabled`, `default_products`, `notes`, `created_at`

### Fase 2 — Admin Panel

**4. Seção "API Bancária" no AdminOperations**
- Card novo no menu de Operações do Admin
- Sub-tela com:
  - Status da conexão (testa endpoint `/about`)
  - Lista de produtos disponíveis (carregados da API)
  - Lista de tabelas por operação
  - Histórico de propostas digitadas (todas as empresas)
  - Toggle para habilitar/desabilitar por empresa

### Fase 3 — Digitação no Base OFF

**5. Botão "Digitar Contrato" no `ClienteDetalheView.tsx`**
- Aparece entre a seção de Margens e Contratos
- Ícone de envio + badge "API Bancária"
- Abre um drawer/modal wizard

**6. Wizard de Digitação — `DigitacaoWizard.tsx`**
- **Step 1 — Tipo de Operação**: Novo / Portabilidade / Refinanciamento / Port+Refin
- **Step 2 — Dados do Cliente** (pré-preenchidos do Base OFF, todos editáveis):
  - Nome, CPF, NB, Data Nascimento, Nome da Mãe, Estado Civil, Sexo
  - Renda (mr), Telefone, Email
  - Endereço completo (rua, número, complemento, bairro, cidade, UF, CEP)
  - Documento (RG: número, data emissão, órgão, UF)
  - Dados do benefício (espécie, estado, data início, meio pagamento)
- **Step 3 — Dados da Operação**:
  - Seleção da tabela (ruleId) carregada da API
  - Prazo, Taxa, Valor Parcela ou Valor Empréstimo
  - Para Portabilidade: dados do contrato original (banco, número, prazo, parcelas restantes, parcela, saldo devedor) — pré-preenchidos dos contratos existentes
  - Para Refinanciamento: contrato de origem selecionável
  - Seguro (sim/não)
  - Conta bancária de crédito
- **Step 4 — Calculadora**: chama `/calculation`, exibe resultado com valores simulados
- **Step 5 — Confirmação**: resumo completo, botão "Enviar Proposta"
  - Chama `POST /loan-inss-simulations` para criar
  - Salva na tabela `joinbank_proposals`

**7. Mapeamento automático dos dados**
- `client.cpf` → `borrower.identity`
- `client.nome` → `borrower.name`
- `client.nb` → `borrower.benefit`
- `client.data_nascimento` → `borrower.birthDate`
- `client.nome_mae` → `borrower.motherName`
- `client.mr` → `borrower.income`
- `client.tel_cel_1` → `borrower.phone`
- `client.email_1` → `borrower.email`
- `client.uf` → `borrower.benefitState`
- `client.esp` → `borrower.benefitType` (código numérico)
- `client.meio_pagto` → `borrower.benefitPaymentMethod` (1: Cartão, 2: CC)
- Endereço mapeado dos campos `endereco`, `bairro`, `municipio`, `uf`, `cep`
- Contratos existentes → dados do `originContract` para portabilidade

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---|---|
| `supabase/functions/joinbank-proxy/index.ts` | Criar — Edge Function proxy |
| `supabase/config.toml` | Adicionar config do joinbank-proxy |
| Migração SQL | Criar tabelas `joinbank_proposals` e `joinbank_config` |
| `src/modules/baseoff/components/DigitacaoWizard.tsx` | Criar — Wizard de digitação (5 steps) |
| `src/modules/baseoff/hooks/useJoinBankAPI.ts` | Criar — Hook para chamadas à API via edge function |
| `src/modules/baseoff/views/ClienteDetalheView.tsx` | Modificar — Adicionar botão "Digitar Contrato" |
| `src/components/admin/AdminBankingAPI.tsx` | Criar — Painel admin de configuração da API |
| `src/components/admin/AdminOperations.tsx` | Modificar — Adicionar seção "API Bancária" |

### Segurança

- API Key nunca exposta no frontend — sempre via edge function
- JWT validado em cada request à edge function
- RLS nas tabelas de proposals
- Rate limiting na edge function para proteger a API bancária

### Observações

- A implementação inicial foca em **INSS** (operações 1-5), que é o caso de uso principal do Base OFF
- FGTS e Consignado Privado CLT podem ser adicionados em fases futuras
- Todos os campos são editáveis mesmo que pré-preenchidos, conforme solicitado

