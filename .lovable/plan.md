

## Plano: Configuração do Simulador em 3 Blocos + Correção de Cálculos

### Problemas Identificados

1. **Refinanciamento com cálculo errado**: O código atual calcula `novaParcela = calcPMTDiario(saldo, taxa, prazo, dias)` e depois `valorContrato = calcPVDiario(novaParcela, ...)`. Isso é circular — PMT do saldo gera PV ≈ saldo, resultando em troco ≈ -IOF sempre. O correto é manter a parcela atual (como na portabilidade) e calcular o PV que essa parcela compra no novo prazo/taxa.

2. **Novo Empréstimo**: Lógica correta (usa margem livre como parcela e calcula PV com coeficiente diário). Já está usando `calcPVDiario`.

3. **NB no header**: O campo já está no `ClienteHeader` (linha 75), mas precisa garantir que aparece mesmo quando vazio, com label visível.

4. **Interface de configuração**: Formulário técnico denso, precisa virar 3 blocos visuais.

### Alterações

#### 1. `TrocoCalculator.tsx` — Correção do Refinanciamento (linhas 268-278)

Refinanciamento deve usar a mesma lógica da portabilidade: manter parcela atual e calcular o PV correspondente.

```typescript
// ANTES (errado - circular):
const novaParcela = calcPMTDiario(saldo, taxa, prazo, diasAtePrimeiraParcela);
const valorContrato = calcPVDiario(novaParcela, taxa, prazo, diasAtePrimeiraParcela);

// DEPOIS (correto - mantém parcela):
const novaParcela = totals.parcelaTotal;
const valorContrato = calcPVDiario(novaParcela, taxa, prazo, diasAtePrimeiraParcela);
```

Isso garante que tanto portabilidade quanto refinanciamento calculem o PV a partir da parcela existente, gerando troco real.

#### 2. `TrocoCalculator.tsx` — UI: 3 Blocos de Configuração

Substituir o Card único de parâmetros (linhas 425-556) por 3 cards organizados:

**Bloco 1 — Banco**: Card com nome do banco, taxa padrão em badge, botão "Alterar". Banco manager fica dentro.

**Bloco 2 — Condições da Operação**: Grid de 3 cards: Prazo (com ícone Calendar), Data Contratação, Primeiro Vencimento. Dias até 1ª parcela exibido como info auxiliar.

**Bloco 3 — Taxas da Simulação**: Lista visual de taxas ativas (badges), campo para adicionar taxa personalizada, recalculo automático ao mudar qualquer valor.

#### 3. `ClienteHeader.tsx` — NB sempre visível

Garantir que o chip NB aparece mesmo quando o valor está vazio, exibindo "N/I" como fallback para que o campo nunca fique oculto.

#### 4. `ProfessionalProposalPDF.tsx` — Cores neutras

Manter as cores neutras já definidas no `PDF_CONFIG` (preto puro para texto, branco para fundo, azul escuro para headings). Não alterar — já segue o padrão solicitado.

### Arquivos

| Arquivo | Ação |
|---|---|
| `TrocoCalculator.tsx` | Corrigir refinanciamento (usar parcelaTotal), redesign UI em 3 blocos |
| `ClienteHeader.tsx` | NB sempre visível com fallback "N/I" |

### Resultado

- Refinanciamento gera troco real (igual portabilidade)
- Novo empréstimo mantém lógica atual (já correta com coeficiente diário)
- Interface de configuração organizada em Banco / Condições / Taxas
- NB sempre visível no perfil do cliente

