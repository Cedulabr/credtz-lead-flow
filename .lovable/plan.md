

## Evolução do Banco de Horas — Plano de Implementação

### Estado Atual
- `time_clock_hour_bank` existe mas só tem campos básicos (expected/worked/balance_minutes por mês). Sem lançamentos manuais, compensações, ou histórico detalhado.
- `HourBank.tsx` calcula tudo client-side a cada render — não persiste detalhes (atrasos, extras, saída antecipada).
- `DiscountCalculator.tsx` já faz cálculo de descontos por horas negativas/faltas.
- `employee_salaries` já tem `base_salary` por colaborador.
- `time_clock_schedules` tem `daily_hours`, `work_days`, `tolerance_minutes`, `max_overtime_daily_minutes`.

### Database Changes (Migration)

**1. Expandir `time_clock_hour_bank`** — adicionar colunas de detalhamento:
```sql
ALTER TABLE time_clock_hour_bank ADD COLUMN IF NOT EXISTS
  overtime_minutes INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0,
  early_exit_minutes INTEGER DEFAULT 0,
  absence_count INTEGER DEFAULT 0,
  manual_adjustments_minutes INTEGER DEFAULT 0,
  compensations_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open'; -- open, closed, paid
```

**2. Nova tabela `hour_bank_entries`** — lançamentos manuais e compensações:
```sql
CREATE TABLE public.hour_bank_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  entry_date DATE NOT NULL,
  entry_type TEXT NOT NULL, -- 'hora_extra', 'atraso', 'saida_antecipada', 'falta', 'ajuste_manual', 'compensacao_folga', 'compensacao_pagamento', 'desconto_folha'
  minutes INTEGER NOT NULL, -- positive = credit, negative = debit
  reason TEXT,
  reference_month TEXT NOT NULL, -- 'YYYY-MM'
  performed_by UUID NOT NULL,
  -- compensation-specific
  hourly_rate NUMERIC(10,2),
  total_value NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**3. Nova tabela `hour_bank_settings`** — regras configuráveis por empresa:
```sql
CREATE TABLE public.hour_bank_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE,
  tolerance_delay_minutes INTEGER DEFAULT 10,
  max_overtime_monthly_minutes INTEGER DEFAULT 2400, -- 40h
  max_bank_balance_minutes INTEGER DEFAULT 7200, -- 120h
  allow_negative_discount BOOLEAN DEFAULT true,
  overtime_multiplier NUMERIC(3,2) DEFAULT 1.50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**4. RLS policies** on both new tables (admin/gestor full access, collaborator read-only on own entries).

### UI Components

**1. Rewrite `HourBank.tsx`** — Complete overhaul with sub-tabs:

- **Resumo** (default): Summary cards (Saldo Atual, Horas Extras, Atrasos, Compensações) + monthly table with expanded columns (extras, atrasos, saída antecipada, faltas, ajustes, saldo).
- **Histórico**: Detailed entry log from `hour_bank_entries` — date, type (color-coded badges), minutes, reason, who performed.
- **Lançamentos** (admin/gestor only): Form to add manual entries — select collaborator, type dropdown, minutes, date, reason. Supports both credit and debit.
- **Compensações** (admin/gestor only): Dedicated compensation flow:
  - "Compensar com Folga" — select hours to convert to day-off
  - "Compensar com Pagamento" — enter hourly rate, calculate total, register
  - "Desconto em Folha" — register negative hours as payroll deduction

**2. New `HourBankSettings.tsx`** — configurable rules (tolerance, max overtime, max bank balance, negative discount toggle, overtime multiplier). Accessible from Settings tab.

**3. Enhanced `HourBank` calculation** — on "Recalcular Mês":
- Iterate all days in month
- For each day: calculate `workedMinutes`, compare with schedule
- Compute: overtime, delay, early exit (exit before `exit_time - tolerance`)
- Sum manual entries from `hour_bank_entries`
- Persist to `time_clock_hour_bank` with all detail columns
- This replaces the current client-only calculation

**4. Reports** — Monthly report with PDF/Excel export:
- Total worked, expected, overtime, delays, balance, compensations
- Per-collaborator breakdown
- Uses existing jsPDF + xlsx libraries

### File Plan

| File | Action |
|------|--------|
| `supabase/migrations/...` | New tables + columns + RLS |
| `src/components/TimeClock/HourBank.tsx` | Full rewrite with sub-tabs |
| `src/components/TimeClock/HourBankEntries.tsx` | New — manual entries form + list |
| `src/components/TimeClock/HourBankCompensation.tsx` | New — compensation workflows |
| `src/components/TimeClock/HourBankSettings.tsx` | New — configurable rules |
| `src/components/TimeClock/HourBankReport.tsx` | New — PDF/Excel monthly report |
| `src/lib/timeClockCalculations.ts` | Add `calculateEarlyExitMinutes` function |
| `src/components/TimeClock/Settings.tsx` | Link to hour bank settings |
| `src/components/TimeClock/types.ts` | Add new types |

### Calculation Logic (Enhanced)

For each work day:
1. `workedMinutes = exitTime - entryTime - breaks`
2. `delayMinutes = max(0, entryTime - scheduledEntry - tolerance)`
3. `earlyExitMinutes = max(0, scheduledExit - exitTime - tolerance)` (NEW)
4. `overtimeMinutes = max(0, workedMinutes - dailyHoursExpected)`
5. `balanceMinutes = workedMinutes - dailyHoursExpected + manualAdjustments`

Monthly summary persists all these aggregated values to `time_clock_hour_bank`.

### Tab Structure
The existing "Banco Horas" tab becomes the enhanced module. No new top-level tabs needed — all sub-features live inside `HourBank` via internal tabs (Resumo, Histórico, Lançamentos, Compensações).

For admin, the Settings tab gets a new "Banco de Horas" section for configurable rules.

### Payroll Integration (Future-Ready)
The `hour_bank_entries` table with `entry_type`, `hourly_rate`, and `total_value` columns enables future payroll export. The monthly report already calculates the financial values needed.

