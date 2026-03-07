

## Plano: Migrar frontend para arrays `telefones` e `contratos` da API

### Contexto

A Edge Function (`baseoff-external-query`) ja agrupa contratos em array `contratos[]` e mapeia telefones individualmente (`tel_cel_1`, `tel_cel_2`, etc.). O backend foi atualizado para retornar tambem um array `telefones: string[]`. O frontend ainda depende dos campos individuais `tel_cel_1/2/3` e `tel_fixo_1/2/3`, e o tipo `BaseOffInlineContract` tem campos que nao correspondem ao formato simplificado da API (`valor_parcela` ao inves de `vl_parcela`).

### Alteracoes

**1. `src/modules/baseoff/types.ts`**
- Adicionar `telefones?: string[]` ao `BaseOffClient`
- Atualizar `BaseOffInlineContract` para aceitar ambos os formatos: `valor_parcela | vl_parcela`, `prazo` como string ou number (API retorna string)
- Manter campos `tel_cel_*` e `tel_fixo_*` como opcionais para retrocompatibilidade

**2. `src/modules/baseoff/views/ClienteDetalheView.tsx`**
- Construir lista de telefones a partir de `client.telefones?.map()` quando disponivel, com fallback para campos individuais
- Usar `client.contratos` diretamente: normalizar `valor_parcela` → `vl_parcela` no mapeamento `inlineToContract`
- Contagem de contratos: `client.contratos?.length`

**3. `src/modules/baseoff/components/ClienteCard.tsx`**
- Telefone: `client.telefones?.[0] || client.tel_cel_1 || client.tel_fixo_1`
- Contratos: `client.contratos?.length || client.total_contracts || 0`

**4. `src/modules/baseoff/hooks/useOptimizedSearch.ts`**
- Garantir que `total_contracts` use `row.contratos?.length` como fonte primaria

**5. `src/modules/baseoff/components/TelefoneHotPanel.tsx`**
- Nenhuma mudanca na interface do componente (ele ja recebe array de objetos)
- A mudanca e em quem o chama (ClienteDetalheView)

**6. `src/modules/baseoff/views/ClienteDetalheView.tsx` - normalizacao de contrato**
- Atualizar `inlineToContract` para mapear `valor_parcela` → `vl_parcela` e converter `prazo` string para number

### Resumo

| Arquivo | Acao |
|---|---|
| `types.ts` | Adicionar `telefones?: string[]`, flexibilizar campos do contrato inline |
| `ClienteDetalheView.tsx` | Usar `telefones` array, normalizar `valor_parcela` |
| `ClienteCard.tsx` | Usar `telefones?.[0]` e `contratos?.length` |
| `useOptimizedSearch.ts` | `total_contracts` de `contratos?.length` |

Nenhuma migracao SQL. Nenhuma mudanca na Edge Function.

