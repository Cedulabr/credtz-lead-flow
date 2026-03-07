

## Plano: Evolucao Completa do Modulo Controle de Ponto

### Diagnostico do Estado Atual

O modulo ja possui uma estrutura solida com 8 subcomponentes. Os problemas sao pontuais:

| Funcionalidade | Estado Atual | Problema |
|---|---|---|
| PDF mensal | Existe (`TimeClockPDF`) | Falta CPF, cargo, coluna pausa/atraso |
| Pausas | Funciona parcialmente | So considera 1 pausa por dia |
| Atrasos | Hardcoded `08:10` no dashboard | Nao usa jornada do colaborador |
| Jornadas | `ScheduleManager` existe | Funciona por usuario, nao por template |
| Relatorios | PDF basico no `AdminControl` | Falta relatorios de pausas, HE, presenca |
| Banco de horas | Nao existe | Precisa criar |
| Justificativas | `JustificationManager` existe | Falta upload de atestado |
| Dashboard presenca | `ManagerDashboard` existe | Falta status "em pausa" |

### Alteracoes Planejadas

Devido ao tamanho, o trabalho sera dividido em etapas incrementais. Abaixo o plano completo:

---

**Etapa 1: Corrigir calculo de pausas e atrasos (core logic)**

Arquivo: `src/components/TimeClock/MyHistory.tsx`
- Alterar `groupByDate()` para somar TODAS as pausas do dia (multiplos pares pausa_inicio/pausa_fim), nao apenas a primeira
- Calcular atraso comparando hora de entrada com a jornada do colaborador (buscar de `time_clock_schedules`)

Arquivo: `src/components/TimeClock/ManagerDashboard.tsx`
- Remover hardcode `08:10` na linha 184
- Buscar jornada de cada colaborador via `time_clock_schedules` e usar `entry_time + tolerance_minutes` para calcular atraso
- Adicionar status `on_break` (em pausa) quando ha `pausa_inicio` sem `pausa_fim`
- Adicionar card "Em Pausa" no dashboard de estatisticas

Arquivo: `src/hooks/useTimeClock.ts`
- Criar funcao `calculateDayMetrics(records, schedule)` que retorna: `{ workedMinutes, breakMinutes, delayMinutes, overtimeMinutes, status }`

---

**Etapa 2: Melhorar PDF mensal**

Arquivo: `src/components/TimeClock/TimeClockPDF.tsx`
- Adicionar busca de CPF e cargo do colaborador via `profiles`
- Adicionar colunas no PDF mensal: "Pausas" (tempo total) e "Atraso" (minutos)
- Usar jornada do colaborador para calcular atraso por dia
- Melhorar rodape com: Total horas extras, Total atrasos, Total faltas, Banco de horas
- Adicionar campo CPF e Cargo no cabecalho do colaborador

---

**Etapa 3: Jornadas como templates + escala semanal**

A tabela `time_clock_schedules` ja tem `work_days`, `entry_time`, `exit_time`, `lunch_start`, `lunch_end`, `tolerance_minutes`. Ja suporta jornadas personalizadas por colaborador com dias da semana.

Arquivo: `src/components/TimeClock/ScheduleManager.tsx`
- Adicionar campo "Nome da Jornada" para facilitar identificacao
- Permitir duplicar jornada para outro colaborador
- Melhorar UX mostrando resumo visual da escala semanal

Migracao SQL:
```sql
ALTER TABLE time_clock_schedules ADD COLUMN IF NOT EXISTS schedule_name text DEFAULT 'Jornada Padrao';
```

---

**Etapa 4: Banco de horas**

Migracao SQL:
```sql
CREATE TABLE IF NOT EXISTS time_clock_hour_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id),
  reference_month text NOT NULL, -- '2026-03'
  expected_minutes integer NOT NULL DEFAULT 0,
  worked_minutes integer NOT NULL DEFAULT 0,
  balance_minutes integer NOT NULL DEFAULT 0, -- positivo = extra, negativo = devedor
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, reference_month)
);
ALTER TABLE time_clock_hour_bank ENABLE ROW LEVEL SECURITY;
```

Criar novo componente: `src/components/TimeClock/HourBank.tsx`
- Exibir saldo de horas por mes (positivo/negativo)
- Calcular automaticamente baseado nos registros do mes vs jornada esperada
- Mostrar acumulado geral

Adicionar aba "Banco de Horas" no `index.tsx`

---

**Etapa 5: Relatorios avancados**

Criar novo componente: `src/components/TimeClock/Reports.tsx`

4 tipos de relatorio com filtro por empresa, colaborador, periodo:
1. **Atrasos**: lista de atrasos por colaborador com minutos e total
2. **Pausas**: tempo total de pausas por dia/colaborador
3. **Horas extras**: dias com HE, total por colaborador
4. **Presenca mensal**: grid mes completo com status por dia

Cada relatorio exportavel em:
- PDF (jsPDF, ja disponivel)
- Excel (xlsx, ja disponivel)

Adicionar aba "Relatorios" no `index.tsx` para gestores/admin

---

**Etapa 6: Upload de atestado nas justificativas**

Arquivo: `src/components/TimeClock/JustificationManager.tsx`
- Adicionar campo de upload de arquivo (imagem/PDF) no modal de criacao
- Fazer upload para Supabase Storage bucket `time-clock-documents`
- Salvar URL no campo `attachment_url` (ja existe na tabela)
- Exibir preview/link do documento na revisao

---

**Etapa 7: Atualizar navegacao do modulo**

Arquivo: `src/components/TimeClock/index.tsx`
- Adicionar abas: "Banco de Horas" e "Relatorios" para gestores
- Reorganizar tabs para melhor UX

---

### Resumo de arquivos modificados

| Arquivo | Acao |
|---|---|
| `src/hooks/useTimeClock.ts` | Adicionar `calculateDayMetrics()` |
| `src/components/TimeClock/MyHistory.tsx` | Corrigir calculo multiplas pausas |
| `src/components/TimeClock/ManagerDashboard.tsx` | Usar jornada real, status "em pausa" |
| `src/components/TimeClock/TimeClockPDF.tsx` | CPF, cargo, pausas, atraso, banco horas |
| `src/components/TimeClock/ScheduleManager.tsx` | Nome da jornada, duplicar |
| `src/components/TimeClock/JustificationManager.tsx` | Upload de atestado |
| `src/components/TimeClock/HourBank.tsx` | **Novo** - banco de horas |
| `src/components/TimeClock/Reports.tsx` | **Novo** - relatorios avancados |
| `src/components/TimeClock/index.tsx` | Novas abas |

### Migracoes SQL

1. `ALTER TABLE time_clock_schedules ADD COLUMN schedule_name text`
2. `CREATE TABLE time_clock_hour_bank` com RLS
3. Criar bucket `time-clock-documents` no Storage (se nao existir)

### Ordem de implementacao

Etapas 1-2 primeiro (core fixes), depois 3-7 incrementalmente. Total estimado: ~7 arquivos modificados, 2 novos componentes, 2 migracoes.

