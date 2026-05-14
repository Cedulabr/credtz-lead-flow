
# Fase 1 — Fundação SaaS Modular + Piloto SMS

Transformar o Easyn em marketplace modular. Esta fase entrega a **fundação** (catálogo de módulos, assinaturas por empresa, carteiras de crédito, gate de acesso, Marketplace UI, webhook Stripe) e um **piloto ponta-a-ponta**: SMS cobrado por créditos via Stripe.

Mantemos a stack atual: **React + Vite + Supabase + Edge Functions + Stripe BYOK** (evoluindo as 4 functions já criadas).

---

## 1. Modelagem de banco (migration única)

### `modules` — catálogo central
`id, slug (unique), name, category, description, icon, billing_type` (`subscription` | `credits` | `hybrid`), `monthly_price_cents, credit_price_cents, stripe_price_id, stripe_product_id, trial_days, active, sort_order`.

Seed inicial:
- `leads-premium` — credits — R$ 29,90/crédito
- `activate-leads` — subscription — R$ 199,90/mês
- `controle-ponto` — subscription — R$ 149,00/mês (base; per-seat fica para fase 2)
- `meus-clientes`, `gerador-propostas`, `notas-workspace` — subscription (preços a definir, criados como rascunho `active=false`)
- `sms` — credits — R$ 0,08/SMS (piloto)

### `company_modules` — ativação por empresa
`company_id, module_id, status` (`active|trialing|past_due|canceled|inactive`), `stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, grace_period_until, activated_at`. Unique `(company_id, module_id)`.

### `wallets` — carteiras de crédito (1 por empresa por módulo)
`company_id, module_slug, balance, total_purchased, total_consumed, updated_at`. Unique `(company_id, module_slug)`.

### `wallet_transactions` — extrato
`wallet_id, type` (`purchase|consume|refund|admin_adjust`), `amount, balance_after, reference_id, metadata, created_at`.

### `credit_packages` — pacotes pré-definidos
`module_slug, name, credits, price_cents, stripe_price_id, sort_order, active`.

Seed SMS: 100/R$8 · 500/R$40 · 2000/R$160 · 5000/R$400 · custom (calc client-side).

### `billing_events` — log de webhooks Stripe (idempotência)
`stripe_event_id (unique), type, payload, processed_at, error`.

### Reaproveitamento
`subscribers` e `payments` (já existem) ficam para uso geral; `company_modules` e `wallets` passam a ser fonte de verdade do gate.

### RLS
- `modules`, `credit_packages`: SELECT público (autenticados).
- `company_modules`, `wallets`, `wallet_transactions`: SELECT escopado por `company_id` do usuário (via `user_companies`); WRITE só via edge function (service role).
- `billing_events`: nenhum acesso de cliente.

### RPC `has_module_access(_company_id uuid, _slug text) returns boolean`
Security definer; retorna true se `company_modules.status in ('active','trialing')` OU dentro de `grace_period_until`.

---

## 2. Edge Functions

Evoluir as 4 existentes + adicionar 3 novas:

| Function | Papel |
|---|---|
| `create-subscription` (existente) | Aceita `{ module_slug }`, lê preço de `modules`, cria checkout recorrente, grava `pending` em `company_modules`. |
| `create-checkout` (existente) | Aceita `{ module_slug, package_id }` ou `{ module_slug, custom_credits }` para compra one-time de créditos. |
| `check-subscription` (existente) | Reescrita: sincroniza **todas** as assinaturas Stripe do customer com `company_modules`. |
| `customer-portal` (existente) | Sem mudança. |
| **`stripe-webhook`** (novo, `verify_jwt=false`) | Recebe eventos, valida assinatura com `STRIPE_WEBHOOK_SECRET`, idempotência via `billing_events`. Trata: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`. Atualiza `company_modules` e credita `wallets` quando `mode=payment` com metadata de créditos. |
| **`consume-credits`** (novo) | Server-side: valida saldo, debita atomicamente, registra `wallet_transactions`. Usado pelo `send-sms` no piloto. |
| **`get-marketplace`** (novo, opcional) | Retorna catálogo + status do módulo para a empresa logada (pode ser query direta no client). |

Secret necessário: **`STRIPE_WEBHOOK_SECRET`** (a adicionar). `STRIPE_SECRET_KEY` já existe.

---

## 3. Frontend — Marketplace + Gate

### Nova rota `/marketplace` (`src/modules/marketplace/`)
- `MarketplaceModule.tsx` — grid de cards por categoria (Vendas, Gestão, Comunicação).
- `ModuleCard.tsx` — preço, badge de status (Ativo / Trial / Inadimplente / Não contratado), CTA contextual ("Assinar" / "Comprar créditos" / "Gerenciar").
- `CreditPackagesDialog.tsx` — pacotes + input custom (calcula `qtd × R$0,08`).
- `MyModulesView.tsx` — assinaturas ativas, próximo vencimento, botão portal Stripe.
- `WalletView.tsx` — saldo + extrato (`wallet_transactions`).

### Hook `useModuleAccess(slug)`
Retorna `{ hasAccess, status, loading }`. Fonte: `company_modules` + RPC `has_module_access`.

### Componente `<ModuleGate slug="..." />`
Wrapper análogo ao `PermissionGate` existente. Se sem acesso → tela "Contratar módulo" com CTA para `/marketplace`.

### Integração no app
- Adicionar rota `/marketplace` em `App.tsx`.
- Adicionar item "Marketplace" na navegação principal do `Index.tsx`.
- **Não** envolver módulos existentes em `ModuleGate` ainda (evita quebrar usuários atuais). Gate aplicado **apenas no SMS** como piloto.

---

## 4. Piloto SMS ponta-a-ponta

1. Seed do módulo `sms` + 4 pacotes em `credit_packages`.
2. Card "SMS" no Marketplace → abre `CreditPackagesDialog` → `create-checkout` → Stripe → webhook credita `wallets`.
3. `WalletView` mostra saldo SMS.
4. **`send-sms` (function existente)**: antes do envio, chama `consume-credits({ module_slug: 'sms', amount: 1 })`. Se saldo insuficiente, retorna 402 e o front mostra "Comprar créditos".
5. `SmsModule` exibe banner com saldo no topo + atalho para recarregar.

---

## 5. Painel Admin (mínimo nesta fase)

Em `/admin`, nova aba **"Marketplace"**:
- Lista de `modules` (toggle `active`, editar preço — sem mexer no Stripe).
- Tabela de `company_modules` com filtro por status.
- Visão de MRR aproximado (sum `monthly_price` de `active`).

Métricas avançadas (churn, LTV, ARR, dashboards Grafana) ficam para fase posterior.

---

## 6. Fora desta fase (roadmap)

- Per-seat para Controle de Ponto.
- Migrar Leads Premium / Voicer / Radar para `wallets` unificadas (hoje usam tabelas próprias).
- Aplicar `<ModuleGate>` aos módulos pagos existentes (Activate Leads, Meus Clientes etc.) — exige plano de migração de usuários atuais.
- Trial automático, cobrança proporcional em upgrade/downgrade.
- Stripe Tax, PIX (precisa habilitar BR + métodos).
- Painel master com MRR/ARR/churn/LTV completos.

---

## Detalhes técnicos

- **Idempotência webhook**: `INSERT ... ON CONFLICT (stripe_event_id) DO NOTHING`; só processa se inserção criou linha.
- **Atomicidade do consumo**: function PL/pgSQL `consume_wallet(_wallet_id, _amount)` com `UPDATE ... WHERE balance >= _amount RETURNING` — `consume-credits` chama essa RPC.
- **Multi-tenant**: toda escrita de `company_modules`/`wallets` resolve `company_id` server-side via `user_companies` (padrão já estabelecido no projeto).
- **Stripe metadata**: cada checkout grava `{ company_id, module_slug, credits?, package_id? }` em `metadata` para o webhook reconciliar.
- **URL do webhook**: `https://qwgsplcqyongfsqdjrme.supabase.co/functions/v1/stripe-webhook` — usuário cadastra no dashboard Stripe e cola o secret.

## Entregáveis

1. Migration única (tabelas + RLS + RPCs + seeds).
2. 3 edge functions novas + 2 reescritas.
3. Módulo `marketplace` no frontend + rota + nav.
4. SMS piloto integrado com cobrança real.
5. Aba Admin → Marketplace básica.
6. Secret `STRIPE_WEBHOOK_SECRET` solicitado ao usuário.

Após aprovação: solicito o secret e começo pela migration.
