## Diagnóstico

Você está certo: a matemática da folha está coerente, mas o **valor/hora** está saindo errado para colaboradores cuja jornada real é diferente de 8h/dia (estagiário 6h, meio período, etc.).

Fórmula atual (em `DiscountCalculator.tsx`, `payrollCalculations.ts` e `ClosurePanel.tsx`):

```text
valorHora = salário / (dailyHours × diasÚteis)
valorDia  = valorHora × dailyHours   →  = salário / diasÚteis
```

Observações:

- `valorDia` independe de `dailyHours` → por isso o desconto por **falta integral** (R$ 40/dia para 800/20) sai certo mesmo com jornada errada.
- `valorHora` **depende totalmente** de `dailyHours` → por isso o desconto de **horas negativas** sai errado quando a jornada cadastrada não bate com o contrato.

Origem do bug: em três pontos do código existe o fallback silencioso `daily_hours || 8`. Quando o colaborador não tem `time_clock_schedules` cadastrada, ou tem cadastrada com `daily_hours = 8` por engano, o sistema calcula `800 / (8×20) = R$ 5,00/h` em vez de `800 / (6×20) = R$ 6,67/h`. É exatamente o caso do espelho que você analisou.

Arquivos afetados:

- `src/lib/payrollCalculations.ts` — cálculo central da folha
- `src/components/TimeClock/DiscountCalculator.tsx` — tela "Calculadora de Descontos"
- `src/components/TimeClock/Reports.tsx` — relatórios (`s.daily_hours || 8`)
- `src/components/TimeClock/ClosurePanel.tsx` — pré-validação ao fechar período
- `src/components/TimeClock/TimeClockPDF.tsx` — espelho de ponto em PDF

## O que vou corrigir

### 1. Acabar com o fallback silencioso de 8h

Trocar `schedule?.daily_hours || 8` por leitura **estrita** da jornada cadastrada. Se o colaborador não tiver `time_clock_schedules` ativa:

- Não calcular desconto de horas negativas para essa linha.
- Marcar a linha com badge **"Jornada não configurada"** em amarelo.
- Bloquear export de PDF/Excel até resolver (ou exportar com aviso explícito).

Isso impede que qualquer colaborador volte a ser calculado com 8h fictícias.

### 2. Expor a base de cálculo na folha

Adicionar na linha do colaborador (e no PDF) três campos visíveis:

- **Jornada contratual** (ex.: 6h/dia)
- **Carga mensal** (`dailyHours × diasÚteis`, ex.: 120h)
- **Valor/hora** (ex.: R$ 6,67)

Hoje esses números ficam implícitos — basta um deles estar errado para a folha inteira sair distorcida sem ninguém perceber. Mostrar na UI evita reincidência.

### 3. Atalho de correção rápida

Ao detectar uma jornada divergente (ou ausente), incluir um botão **"Editar jornada"** que abre o `ScheduleManager` já filtrado naquele colaborador, com o campo `daily_hours` em destaque.

### 4. Centralizar a fórmula

Hoje o cálculo `valorHora / valorDia` está duplicado em 2 lugares (`payrollCalculations.ts` e `DiscountCalculator.tsx`). Vou extrair para uma função única em `src/lib/payrollCalculations.ts`:

```ts
export function computeRates(salary: number, dailyHours: number | null, businessDays: number) {
  if (!salary || !dailyHours || !businessDays) {
    return { valorHora: 0, valorDia: 0, monthlyHours: 0, configured: false };
  }
  const monthlyHours = dailyHours * businessDays;
  const valorHora = salary / monthlyHours;
  const valorDia = valorHora * dailyHours;
  return { valorHora, valorDia, monthlyHours, configured: true };
}
```

Toda a UI/PDF passa a chamar essa função — qualquer ajuste futuro é em um lugar só.

### 5. Auditoria de dados (one-shot)

Não vou alterar dados sem confirmação, mas vou disponibilizar uma query de diagnóstico para você rodar e identificar quem está com jornada divergente:

```sql
-- Colaboradores ativos sem jornada configurada
select p.id, p.name, p.email
from profiles p
left join time_clock_schedules s on s.user_id = p.id and s.is_active
where p.is_active and s.id is null;

-- Colaboradores com daily_hours = 8 mas salário compatível com 6h (suspeita de estagiário)
select p.name, s.daily_hours, p.salary
from profiles p
join time_clock_schedules s on s.user_id = p.id and s.is_active
where s.daily_hours = 8 and p.salary <= 1200;
```

## Fora de escopo

- Não vou mudar a fórmula em si (`salário / (jornada × diasÚteis)`) — ela é a padrão CLT e está matematicamente correta.
- Não vou mexer em CHECK constraints ou triggers do banco.
- Não vou alterar `daily_hours` de nenhum colaborador automaticamente — apenas evidenciar o problema.

## Resultado esperado

Depois da correção, no exemplo do estagiário:

- Sistema detecta `daily_hours = 8` (ou ausente) e mostra alerta **antes** de calcular.
- Após você ajustar para 6h no `ScheduleManager`, a folha recalcula:
  - Carga mensal: 120h
  - Valor/hora: R$ 6,67
  - Desconto 23h29min: ≈ R$ 156,60 (em vez de R$ 117,42)
  - Líquido estimado: R$ 363,40

E o mesmo passa a valer para todos os funcionários — qualquer jornada errada fica visível na hora.
