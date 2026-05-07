## Problema

Hoje a tabela `employee_salaries` guarda **um único salário ativo por colaborador**. Quando o colaborador recebe aumento, o `SalaryManager` faz `UPDATE` no registro atual, e tanto o `TimeClockPDF` (folha individual) quanto o `DiscountCalculator` (fechamento) leem `base_salary WHERE is_active=true`. Resultado: folhas antigas (jan, fev, mar...) passam a usar o salário novo, distorcendo descontos, banco de horas e PDFs históricos.

## Objetivo

Salário com **vigência por data**. Cada folha (mês de referência) deve usar o salário que estava vigente naquele período, não o atual.

## Mudanças

### 1. Banco de dados (migration)

Adicionar histórico vigente em `employee_salaries`:

- `effective_from date NOT NULL DEFAULT current_date` — início da vigência
- `effective_to date NULL` — fim da vigência (NULL = vigente)
- Remover unique antiga `(user_id, company_id)` e criar índice parcial:
  `UNIQUE (user_id, company_id) WHERE effective_to IS NULL` (garante 1 vigente por colaborador/empresa)
- Backfill: `UPDATE employee_salaries SET effective_from = COALESCE(effective_from, created_at::date)`

Função RPC `get_salary_at(p_user_id uuid, p_company_id uuid, p_date date)`:
- Retorna a linha de salário cuja vigência cobre `p_date` (`effective_from <= p_date AND (effective_to IS NULL OR effective_to >= p_date)`).
- `SECURITY DEFINER`, `search_path=public`, com checagem de role (admin/gestor da empresa ou próprio colaborador).

### 2. SalaryManager.tsx — registrar aumento sem perder histórico

Substituir o fluxo atual de "Editar" por dois fluxos distintos:

- **Corrigir salário atual** (ex.: erro de digitação) — `UPDATE` direto na linha vigente, sem criar histórico. Botão secundário "Corrigir valor".
- **Registrar aumento / mudança** — botão primário "Novo aumento":
  1. Pede `novo_salario`, `novo_cargo`, `data_vigencia` (default: 1º dia do mês seguinte).
  2. `UPDATE` na linha vigente: `effective_to = data_vigencia - 1 day`, `is_active = false`.
  3. `INSERT` nova linha com `effective_from = data_vigencia`, `is_active = true`.
  4. Tudo dentro de uma transação (RPC `register_salary_change`).

Adicionar aba/seção **"Histórico de salários"** no card de cada colaborador (drawer ou expand row) listando todas as vigências (`effective_from → effective_to`, salário, cargo, quem registrou).

### 3. DiscountCalculator.tsx — usar salário vigente no mês de referência

Em vez de buscar `is_active=true`, buscar para cada colaborador o salário cuja vigência cobre o `referenceMonth` (último dia do mês). Estratégia:

- Substituir o fetch único por chamada à nova RPC `get_salaries_at(p_user_ids uuid[], p_company_id uuid, p_date date)` que devolve um map `user_id → base_salary` para a data.
- Toda a matemática de `valor/hora`, descontos e banco passa a usar esse valor histórico.

### 4. TimeClockPDF.tsx — folha histórica fiel

Trocar o `select('*').eq('is_active', true)` por `get_salary_at(userId, companyId, lastDayOfReferenceMonth)`. Cabeçalho do PDF passa a exibir:

- "Salário base vigente em {mês/ano}: R$ X"
- Se houve mudança no mês, mostrar nota: "Salário alterado em DD/MM/AAAA: R$ antigo → R$ novo" (informativo).

Para o cálculo de descontos do PDF, usar o salário do **último dia do mês** (compatível com a folha do mês). Se quiser ser mais preciso por dia, podemos prorratear (fora do escopo agora — confirmar se quer).

### 5. types.ts (TimeClock)

Adicionar `effective_from`, `effective_to` à interface `SalaryRecord` no `SalaryManager` (não há tipo central exportado).

## Arquivos afetados

```text
supabase/migrations/<novo>.sql            (schema + RPCs)
src/components/TimeClock/SalaryManager.tsx (UI: aumento vs correção + histórico)
src/components/TimeClock/DiscountCalculator.tsx (RPC histórica)
src/components/TimeClock/TimeClockPDF.tsx  (RPC histórica + nota de mudança)
```

## Validação

1. Cadastrar João com R$ 1.500 em 01/01.
2. Registrar aumento para R$ 2.000 com vigência 01/04.
3. Gerar PDF de março → mostra R$ 1.500.
4. Gerar PDF de abril → mostra R$ 2.000.
5. `DiscountCalculator` para março calcula valor/hora sobre 1.500; abril sobre 2.000.
6. Histórico do colaborador exibe duas linhas com vigências corretas.

## Pergunta antes de implementar

No mês em que ocorre o aumento (ex.: aumento dia 15/04), você quer:

- (A) Usar o salário **do último dia do mês** para a folha inteira (mais simples, é o que a maioria dos SaaS faz quando o aumento vale "do mês"), ou
- (B) **Prorratear**: dias 1–14 com salário antigo, 15–30 com novo (mais justo, mais código).

Confirmando isso eu mando a migration para aprovação e sigo com o código.