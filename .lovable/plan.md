
# Correções no Módulo Controle de Ponto

Análise do PDF `espelho-ponto-2026-04` revelou 5 categorias de erros. Todos são de **lógica/apresentação** (frontend), centradas em `src/lib/timeClockEngine.ts`, `src/components/TimeClock/DiscountCalculator.tsx` e `src/components/TimeClock/TimeClockPDF.tsx`.

---

## 1. Feriados gerando falta e banco negativo

**Bug:** Em `timeClockEngine.ts` linha 154, quando não há registros e o dia é útil, retorna `falta` com `bankBalanceMinutes = -expectedMinutes`. Mas a checagem de `isHoliday` (linha 152) só dispara quando a flag é `true`, e mesmo assim — o erro real é que `expectedMinutes` (linha 134) já foi correto a 0 em feriado, mas no PDF aparece `-06:00` no banco do feriado, indicando que o flag `isHoliday` **não está chegando para 03/04 e 21/04**.

**Causa:** A consulta `brazilian_holidays` busca por `holiday_date` exato. Provavelmente esses feriados não existem na tabela (ou são feriados estaduais/municipais). Mesmo assim, o engine deve **nunca** descontar banco em dia sem registro se for feriado/folga.

**Correção:**
- Garantir em `evaluateDay`: se `isHoliday=true` OU `!isWorkDay`, **nunca** retornar `bankBalanceMinutes` negativo.
- Tratar `time_clock_day_offs` com `off_type='feriado'` como feriado também (passar `isHoliday=true` para o engine quando o tipo for feriado).
- No `DiscountCalculator`, ao calcular `expectedMinutes`, subtrair feriados (já busca `dayOffs` mas falta integrar `brazilian_holidays`).

## 2. Dia incompleto (28/04) marcado como OK

**Bug:** Em `timeClockEngine.ts` linha 189, a condição `entries.length === 1 && exits.length === 1` falha quando só há entrada. Cai no `else` (linha 237+) onde `delayMinutes=0, earlyExitMinutes=0, incons=[]` → status vira `ok` (linha 242).

**Correção:** Adicionar inconsistência `ENTRADA_SEM_SAIDA` (severity high) quando `entries.length >= 1 && exits.length === 0` em dia útil já passado. Status vira `pendente_ajuste`. Bloquear esse dia no fechamento.

## 3. Desconto salarial absurdamente baixo

**Bug:** No `TimeClockPDF.tsx` linha 324:
```ts
const desconto = (summary.delay + summary.earlyExit) * perMin;
```
Só desconta atrasos + saídas antecipadas. **Ignora faltas inteiras**. Por isso o líquido ficou em R$ 1.141 (real ≈ R$ 883).

**Correção:** Reescrever fórmula de desconto consolidada (igual ao `DiscountCalculator`):
```
valor_hora    = base_salary / (daily_hours * dias_uteis_mes)  // ou /220 mantendo CLT
valor_dia     = valor_hora * daily_hours
desconto_faltas       = absences * valor_dia
desconto_atraso       = (delay + earlyExit) / 60 * valor_hora
desconto_pendentes    = pending * valor_dia   // dias bloqueados também descontam
desconto_total        = soma
liquido               = base - desconto_total
```
Com 6h/dia e 132h/mês: hora ≈ R$ 9,09 ✓ alinhado ao cálculo manual do usuário.

Aplicar **a mesma fórmula** em `DiscountCalculator.tsx` (linhas 168-174 hoje usam 176h e 22 dias fixos — trocar por `daily_hours * 22` dinâmico do schedule, e descontar pendentes).

## 4. Encoding quebrado (`#ó` e `#ó d e l a y`)

**Causa:** Vem do campo `notes` no banco (registros antigos com mojibake). O `safe()` em `TimeClockPDF.tsx:38` faz NFC + remove controle, mas mantém caracteres Unicode "soltos".

**Correção:** Em `safe()`:
- Remover replacement char `\uFFFD` e zero-width spaces.
- Se a string contiver sequência tipo `^[#\p{L}]\s\p{L}\s\p{L}` (letras separadas por espaço único), descartar como ruído.
- Truncar `obs` a caracteres ASCII + acentos latinos válidos.

## 5. Validações antes do fechamento

Adicionar checagem em `ClosurePanel.tsx`: bloquear fechamento do mês se houver dias com status `pendente_ajuste` (entradas sem saída, inconsistências altas). Mostrar lista dos dias problema.

---

## Arquivos a alterar

1. **`src/lib/timeClockEngine.ts`**
   - Adicionar code `ENTRADA_SEM_SAIDA` e `SAIDA_SEM_ENTRADA` (já existe) ao bloco que muda status para `pendente_ajuste`.
   - Garantir `bankBalanceMinutes = 0` para `feriado` e `folga` sempre.
   - Quando há entrada mas falta saída em dia útil passado → push inconsistência high → `pendente_ajuste`.

2. **`src/components/TimeClock/TimeClockPDF.tsx`**
   - Buscar `time_clock_day_offs.off_type='feriado'` e fundir no `holidaySet`.
   - Reescrever bloco de Desconto (linhas 320-333) para incluir faltas + pendentes + valor_hora dinâmico.
   - Endurecer `safe()` contra mojibake.
   - Mostrar coluna "Desc. Faltas" no totalizador.

3. **`src/components/TimeClock/DiscountCalculator.tsx`**
   - Trocar `salary/176` e `salary/22` por valores dinâmicos baseados em `schedule.daily_hours` e dias úteis do mês menos feriados/folgas.
   - Considerar `pendente_ajuste` (dias bloqueados) como desconto se não justificados.
   - Buscar `brazilian_holidays` e excluir do `expectedMinutes`.

4. **`src/components/TimeClock/ClosurePanel.tsx`**
   - Antes de fechar, listar dias `pendente_ajuste` do período. Bloquear fechamento ou exigir confirmação explícita.

## Validação

Após implementar, regenerar PDF do mesmo período (Alana / Abril 2026) e verificar:
- Faltas reais = 4 (não 6) — feriados 03/04 e 21/04 com status `Feriado`, banco 0.
- 28/04 com status `Pendente de Ajuste` (não OK).
- Desconto ≈ R$ 316, líquido ≈ R$ 884.
- Sem `#ó` nas observações.
- ClosurePanel impede fechar Abril enquanto 28/04 estiver pendente.

Posso seguir?
