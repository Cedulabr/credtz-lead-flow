

## Adicionar Seleção de Base de Cálculo no Dialog "Lançar Comissão"

### Problema

Hoje o dialog de lançamento calcula a comissão sempre sobre o valor definido pela `commission_rule` (parcela ou saldo_devedor). O admin precisa poder escolher manualmente sobre qual valor base calcular: **Parcela**, **Saldo Devedor**, **Valor Bruto (troco)** ou **Valor Líquido**.

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/components/admin/CommissionPayment.tsx` | Adicionar state `commissionBase` com opções parcela/saldo_devedor/bruto/liquido; renderizar Select no dialog; usar o valor selecionado no cálculo |

### Detalhes

**1. Novo state + opções de base**

```typescript
const [commissionBase, setCommissionBase] = useState<'parcela' | 'saldo_devedor' | 'bruto' | 'liquido'>('parcela');
```

Opções:
- **Parcela**: `proposal.parcela`
- **Saldo Devedor**: `proposal.saldo_devedor`
- **Bruto (Troco)**: `proposal.troco` (já existe no PaidProposal)
- **Líquido**: `parcela - (saldo_devedor ou 0)` — diferença entre parcela e saldo devedor

**2. Atualizar `getDialogCommissionValues`**

Em vez de usar `calc.baseValue` fixo, calcula o `baseValue` conforme `commissionBase`:

```typescript
let baseValue = selectedProposal.parcela;
if (commissionBase === 'saldo_devedor') baseValue = selectedProposal.saldo_devedor || 0;
else if (commissionBase === 'bruto') baseValue = selectedProposal.troco || selectedProposal.parcela;
else if (commissionBase === 'liquido') baseValue = selectedProposal.parcela - (selectedProposal.saldo_devedor || 0);
```

**3. Atualizar `openDialog`**

Pré-selecionar a base conforme a `commission_rule` encontrada (se `calculation_model === 'saldo_devedor'` → seleciona saldo_devedor, senão parcela).

**4. UI no dialog**

Adicionar Select "Base de cálculo" entre a info da proposta e o tipo de comissão, com as 4 opções. O preview mostrará "X% sobre R$ Y (Parcela)" com o nome da base selecionada.

