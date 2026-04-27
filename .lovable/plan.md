# Lead Profile ↔ Telefonia Integration

Wire the Telefonia module into the lead detail drawer so the user can look up phones for a CPF without leaving the lead, and surface previously-found numbers inline.

## What the user gets

In the **Dados do Cliente** section of the lead drawer (`LeadDetailDrawer.tsx`), next to the Telefone field:

- If lead has **no phone**: prominent blue button **🔍 Buscar telefone via CPF**.
- If lead **already has a phone**: smaller secondary button **🔄 Atualizar telefone**.
- Click handler:
  - If `lead.cpf` is empty → inline warning shown right under the button: *"Adicione o CPF do lead antes de buscar o telefone."* (no navigation).
  - If `lead.cpf` exists → opens a **modal overlay** with the Telefonia "Consultar" experience pre-filled (CPF locked, lead context attached). User stays on the lead.

A new **Telefones encontrados** sub-section appears in the drawer (only when there is data), listing every row from `telefonia_numeros` for the lead's CPF (scoped by company), each with:
- Formatted number `(DDD) 9xxxx-xxxx`
- WhatsApp / Procon / HOT badges
- "Usar como telefone principal" action (updates `leads.phone` + `leads.phone2`)
- Click-to-WhatsApp button (existing green standard) when `tem_whatsapp` is true

The section refreshes after each successful consulta in the modal.

## Technical changes

### 1. New component: `LeadTelefoniaModal.tsx`
Path: `src/modules/leads-premium/components/LeadTelefoniaModal.tsx`

- `<Dialog>` with `max-w-3xl`, scrollable content.
- Renders a trimmed Consultar experience by reusing the existing module pieces:
  - `<SearchForm>` with `initialCpf`, `lockCpf` props (small additions to SearchForm) so the CPF stays the lead's.
  - `useTelefoniaQuery()` hook (already exists), passing `leadId`.
  - `<ResultCard>` with `leadContext={{ id, name }}` so the existing **Usar** button already wired in `TelefonesSection` updates the lead.
- On success, calls `onConsultaComplete()` so the parent re-fetches `telefonia_numeros`.

### 2. New component: `LeadTelefonesEncontrados.tsx`
Path: `src/modules/leads-premium/components/LeadTelefonesEncontrados.tsx`

- Props: `leadId`, `cpf`, `companyId`, `onLeadUpdated`.
- Fetches `telefonia_numeros` filtered by `cpf` (digits only) and `company_id`, ordered by `posicao`.
- Renders nothing if list is empty.
- Reuses `formatPhone` from `src/modules/telefonia/utils/phoneFormat.ts` and badge styles from `TelefonesSection`.
- "Usar como principal" updates `leads.phone` (and `phone2` if main exists) via supabase update, then calls `onLeadUpdated()`.
- Exposes `refetch` via a forwarded ref (or a `refreshKey` prop) so the modal can trigger a reload.

### 3. Edit `LeadDetailDrawer.tsx`
Inside the **Dados do Cliente** Collapsible (around lines 418–466):

- Below the Telefone tile, add a small action row:
  - `lead.phone ? "Atualizar telefone" : "Buscar telefone via CPF"` button (variants: `default` blue / `outline` small).
  - Click → if `!lead.cpf` → set local `cpfWarning=true` (renders inline `Alert` with the message). If CPF present → `setTelefoniaOpen(true)`.
- Below the Collapsible, mount:
  - `<LeadTelefonesEncontrados ... />` (auto-hides when empty).
  - `<LeadTelefoniaModal open=... lead={lead} onConsultaComplete={...} />`.
- New local state: `telefoniaOpen`, `cpfWarning`, `telefonesRefreshKey`.

### 4. Minor additions to existing Telefonia files
- `SearchForm.tsx`: accept optional `initialCpf` and `lockCpf` props (when locked, input is read-only and method picker still works).
- `ResultCard` / `TelefonesSection`: no schema change needed — `leadContext` already supported per the existing implementation; ensure the "Usar" button updates `leads.phone` when clicked.

### 5. No DB migration required
All necessary tables/columns (`telefonia_numeros.lead_id`, `cpf`, `company_id`, badges) already exist from prior prompts. The edge function already records `lead_id` when passed.

## Out of scope
- Activate Leads drawer (separate module) — can be mirrored in a follow-up if desired.
- Bulk phone lookup from lead lists.

## Files touched
- **New**: `src/modules/leads-premium/components/LeadTelefoniaModal.tsx`
- **New**: `src/modules/leads-premium/components/LeadTelefonesEncontrados.tsx`
- **Edited**: `src/modules/leads-premium/components/LeadDetailDrawer.tsx`
- **Edited**: `src/modules/telefonia/components/SearchForm.tsx` (add `initialCpf`, `lockCpf` props)
