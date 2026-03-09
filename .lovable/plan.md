

## Correção: Front do Consulta Base OFF não carrega dados da API

### Causa Raiz

A API retorna dados com estrutura **aninhada** (`beneficios[]`), mas o hook `useOptimizedSearch` espera campos **flat**. Além disso, os nomes dos campos dos contratos diferem.

**Estrutura real da API:**
```json
{
  "cpf": "08861342426",
  "nome": "MARINA GOMES DE MELO",
  "dtnascimento": "15/01/1955",
  "beneficios": [{
    "nb": "7048597535",
    "esp": "88",
    "mr": "1518",
    "telefones": ["82991318083", ...],
    "contratos": [{ "banco": "237", "valor": "1800", "parcela": "273.31", ... }]
  }]
}
```

**O que o frontend espera:** `row.nb`, `row.mr`, `row.contratos`, `row.telefones` (campos flat no root)

**Campos de contrato divergentes:**
| API retorna | Frontend espera |
|---|---|
| `banco` | `banco_emprestimo` |
| `valor` | `vl_emprestimo` |
| `parcela` | `vl_parcela` |
| `situacao` | `situacao_emprestimo` |

### Correção (2 arquivos, sem tocar no edge function)

**1. `src/modules/baseoff/hooks/useOptimizedSearch.ts`**

Na transformação dos resultados (linha 86), antes de mapear os campos, achatar a estrutura `beneficios[0]` para o nível raiz:

```typescript
results.map((row: any) => {
  // Flatten beneficios[0] into root if present
  const beneficio = row.beneficios?.[0] || {};
  const flat = { ...row, ...beneficio };
  // Now use 'flat' instead of 'row' for all field mappings
  // Map contratos with correct field names
  const rawContratos = flat.contratos || [];
  const contratos = rawContratos.map(c => ({
    banco_emprestimo: c.banco_emprestimo || c.banco || '',
    contrato: c.contrato || '',
    vl_emprestimo: c.vl_emprestimo || c.valor_emprestimo || c.valor || null,
    vl_parcela: c.vl_parcela || c.valor_parcela || c.parcela || null,
    prazo: c.prazo || null,
    taxa: c.taxa || null,
    saldo: c.saldo || null,
    situacao_emprestimo: c.situacao_emprestimo || c.situacao || null,
    // keep other fields
    ...c,
  }));
  // Map telefones array to tel_cel_1/2/3
  const tels = flat.telefones || [];
  return {
    ...flat,
    nb: flat.nb || ...,
    mr: parseFloat(flat.mr) || 0,
    tel_cel_1: flat.tel_cel_1 || tels[0] || null,
    tel_cel_2: flat.tel_cel_2 || tels[1] || null,
    tel_cel_3: flat.tel_cel_3 || tels[2] || null,
    contratos,
    telefones: tels.filter(Boolean),
    ...
  };
});
```

**2. `src/modules/baseoff/views/ClienteDetalheView.tsx`**

Na função `inlineToContract` (linha 32), adicionar fallbacks para os novos nomes de campos:

```typescript
banco_emprestimo: inline.banco_emprestimo || inline.banco || '',
vl_emprestimo: Number(inline.valor_emprestimo || inline.vl_emprestimo || inline.valor) || null,
vl_parcela: Number(inline.valor_parcela || inline.vl_parcela || inline.parcela) || null,
situacao_emprestimo: inline.situacao_emprestimo || inline.situacao || null,
```

### Arquivos Modificados

| Arquivo | Ação |
|---|---|
| `src/modules/baseoff/hooks/useOptimizedSearch.ts` | Achatar `beneficios[]` + mapear nomes de campos de contratos |
| `src/modules/baseoff/views/ClienteDetalheView.tsx` | Adicionar fallbacks de nomes de campos em `inlineToContract` |

