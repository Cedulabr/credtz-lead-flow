

## Plano: Corrigir campos faltantes e redesenhar Simulador de Troco + ClienteHeader

### Problemas identificados

1. **`valor_emprestimo` nao mapeado**: A API retorna `valor_emprestimo` mas o tipo `BaseOffInlineContract` so tem `vl_emprestimo`. O `inlineToContract` nunca encontra o campo, entao Valor Emprestimo aparece como "---".

2. **Datas no formato BR nao parseadas**: `formatDate()` usa `parseISO()` que espera "2021-09-07", mas a API retorna "07/09/2021". Todas as datas (nascimento, averbacao, inicio desconto) ficam "---".

3. **`calculateAge` quebrado**: Usa `new Date("26/01/1949")` que retorna Invalid Date.

4. **TrocoCalculator com slider**: Precisa ser redesenhado com tabela de taxas fixas (1.85%, 1.80%, 1.75%, 1.70%, 1.65%), campo para taxa customizada, e desconto de IOF no calculo.

5. **ClienteHeader pesado**: Precisa de layout mais leve com nome, CPF e NB lado a lado para facilitar copiar/colar.

### Alteracoes

**1. `src/modules/baseoff/types.ts`**
- Adicionar `valor_emprestimo?: number | string | null` ao `BaseOffInlineContract`

**2. `src/modules/baseoff/utils.ts`**
- Atualizar `formatDate()` para detectar e parsear datas no formato "dd/MM/yyyy" (formato brasileiro que a API retorna)
- Criar funcao auxiliar `parseBRDate()` para reutilizar

**3. `src/modules/baseoff/views/ClienteDetalheView.tsx`**
- No `inlineToContract`: mapear `valor_emprestimo` → `vl_emprestimo` (prioridade: `valor_emprestimo || vl_emprestimo`)
- Corrigir `calculateAge` para usar parser de data BR

**4. `src/modules/baseoff/components/ClienteHeader.tsx`** - Redesign
- Nome, CPF e NB em uma linha horizontal com botoes de copiar cada um
- Remover avatar grande, tornar mais compacto
- Manter 3 secoes (Dados Pessoais/Beneficio, Dados Bancarios, Endereco)
- Layout mais leve sem gradiente pesado

**5. `src/modules/baseoff/components/TrocoCalculator.tsx`** - Redesign completo
- Remover slider de taxa
- Criar tabela com colunas para cada taxa fixa: 1.85%, 1.80%, 1.75%, 1.70%, 1.65%
- Cada coluna mostra: Parcela, Saldo Devedor, Prazo, Vl. Contrato Novo, Vl. Liquido (troco)
- Campo para adicionar taxa customizada (adiciona nova coluna na tabela)
- Selecao de banco e prazo no topo
- Calcular IOF (~1.5% + 0.0082% ao dia, simplificado como ~3% do valor financiado) e descontar do troco
- Layout inspirado na imagem enviada: header com dados do contrato, tabela abaixo com simulacoes por taxa

**6. `src/modules/baseoff/components/ContratoCard.tsx`**
- Nenhuma mudanca estrutural - so vai funcionar apos fix do mapeamento

### Resumo

| Arquivo | Acao |
|---|---|
| `types.ts` | Adicionar `valor_emprestimo` ao inline contract |
| `utils.ts` | Parsear datas "dd/MM/yyyy" da API |
| `ClienteDetalheView.tsx` | Fix mapeamento valor_emprestimo, fix calculateAge |
| `ClienteHeader.tsx` | Redesign leve com nome+cpf+nb inline |
| `TrocoCalculator.tsx` | Redesign com tabela de taxas fixas + IOF |

