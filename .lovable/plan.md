

## Plano: Corrigir Valor do Contrato para usar PV (Price) no Simulador

### Problema

Na linha 207 do `TrocoCalculator.tsx`, o cálculo atual é:
```
valorContrato = novaParcela * prazo  // ERRADO: isso é o total pago
```

O correto é calcular o **Valor Financiado (PV)** usando a fórmula Price:
```
PV = PMT × (1 - (1 + i)^-n) / i
```

Isso afeta diretamente o cálculo do troco:
```
Troco = Valor Financiado (PV) - Saldo Devedor - IOF
```

### Alterações

#### 1. `TrocoCalculator.tsx` — Corrigir cálculos e adicionar colunas

**Nova função `calcPV`:**
```ts
function calcPV(pmt: number, ratePct: number, n: number): number {
  const r = ratePct / 100;
  if (r === 0) return pmt * n;
  return pmt * (1 - Math.pow(1 + r, -n)) / r;
}
```

**Corrigir `rateResults` (linhas 200-213):**
- `valorContrato` (valor financiado) = `calcPV(novaParcela, taxa, prazo)` — o PV correto
- `totalPago` = `novaParcela * prazo` — novo campo separado
- `troco` = `valorContrato - saldoDevedor - iof`
- IOF calculado sobre o saldo devedor: `iof = saldo * IOF_PERCENT`

**Atualizar interface `RateResult`:**
- Adicionar campo `totalPago: number`

**Atualizar tabela de resultados (linhas 544-568):**
- Renomear coluna "Vl. Contrato" para "Vl. Financiado"
- Adicionar coluna "Total Pago"
- Troco = Vl. Financiado - Saldo Devedor - IOF

**Mesma correção para `novoEmprestimoResults`:**
- `valorContrato` já usa `calcPV` (PV inverso) — está correto
- Adicionar `totalPago = margemLivre * prazo`

#### 2. `ContratoCard.tsx` — Exibir Valor Financiado separado do Total Pago

No detalhe expandido do contrato, o campo "Valor Empréstimo" (`vl_emprestimo`) já representa o valor financiado original do banco. Manter como está — é o dado real da API.

Adicionar campo "Total Pago (estimado)" = `vl_parcela * prazo` como informação complementar nos detalhes expandidos.

### Resumo de arquivos

| Arquivo | Ação |
|---|---|
| `TrocoCalculator.tsx` | Adicionar `calcPV`, corrigir `valorContrato` para usar PV, adicionar coluna "Total Pago", corrigir fórmula do troco |

### Exemplo de validação

Parcela: 400, Taxa: 1.85%, Prazo: 96
- PV = 400 × (1 - (1.0185)^-96) / 0.0185 = ~R$ 17.900,90
- Total Pago = 400 × 96 = R$ 38.400,00
- Troco = PV - Saldo Devedor - IOF

