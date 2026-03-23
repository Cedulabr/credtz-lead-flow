

## PortFlow — Filtrar Banco Proponente (apenas BRB EASSYN e AGIBANK EASYN)

### Problema

No PortFlow, o select "Banco Proponente" mostra todos os bancos cadastrados. Deveria mostrar apenas **BRB EASSYN** e **AGIBANK EASYN**.

### Mudanças

| Arquivo | Acao |
|---|---|
| `src/modules/sales-wizard/types.ts` | Adicionar `moduloOrigem?: string` ao `WizardStepProps` |
| `src/modules/sales-wizard/SalesWizard.tsx` | Passar `moduloOrigem` como prop para `PortabilidadeStep` |
| `src/modules/sales-wizard/components/PortabilidadeStep.tsx` | Receber `moduloOrigem`, filtrar bancos para mostrar apenas os que contêm "BRB" ou "AGIBANK" quando `moduloOrigem === 'portflow'` |

### Detalhes

**PortabilidadeStep** receberá `moduloOrigem` via props. Quando for `portflow`, filtra a lista de bancos:

```typescript
const filteredBanks = moduloOrigem === 'portflow'
  ? banks.filter(b => 
      b.name.toUpperCase().includes('BRB') || 
      b.name.toUpperCase().includes('AGIBANK')
    )
  : banks;
```

O select renderiza `filteredBanks` em vez de `banks`. O restante do comportamento permanece idêntico.

