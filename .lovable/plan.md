

## Plano: Seção de Feriados Nacionais + Lançamento em Múltiplos Dias

### O que será construído

1. **Seção "Feriados Nacionais"** no DayOffManager — lista hardcoded dos feriados nacionais do Brasil para o ano selecionado. Cada feriado tem um checkbox para selecionar e um botão "Aplicar Selecionados" que lança como `feriado` para todos os colaboradores da empresa.

2. **Lançamento em múltiplos dias** — no modal de lançamento, trocar o campo de data única por dois campos (Data Início / Data Fim), permitindo lançar folga em um intervalo de datas de uma vez.

### Feriados Nacionais do Brasil (hardcoded, calculados por ano)

Feriados fixos:
- 01/01 — Confraternização Universal
- 21/04 — Tiradentes
- 01/05 — Dia do Trabalho
- 07/09 — Independência do Brasil
- 12/10 — Nossa Senhora Aparecida
- 02/11 — Finados
- 15/11 — Proclamação da República
- 25/12 — Natal

Feriados móveis (calculados via Páscoa):
- Carnaval (47 dias antes da Páscoa)
- Sexta-feira Santa (2 dias antes da Páscoa)
- Corpus Christi (60 dias após a Páscoa)

A Páscoa será calculada pelo algoritmo de Meeus/Jones/Butcher (client-side, sem API externa).

### Alterações no `DayOffManager.tsx`

**1. Seção de Feriados Nacionais** (novo Card abaixo do card principal):
- Selecionar o ano (extraído do mês selecionado)
- Tabela com todos os feriados: Data | Nome | Dia da Semana | Checkbox de seleção
- Feriados que já foram lançados na empresa aparecem com badge "Já lançado"
- Botão "Aplicar Feriados Selecionados" — lança para todos os colaboradores como `off_type: 'feriado'` com reason = nome do feriado

**2. Modal com intervalo de datas**:
- Trocar `modalDate` (campo único) por `modalDateStart` e `modalDateEnd`
- Quando `modalDateEnd` estiver preenchido e for diferente de `modalDateStart`, o sistema gera todas as datas entre início e fim
- No `handleSave`, iterar sobre todas as datas do intervalo e inserir um registro para cada dia
- Manter compatibilidade: se `modalDateEnd` estiver vazio, usa apenas `modalDateStart`

### Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/TimeClock/DayOffManager.tsx` | Adicionar seção de feriados, suporte a intervalo de datas no modal |

Nenhuma alteração de banco necessária — usa a tabela `time_clock_day_offs` existente.

### Detalhes de implementação

- Função `getBrazilianHolidays(year: number)` que retorna array `{ date: string, name: string }` com todos os feriados
- Função `getEasterDate(year: number)` implementando o algoritmo de Meeus para calcular a Páscoa
- `eachDayOfInterval` do `date-fns` para gerar as datas entre início e fim
- Para verificar "já lançado", comparar com os `dayOffs` carregados onde `off_type === 'feriado'`

