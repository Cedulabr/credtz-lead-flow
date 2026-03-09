

## Plano: Gestão de Horas por Empresa + Compensação com Limite Diário

### O que será construído

1. **Nova aba "Gestão" no Banco de Horas** (admin/gestor) — Painel panorâmico com todos os colaboradores da empresa, mostrando saldo positivo/negativo de cada um. Filtros por empresa e por status (positivo/negativo). Ações diretas: lançar desconto ou solicitar compensação.

2. **Nova tabela `hour_bank_compensation_requests`** — Quando o admin lança uma solicitação de compensação, ela fica registrada com `status: pending`, `total_minutes` (total a compensar), `daily_limit_minutes: 30`, e o colaborador vê um alerta no seu painel.

3. **Visão do colaborador** — No tab "Banco Horas", o colaborador vê um banner de alerta quando tem horas pendentes de compensação, mostrando: total que deve, quanto já compensou, quanto falta. A regra de 30min/dia é aplicada automaticamente.

4. **Controle automático de 30min/dia** — Ao registrar ponto, se o colaborador tem uma solicitação ativa de compensação, o sistema calcula automaticamente até 30min de compensação por dia trabalhado e registra em `hour_bank_entries`.

### Database Changes

**Nova tabela `hour_bank_compensation_requests`:**
```sql
CREATE TABLE public.hour_bank_compensation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  requested_by UUID NOT NULL,
  total_minutes INTEGER NOT NULL,
  compensated_minutes INTEGER DEFAULT 0,
  daily_limit_minutes INTEGER DEFAULT 30,
  compensation_type TEXT NOT NULL DEFAULT 'compensacao', -- 'compensacao' or 'desconto_folha'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### File Changes

| File | Action |
|------|--------|
| Migration SQL | New table + RLS |
| `HourBank.tsx` | Add "Gestão" tab for admin/gestor with company-wide view |
| `HourBankCompensation.tsx` | Add "Solicitar Compensação" option that creates request with 30min/day limit |
| New: `HourBankCompanyOverview.tsx` | Table of all employees with balances, filter by positive/negative, actions to discount or request compensation |
| New: `HourBankEmployeeAlert.tsx` | Banner shown to collaborator when they have pending compensation requests |
| `HourBank.tsx` (collaborator view) | Show alert banner with pending compensation details |

### Company-wide Overview (Gestão tab)

The admin/gestor sees a table:
- **Columns**: Colaborador | Saldo Acumulado | Horas Extras | Atrasos | Ações
- **Filters**: Empresa (admin only), Tipo (Positivo/Negativo/Todos)
- **Actions per row**: "Lançar Desconto" (opens discount form) | "Solicitar Compensação" (creates request with 30min/day rule)
- Data comes from `time_clock_hour_bank` aggregated per user, with profiles joined for names

### Collaborator Alert Flow

When collaborator opens "Banco Horas":
1. System checks `hour_bank_compensation_requests` where `user_id = current_user` and `status IN ('pending', 'in_progress')`
2. Shows red banner: "Você possui X horas para compensar. Compensação de 30min/dia será aplicada automaticamente. Já compensado: Yh Zmim | Restante: Wh Vmim"
3. The compensation happens automatically each work day — when the day's balance is calculated, up to 30min is deducted and recorded

### Key Implementation Details

- `loadUsers` in `HourBank.tsx` already loads all users; for company filtering, use `useGestorCompany` to get `companyUserIds`
- The 30min/day compensation is tracked via `hour_bank_entries` with `entry_type: 'compensacao_diaria'` and linked to the request
- When `compensated_minutes >= total_minutes`, status changes to `'completed'`

