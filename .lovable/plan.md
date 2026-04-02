

## Full Evolution — Leads Premium & Activate Leads: Deadline, Block, Recycling

### Overview

Implement a 48h treatment deadline system, overdue block banner, mandatory treatment logging, withdrawal confirmation screen, per-user lead locking, and "Not Interested" recycling after 60 days.

### 1. Database Migration

**New columns on `leads` table:**
- `withdrawn_at timestamptz` — exact moment the lead was withdrawn (set during `requestLeads`)
- `treatment_deadline timestamptz` — auto-calculated as `withdrawn_at + 48h`
- `treated_at timestamptz` — when the user first changed status from `new_lead`
- `treatment_status text DEFAULT 'pending'` — values: `pending`, `treated`, `overdue`

**New table `lead_treatment_log`:**
```sql
CREATE TABLE public.lead_treatment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL, -- contacted, no_answer, scheduled, not_interested, etc.
  contact_date timestamptz NOT NULL,
  notes text,
  follow_up_date timestamptz, -- auto-set for "no_answer"
  follow_up_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**Update blacklist expiry**: Change `leads_blacklist` insert for `sem_interesse` from 30 days to 60 days (recycling requirement).

**Index**: `CREATE INDEX idx_leads_treatment_deadline ON leads(treatment_deadline) WHERE treatment_status = 'pending'`

### 2. Update `request_leads_with_credits` RPC

Add to the function after inserting into `leads_distribution`:
```sql
-- The frontend will set withdrawn_at and treatment_deadline on insert into leads table
```

Actually, the RPC only returns data from `leads_database`. The insert into `leads` happens in `useLeadsPremium.ts` line 303-324. We'll add `withdrawn_at` and `treatment_deadline` there.

### 3. Withdrawal Confirmation Screen (Fix quantity bug + preview)

**New RPC function `preview_available_leads`:**
```sql
CREATE FUNCTION public.preview_available_leads(
  convenio_filter text, ddd_filter text[], tag_filter text[], max_count int
) RETURNS TABLE(name text, phone_masked text, convenio text, total_available bigint)
```
Returns masked phone (e.g., `(11) 9****-1234`) and total count. No locking, read-only.

**New Step in RequestLeadsWizard** — `StepConfirmacao.tsx`:
- Before final submission, calls `preview_available_leads`
- Shows: requested qty vs available qty, list of lead names with masked phones
- Warning if available < requested
- Confirm / Cancel buttons

### 4. Overdue Block Banner

**New component `OverdueBlockBanner.tsx`:**
- Query leads where `treatment_status = 'pending'` AND `treatment_deadline < now()`
- Full-width red banner with `position: sticky` at top of content area
- Lists each overdue lead: name, withdrawn date, time elapsed
- Blocks the "Pedir Leads" button (disable + tooltip)
- Only disappears when all overdue leads are treated

**New hook `useOverdueLeads.ts`:**
- Polls every 60s for overdue leads belonging to current user
- Returns `{ overdueLeads, hasOverdue, isBlocked }`
- Also handles progressive notification toasts at 24h and 36h marks

### 5. Mandatory Treatment Logging

**Update `LeadDetailDrawer.tsx`:**
- When changing status from `new_lead` to any other status, require treatment log entry
- Dialog with: status select, contact datetime, notes (required), follow-up date (auto for "no_answer")
- Insert into `lead_treatment_log` + update `leads.treated_at` and `treatment_status = 'treated'`

**"No Answer" follow-up enforcement:**
- Auto-create follow-up task (entry in `lead_treatment_log` with `follow_up_date`)
- Show badge/alert on leads with pending follow-ups
- Block status change until follow-up is logged

### 6. Per-User Lead Lock (Race condition fix)

Already partially implemented via `FOR UPDATE SKIP LOCKED` in the RPC. Strengthen:
- The `leads_distribution` table already records `lead_id` + `user_id` with `expires_at = 10 years`
- The `NOT EXISTS` check on `leads_distribution` prevents other users from getting the same lead
- **No additional changes needed** — the current RPC handles this correctly at database level

### 7. "Not Interested" Recycling (60 days)

**Update `useLeadsPremium.updateLeadStatus`:**
- When setting status to `sem_interesse`, call `blacklist_lead_premium` RPC but with 60-day expiry instead of 30
- The existing `release_expired_blacklisted_leads` cron already handles un-blacklisting

**Update blacklist function or create new one:**
```sql
CREATE OR REPLACE FUNCTION public.blacklist_lead_with_duration(
  lead_cpf text, reason text, duration_days int DEFAULT 30
)
```

- Remove lead from user's portfolio (`assigned_to = null`, `status = 'sem_interesse'`)
- Set `is_available = false` in `leads_database`
- Insert into `leads_blacklist` with `expires_at = now() + duration_days`
- Preserve full history in `leads.history` JSON

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | Add columns to `leads`, create `lead_treatment_log`, create `preview_available_leads` RPC, create `blacklist_lead_with_duration` |
| `src/modules/leads-premium/hooks/useLeadsPremium.ts` | Set `withdrawn_at`/`treatment_deadline` on insert; update recycling logic |
| `src/modules/leads-premium/hooks/useOverdueLeads.ts` | New hook for overdue detection + progressive alerts |
| `src/modules/leads-premium/components/OverdueBlockBanner.tsx` | New full-width red banner component |
| `src/modules/leads-premium/components/TreatmentLogDialog.tsx` | New mandatory treatment dialog |
| `src/modules/leads-premium/components/RequestLeadsWizard/StepConfirmacao.tsx` | New confirmation step with preview |
| `src/modules/leads-premium/components/RequestLeadsWizard/index.tsx` | Add confirmation step to wizard flow |
| `src/modules/leads-premium/LeadsPremiumModule.tsx` | Integrate banner + block logic |
| `src/modules/leads-premium/components/LeadDetailDrawer.tsx` | Require treatment log on status change |

