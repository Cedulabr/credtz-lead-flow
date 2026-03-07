

## Plano: Gestao de Folgas, Calculadora de Descontos e Limpeza de Abas

### Problema atual

1. Nao existe forma de lancar **folgas, feriados ou licencas** - qualquer dia sem registro e tratado como falta
2. Nao existe **calculadora de descontos** que consolide horas negativas + faltas e calcule o valor monetario
3. A aba **"Controle"** (AdminControl) duplica grande parte da aba **"Painel"** (ManagerDashboard) - ambas mostram registros diarios, filtro de empresa/usuario e ajustes

### Alteracoes

#### 1. Criar tabela `time_clock_day_offs` (migracao SQL)

```text
Colunas:
- id uuid PK
- user_id uuid FK profiles
- company_id uuid nullable
- off_date date NOT NULL
- off_type: 'folga' | 'feriado' | 'licenca' | 'ferias' | 'abono'
- reason text nullable
- created_by uuid (quem lancou)
- created_at timestamp
```

RLS: gestores podem inserir/editar para usuarios da sua empresa, admins para todos.

#### 2. Novo componente `DayOffManager.tsx` - Substituir aba "Controle"

A aba "Controle" (AdminControl) sera substituida por **"Folgas"** com:
- Selecao de empresa e colaborador(es)
- Calendario visual onde clicar em um dia abre modal para lancar folga/feriado/ferias/licenca
- Lista de folgas lancadas com opcao de editar/excluir
- Botao "Lancar feriado para todos" (aplica a todos os colaboradores da empresa de uma vez)
- Tipos com cores: folga (azul), feriado (verde), licenca (roxo), ferias (laranja), abono (cinza)

#### 3. Novo componente `DiscountCalculator.tsx` - Nova aba ou substituir aba existente

Consolidar em uma tela de **"Descontos"** que substitui a aba "Relatórios" (que ja tem relatorios de atraso/falta):

- Seleciona mes e colaborador (ou todos)
- Calcula automaticamente:
  - **Horas negativas** (esperado - trabalhado, descontando folgas/feriados/ferias)
  - **Faltas injustificadas** (dias uteis sem registro e sem folga/justificativa aprovada)
  - **Valor desconto por hora negativa** = horas_negativas x (salario / 176)
  - **Valor desconto por falta** = faltas x (salario / 22)
  - **Total descontos**
  - **Liquido estimado** = salario - total_descontos
- Tabela por colaborador com todas essas colunas
- Botao exportar PDF/Excel

#### 4. Atualizar `HourBank.tsx`

Descontar dias de folga/feriado/ferias do calculo de "horas esperadas":
- Buscar `time_clock_day_offs` do usuario no periodo
- Subtrair esses dias do `workDayCount`

#### 5. Atualizar `TimeClockPDF.tsx`

Na geracao do espelho mensal, marcar dias com folga como "FOLGA", "FERIADO", "FERIAS" etc. ao inves de "FALTA".

#### 6. Reorganizar abas do modulo

De 10 abas para 8 (remover redundancias):

| Antes | Depois | Motivo |
|---|---|---|
| Ponto | Ponto | Mantido |
| Historico | Historico | Mantido |
| Justificativas | Justificativas | Mantido |
| Banco Horas | Banco Horas | Mantido (atualizado) |
| Painel | Painel | Mantido |
| **Relatorios** | **Descontos** | Substituido pela calculadora de descontos |
| Salarios | Salarios | Mantido |
| Jornadas | Jornadas | Mantido |
| **Controle** | **Folgas** | Substituido pelo gestor de folgas |
| Config | Config | Mantido |

A funcionalidade de ajuste manual de ponto do AdminControl sera movida para o Painel (ManagerDashboard) que ja tem acesso aos registros.

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar tabela `time_clock_day_offs` com RLS |
| `src/components/TimeClock/DayOffManager.tsx` | Novo componente para lancar folgas/feriados |
| `src/components/TimeClock/DiscountCalculator.tsx` | Novo componente calculadora de descontos |
| `src/components/TimeClock/index.tsx` | Reorganizar abas (Controle → Folgas, Relatorios → Descontos) |
| `src/components/TimeClock/HourBank.tsx` | Descontar folgas do calculo de horas esperadas |
| `src/components/TimeClock/TimeClockPDF.tsx` | Marcar folgas corretamente no PDF mensal |
| `src/components/TimeClock/ManagerDashboard.tsx` | Adicionar botao de ajuste manual (vindo do AdminControl) |

