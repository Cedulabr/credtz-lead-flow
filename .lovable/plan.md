

## Unificar Propostas por Produto — WhatsApp e PDF

### Problema
Cada contrato é listado individualmente com produto + banco, gerando texto repetitivo. O usuário quer agrupar contratos do mesmo produto sob um único cabeçalho.

### Formato Desejado

**Antes:**
```
🔄 1. Portabilidade
   🏦 Banco: Safra
   💵 Parcela: R$ 200,00
   💰 Troco: R$ 1.500,00

🔄 2. Portabilidade
   🏦 Banco: Facta
   💵 Parcela: R$ 100,00
   💰 Troco: R$ 1.300,00
```

**Depois:**
```
🔄 1. Portabilidade

   💵 Parcela: R$ 200,00
   💰 Troco: R$ 1.500,00

   💵 Parcela: R$ 100,00
   💰 Troco: R$ 1.300,00
```

### Alterações em `src/components/ProposalGenerator.tsx`

**1. Helper para agrupar contratos por produto:**
```typescript
const groupContractsByProduct = (contracts: Contract[]) => {
  const groups: Record<string, Contract[]> = {};
  contracts.forEach(c => {
    if (!groups[c.product]) groups[c.product] = [];
    groups[c.product].push(c);
  });
  return Object.entries(groups);
};
```

**2. `generateProposalText()` (linhas 551-595):**
Em vez de iterar contrato a contrato, iterar por grupo de produto. Cada grupo tem um cabeçalho numerado com emoji+label, seguido dos contratos daquele grupo listando apenas parcela e troco (sem banco).

**3. `generatePDF()` (linhas 669-786):**
Mesma lógica de agrupamento. Um card/header por produto, com sub-itens para cada contrato mostrando parcela e troco.

**4. Summary step — lista de contratos (linhas 970-991):**
Agrupar visualmente os cards por produto no resumo da proposta gerada.

### Arquivo

| Arquivo | Ação |
|---|---|
| `src/components/ProposalGenerator.tsx` | Agrupar contratos por produto no texto WhatsApp, PDF e resumo |

