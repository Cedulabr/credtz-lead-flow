## Melhorias no Módulo Controle de Ponto — Iteração 2

Baseado no feedback da última auditoria (nota 8/10), as correções restantes são:

---

### 1. UTF-8 ponta-a-ponta no PDF

**Problema:** Mesmo após sanitização, fonte padrão do jsPDF (Helvetica) é WinAnsi — não suporta Unicode pleno, causando glitches em acentos e símbolos.

**Correção em `TimeClockPDF.tsx`:**
- Embutir fonte Unicode (Inter ou Roboto) via `doc.addFileToVFS` + `doc.addFont` (TTF base64).
- Definir `doc.setFont('Inter')` global.
- Forçar `doc.setLanguage('pt-BR')` e metadados `Producer/Creator` em UTF-8.
- Header HTTP do download: `application/pdf; charset=utf-8`.

### 2. Modo de Desconto configurável (eliminar punição dupla)

**Problema:** Hoje o sistema desconta falta em dinheiro **e** joga banco negativo — punição dupla.

**Correção:**
- Nova coluna em `hour_bank_settings`: `discount_mode` enum (`financeiro`, `banco`, `misto`), default `financeiro`.
- UI em `HourBankSettings.tsx`: RadioGroup com 3 opções e descrição de cada modo.
- `DiscountCalculator.tsx` e `TimeClockPDF.tsx` consultam `discount_mode`:
  - **financeiro:** desconta faltas/atrasos em R$, banco ignora faltas (só conta extras/compensações voluntárias).
  - **banco:** zera desconto financeiro de faltas/atrasos, joga tudo no banco negativo (compensável).
  - **misto:** atrasos no banco, faltas no financeiro.
- Engine `timeClockEngine.ts` recebe `discountMode` e ajusta `bankBalanceMinutes` em `falta` conforme modo.

### 3. Status granulares (substituir "Observação" genérico)

**Correção em `timeClockEngine.ts`:**
- Substituir status único `observacao` por sub-tipos via novo campo `subStatus`:
  - `atraso_leve` (≤ 15 min)
  - `atraso_critico` (> 15 min)
  - `saida_antecipada`
  - `saida_antecipada_grave` (> 50% jornada não cumprida — caso 20/04)
  - `jornada_incompleta`
  - `registro_incompleto`
  - `banco_positivo`
  - `hora_extra`
- `dayStatusLabels` e `dayStatusColor` ganham entradas para cada subtipo.
- PDF e UI (`MyTimeClock`, `HRDashboard`) exibem o subtipo no lugar de "Observação".

### 4. Validação em tempo real ao adicionar/editar registros

**Correção:**
- Nos componentes de marcação (`AdjustmentRequest.tsx`, modal de marcação manual): rodar `evaluateDay` no onChange e mostrar **alerta contextual abaixo do form**:
  - "⚠️ Esta marcação resultará em desconto de R$ X (atraso de Y min)"
  - "⛔ Sem saída registrada — dia ficará pendente e bloqueará fechamento"
- Banner amarelo persistente no `HRDashboard` listando os dias do mês corrente que **causarão desconto**, com link direto para resolução.

### 5. Reforço no `ClosurePanel`

- Hoje bloqueia `pendente_ajuste`. Adicionar:
  - Bloquear também `registro_incompleto` e `saida_antecipada_grave` sem justificativa.
  - Tabela preview pré-fechamento mostrando: dia, sub-status, minutos, valor a descontar, ação requerida.
  - Botão "Notificar colaborador" envia push/email ao usuário com lista de pendências.

### 6. Caso 20/04 (saída antecipada grave)

Coberto pela mudança 3 — `subStatus: 'saida_antecipada_grave'` quando `workedMinutes < expectedMinutes * 0.5`. Cor laranja distinta de saída antecipada normal.

---

### Arquivos a alterar

```text
supabase/migrations/<new>.sql        (discount_mode enum + coluna)
src/lib/timeClockEngine.ts           (subStatus + lógica modo desconto)
src/components/TimeClock/
  HourBankSettings.tsx               (RadioGroup modo desconto)
  DiscountCalculator.tsx             (consume modo)
  TimeClockPDF.tsx                   (fonte Unicode + modo + subStatus)
  ClosurePanel.tsx                   (bloqueios extras + preview)
  HRDashboard.tsx                    (banner riscos)
  AdjustmentRequest.tsx              (validação live)
  MyTimeClock.tsx (se existir)       (subStatus na UI)
```

### Validação esperada

- PDF abre em qualquer leitor sem mojibake (testar Adobe + Chrome + macOS Preview).
- Configurando "modo financeiro": Alana/Abr — banco final = 0 para faltas; desconto = R$ 316; sem dupla penalidade.
- Configurando "modo banco": desconto faltas = R$ 0; banco = -36h; alertas claros.
- 20/04 mostra "Saída Antecipada Grave" laranja, não "Observação".
- Tentar fechar Abril com 28/04 pendente → diálogo lista exatamente o problema + valor de desconto.
- Editar marcação ao vivo dispara aviso em <300ms.

Posso seguir com a migration de `discount_mode` e implementar?