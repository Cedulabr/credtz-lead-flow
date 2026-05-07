
# Evolução Corporativa do Módulo de Controle de Ponto

Entrega em **3 fases priorizadas**, com regras trabalhistas, motor de inconsistências, novo PDF UTF-8 e dashboard de RH nível Convenia/Tangerino/Pontotel.

Decisões já alinhadas:
- Registros antigos: **reprocessamento silencioso** (sem marcar pendentes em massa).
- Reabertura de período fechado: **Admin e Gestor da empresa** (com log).

---

## FASE 1 — Núcleo Confiável (juridicamente seguro)

### 1.1 Motor de Validação de Batidas (`timeClockValidation.ts`)
Função pura que recebe as batidas do dia + jornada e retorna `{ status, inconsistencies[], metrics | null }`.

Regras bloqueantes (não calcula horas, marca dia como `PENDENTE_AJUSTE`):
- saída < entrada
- `pausa_fim` < `pausa_inicio`
- número de `pausa_fim` ≠ `pausa_inicio` (pausa aberta)
- pausa > 4h sem justificativa
- batidas duplicadas (mesmo tipo no mesmo minuto)
- horários inválidos / fora de 00:00–23:59
- entrada sem saída em dia já encerrado (D-1 fechado)
- saída sem entrada
- jornada > 12h (CLT) sem justificativa
- horários invertidos / fora de ordem cronológica

### 1.2 Novo Motor de Cálculo (`timeClockCalculations.ts` reescrito)
Calcula **somente** quando o dia é válido. Saídas separadas:
- horas trabalhadas, horas previstas, horas extras
- atraso, saída antecipada
- pausas (total + por intervalo)
- saldo do dia para banco de horas
- faltas (nenhuma batida em dia útil)
- horas justificadas / abonadas

Regras:
- Intervalo subtraído automaticamente.
- Dias `PENDENTE_AJUSTE` **não entram** em banco, extras, descontos ou totais até aprovação.
- Feriados → status próprio (roxo); trabalho em feriado vira extra 100%.

### 1.3 Status visual por dia (badges)
- 🟢 VERDE — jornada correta
- 🟡 AMARELO — observação (atraso/saída antecipada dentro tolerância)
- 🔴 VERMELHO — inconsistência grave (PENDENTE_AJUSTE)
- 🔵 AZUL — justificado/abonado
- ⚫ CINZA — falta
- 🟣 ROXO — feriado

Aplicado em `MyHistory`, `ManagerDashboard` e PDF.

### 1.4 PDF Profissional UTF-8 (`TimeClockPDF.tsx` reescrito)
- Migra geração para **jsPDF + jspdf-autotable** com fonte embutida que suporta acentos (Roboto-Regular.ttf via `addFileToVFS`/`addFont`) — elimina os `#ó� �P�e�n�d`.
- Cabeçalho: logo, empresa, colaborador, cargo, CPF, período, jornada contratada.
- Tabela: Data | Dia | Entrada | Saída | Intervalo | Trabalhadas | Atraso | Extra | Banco | Status | Observações.
- Rodapé totalizador: trabalhado, previsto, extras, banco, atrasos, faltas, justificadas, desconto estimado.
- Paginação `Página X de Y`, data/hora de geração, hash SHA-256 do conteúdo, espaço para assinaturas (colaborador / gestor).
- Linhas vermelhas para dias `PENDENTE_AJUSTE`.

### 1.5 Migração SQL (Fase 1)
- Coluna `daily_status` em `time_clocks` (enum: ok, observacao, pendente_ajuste, justificado, falta, feriado).
- Tabela `time_clock_day_summary` (cache por user_id+data: minutos trabalhados, extras, banco, atraso, saída antecipada, status, inconsistências jsonb).
- Trigger que recalcula a linha de resumo a cada insert/update/delete em `time_clocks`.
- Função `recalc_user_day(user_id, date)` (SECURITY DEFINER) usada pelo trigger e pelo job de reprocessamento silencioso de histórico.

---

## FASE 2 — Dashboard RH + Fluxo de Ajuste

### 2.1 Dashboard RH (`HRDashboard.tsx`)
Cards e gráficos (Recharts) escopados por `company_id`:
- Total de atrasos (mês) + ranking top 10
- Faltas no mês
- Saldo de banco de horas por colaborador
- Colaboradores com pendências (PENDENTE_AJUSTE)
- Inconsistências por tipo
- Horas extras pagas vs banco
- Métrica mensal comparativa

### 2.2 Filtros avançados (componente reutilizável)
Período, colaborador, status, atrasos, faltas, inconsistências, extras, banco. Reaproveitado em Histórico, Dashboard, PDF e Excel.

### 2.3 Exportação Excel
Mesmas colunas do PDF + abas de totais por colaborador (usa `xlsx`).

### 2.4 Fluxo de Ajuste de Ponto
- Tabela `time_clock_adjustment_requests` (user_id, company_id, clock_date, motivo, comprovante_url, status, manager_id, manager_note, created_at, decided_at).
- Bucket privado `time-clock-attachments` com Signed URL 1h (segue padrão do projeto).
- Tela colaborador: solicitar ajuste, anexar comprovante, ver histórico.
- Tela gestor: aprovar/reprovar com observação; aprovação cria/edita batidas e dispara `recalc_user_day`.
- Notificação push reaproveitando sistema existente.

---

## FASE 3 — Auditoria, Fechamento e Validação Documental

### 3.1 Trava de fechamento de período
- Tabela `time_clock_closures` (company_id, period_month, closed_at, closed_by, reopened_at?, reopened_by?, reason).
- Após fechado: edições de batidas bloqueadas via RLS + trigger.
- Reabertura permitida para **Admin e Gestor** da empresa, com motivo obrigatório e log.

### 3.2 Log de Auditoria expandido
- `time_clock_logs` já existe — adicionar `change_reason`, `field_changed`, `previous_value`, `new_value` por campo.
- Tela "Histórico de Alterações" por dia (quem, quando, o quê, por quê).

### 3.3 Validação documental do PDF
- Hash SHA-256 do PDF gravado em `time_clock_pdf_validations` (hash, user_id, period, generated_by, generated_at).
- QRCode no rodapé apontando para `/validar-ponto/:hash` que confirma autenticidade.

### 3.4 Performance
- Índices: `(user_id, clock_date)`, `(company_id, clock_date)`, `(daily_status)`.
- Paginação server-side em Histórico e Dashboard via range queries.

---

## Detalhes Técnicos

**Stack mantida**: React + TS + Tailwind + shadcn + Supabase. Sem novas libs além de `jspdf`, `jspdf-autotable`, `xlsx`, `qrcode` (todas leves).

**Timezone**: Tudo persistido em `America/Sao_Paulo` usando `date-fns-tz`. Cálculos sempre em minutos desde 00:00 local; nunca `new Date(string)` sem normalizar.

**Reprocessamento silencioso de histórico**: migração roda `SELECT recalc_user_day(user_id, clock_date) FROM (SELECT DISTINCT user_id, clock_date FROM time_clocks) t;` em background — popula `time_clock_day_summary` sem alterar batidas originais.

**RLS**: 
- Colaborador vê só seus dias e ajustes.
- Gestor vê company_id (via `has_role_safe` + `user_companies`).
- Admin vê tudo.
- Edição bloqueada em períodos com `time_clock_closures` ativo (sem `reopened_at`).

**Arquivos principais a criar/alterar**:
```text
src/components/TimeClock/
  ├─ index.tsx                     (nova aba "RH")
  ├─ engine/
  │   ├─ validation.ts             (motor inconsistências)
  │   ├─ calculations.ts           (cálculo refatorado)
  │   └─ statusBadges.tsx
  ├─ pdf/
  │   ├─ TimeClockPDF.tsx          (reescrito, jsPDF + Roboto)
  │   └─ pdfHelpers.ts
  ├─ excel/ExportTimeClockExcel.ts
  ├─ HRDashboard.tsx               (Fase 2)
  ├─ AdjustmentRequest.tsx         (Fase 2)
  ├─ AdjustmentReview.tsx          (Fase 2)
  ├─ ClosurePanel.tsx              (Fase 3)
  └─ AuditTrail.tsx                (Fase 3)
supabase/migrations/               (3 migrações, uma por fase)
```

---

## Resultado Esperado
Módulo confiável juridicamente, com cálculos auditáveis, PDF oficial sem encoding quebrado, dashboard de RH e fluxo completo de ajuste/fechamento — pronto para uso empresarial real.

Posso começar pela **Fase 1** assim que aprovar.
