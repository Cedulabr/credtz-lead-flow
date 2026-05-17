## Decisão de arquitetura

Mantemos o modelo **modular já existente** (`modules`, `company_modules`, `wallets`, `stripe-webhook`). Cada produto (Easyn Flow, Leads Premium, Activate Leads, Controle de Ponto, SMS) é um **módulo independente** com seu próprio preço/Stripe price. Não criamos tabelas `plans`/`subscriptions`/`invoices` paralelas — usamos o que já está montado e complementamos onde falta.

Pontos do documento original que **não vamos** implementar (conflitam com o modelo): tabela `plans` global, `subscriptions` separadas com `max_agents`/`max_instances`, guard de "plano único". O equivalente já existe via `ModuleGate` + `company_modules.status`.

## O que será feito

### 1. Catálogo de módulos
- Garantir registros em `public.modules` para: `easynflow`, `leads_premium`, `activate_leads`, `time_clock`, `sms` (este já existe).
- Cada módulo recebe: `name`, `description`, `slug`, `price_monthly`, `stripe_price_id` (preenchido depois), `features` (jsonb), `billing_type` (`subscription` ou `credits`).
- Migration adiciona colunas que faltarem (`price_monthly`, `features`, `stripe_price_id`) na tabela `modules` se ainda não existirem.

### 2. Tabela de faturas
- Nova tabela `public.invoices` (gestor_id, company_id, module_slug, stripe_invoice_id, amount_paid, status, invoice_url, invoice_pdf, period_start, period_end).
- RLS: gestor vê faturas da sua empresa; admin vê todas.
- Webhook `stripe-webhook` passa a gravar em `invoices` nos eventos `invoice.paid` e `invoice.payment_failed` (além do que já faz com `company_modules`).

### 3. Frontend — páginas de billing
- `/billing/success` — confirmação + auto-redirect.
- `/billing/cancel` — mensagem neutra + voltar ao marketplace.
- Marketplace atual (`/marketplace`) já lista módulos; ajustamos para mostrar **preço mensal** quando `billing_type='subscription'` e botão "Assinar" que chama `create-subscription` (já existe) com `module_slug`.
- Nova aba **Faturamento** nas configurações do gestor: lista assinaturas ativas (`company_modules`), próximas cobranças, tabela de `invoices`, botão "Gerenciar pagamento" → `customer-portal` (já existe).

### 4. Admin de módulos (`/admin/modules`)
- CRUD para super-admin: criar/editar módulo, setar `price_monthly`, `stripe_price_id`, toggles `is_active`, contagem de empresas ativas por módulo.
- Protegido por role `admin` existente.

### 5. URLs e ajustes
- `success_url` / `cancel_url` apontam para `https://credtz-lead-flow.lovable.app/billing/success|cancel` (não `app.easynflow.com`).
- Role `admin` (não `super_admin`) — já é o padrão do projeto.

### 6. Configuração Stripe (manual pelo usuário)
Para cada módulo no Stripe Dashboard:
1. Criar Product + Price recorrente mensal.
2. Copiar Price ID → colar no admin `/admin/modules` no campo `stripe_price_id`.
3. Webhook já configurado em `…/functions/v1/stripe-webhook` (feito na fase anterior).

## Detalhes técnicos

**Migrations:**
- `ALTER TABLE modules ADD COLUMN IF NOT EXISTS price_monthly numeric(10,2), ADD COLUMN IF NOT EXISTS stripe_price_id text, ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]', ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'subscription' CHECK (billing_type IN ('subscription','credits','hybrid'))`.
- `INSERT … ON CONFLICT (slug) DO UPDATE` para os 5 módulos com preços: Easyn Flow (a definir), Leads Premium R$29,90, Activate Leads R$199,90, Time Clock R$149,00, SMS (créditos).
- `CREATE TABLE public.invoices (…)` + RLS via `has_role_safe` + policy por `company_id`.

**Edge functions:**
- `stripe-webhook/index.ts`: estender `invoice.paid`/`invoice.payment_failed` para inserir em `invoices` (campo `hosted_invoice_url`, `invoice_pdf`).
- Reusamos `create-subscription`, `customer-portal`, `consume-credits` (já existem).

**Frontend:**
- `src/pages/BillingSuccess.tsx`, `src/pages/BillingCancel.tsx` + rotas em `App.tsx`.
- `src/components/billing/InvoicesTable.tsx` + `src/components/billing/BillingSettings.tsx`.
- `src/pages/admin/ModulesAdmin.tsx` + entrada no menu admin.
- Marketplace: adicionar preço/CTA "Assinar".

## Fora de escopo
- Não criamos tabela `plans` nem `subscriptions` (usamos `modules` + `company_modules`).
- Não criamos `cancel-subscription` separada — cancelamento via Stripe Customer Portal.
- Não mexemos no fluxo de créditos (SMS, Radar, Voicer, Leads) que já funciona.

Pronto para começar?
