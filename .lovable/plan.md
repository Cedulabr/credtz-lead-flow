

## Plano: Ajustes no Simulador Base OFF

### Problemas Identificados

1. **NB nao carrega**: A edge function (`baseoff-external-query`) faz `SELECT *` e acessa `row.nb`. Se a coluna no banco externo tiver nome diferente (ex: `numero_beneficio`, `NB` uppercase), o valor fica `null`. Preciso adicionar fallback no mapeamento da edge function para cobrir variações de nome de coluna. Tambem vou adicionar log para debug.

2. **Bloco "Taxas da Simulação"**: Remover completamente. As taxas de simulação devem ser derivadas dos bancos cadastrados — cada banco tem sua `default_rate`, e o simulador deve calcular para cada banco/taxa cadastrado.

3. **Header pequeno**: Aumentar tamanho dos chips CPF/NB e badges (fonte maior, padding maior), conforme imagem de referência.

4. **Melhor operação = maior taxa**: A lógica atual seleciona a simulação com maior troco. Para o vendedor, a maior comissão vem da maior taxa. Alterar `bestSimulation` para priorizar a maior taxa (desde que o troco seja positivo/viável).

### Alterações

#### 1. Edge Function — NB fallback (`baseoff-external-query/index.ts`)

Adicionar fallbacks na linha 89:
```ts
nb: row.nb || row.NB || row.numero_beneficio || row.num_beneficio || null,
```

#### 2. `TrocoCalculator.tsx` — Remover Taxas, usar bancos como taxas

- Remover `DEFAULT_RATES`, `customRates`, `newRate`, `handleAddRate`, `handleRemoveRate`
- `allRates` passa a ser `banks.map(b => b.default_rate)` — cada banco vira uma simulação
- Remover o Bloco 3 (Taxas da Simulação) inteiro da UI
- Nos ResultCards, exibir o nome do banco junto à taxa
- Atualizar `RateResult` para incluir `bancoNome: string`

#### 3. `TrocoCalculator.tsx` — Melhor operação = maior taxa viável

Alterar `bestSimulation` e `bestResult`:
```ts
// Filtrar apenas viáveis (troco > 0), depois pegar maior taxa
const viable = rateResults.filter(r => r.trocoLiquido > 0);
const best = viable.length > 0 
  ? viable.reduce((a, b) => a.taxa > b.taxa ? a : b)
  : null;
```

#### 4. `ClienteHeader.tsx` — Aumentar visual dos chips

- CopyChip: aumentar padding (`px-4 py-2`), fonte do valor (`text-base font-bold`), label (`text-sm`)
- Badges de banco/espécie/cidade: `text-sm py-1 px-3`
- Nome: `text-2xl`

### Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/functions/baseoff-external-query/index.ts` | Fallbacks para NB |
| `src/modules/baseoff/components/TrocoCalculator.tsx` | Remover taxas, usar bancos, melhor op = maior taxa |
| `src/modules/baseoff/components/ClienteHeader.tsx` | Aumentar tamanho visual |

