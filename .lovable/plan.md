

## Plano: Corrigir Troco, Remover Total Pago, Melhorar Layout

### Problema Principal

O troco está sempre R$ 0,00 porque o cálculo atual é circular:
1. `novaParcela = calcPMT(saldo, taxa, prazo)` — calcula parcela pelo saldo
2. `valorContrato = calcPV(novaParcela, taxa, prazo)` — reconverte para PV = saldo original
3. `troco = saldo - saldo - IOF = -IOF` (negativo, mas `Math.max(0, ...)` zera)

**Correção para Portabilidade**: A parcela deve ser **preservada** (igual à parcela atual do cliente). O novo banco financia a mesma parcela a uma taxa menor, gerando um PV maior. O troco é a diferença:

```
novaParcela = parcelaAtual (preservada)
valorFinanciado = calcPV(parcelaAtual, novaTaxa, prazo)
troco = valorFinanciado - saldoDevedor - IOF
```

### Alterações em `TrocoCalculator.tsx`

**1. Corrigir lógica de portabilidade (linhas 208-222)**:
- `novaParcela = totals.parcelaTotal` (parcela atual preservada, não recalculada)
- `valorContrato = calcPV(novaParcela, taxa, prazo)` — agora gera valor real diferente do saldo
- `troco = valorContrato - saldo - iof` (sem Math.max, permitir negativo)

**2. Refinanciamento**: Manter cálculo atual (PMT pelo saldo) mas também permitir negativo no troco.

**3. Remover coluna "Total Pago"**: das tabelas de port/refin e novo empréstimo. Remover `totalPago` da interface `RateResult`.

**4. Troco negativo em vermelho**: Se `trocoLiquido < 0`, usar `text-red-600` em vez de `text-emerald-600`.

**5. Melhorar layout visual**:
- Tabela com bordas mais suaves, header com cores mais distintas
- Resultado de troco com destaque visual (fundo verde claro se positivo, fundo vermelho claro se negativo)
- Cards de resumo no topo com informações do contrato selecionado
- Espaçamento e tipografia melhorados
- Ícones coloridos nos headers das colunas

### Resumo

| Mudança | Detalhe |
|---|---|
| Parcela portabilidade | Preservar parcela atual do cliente |
| Troco | Permitir negativo, mostrar em vermelho |
| Total Pago | Remover coluna |
| Layout | Tabela mais limpa, cores de destaque no troco |

