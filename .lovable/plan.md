

## Plano: Atualizar BaseOffConsulta para consumir API externa

### Resumo

Substituir todas as consultas diretas ao Supabase (`baseoff_clients`, `baseoff_contracts`) no componente `BaseOffConsulta.tsx` pela chamada a `supabase.functions.invoke('baseoff-external-query')`, que ja existe e retorna clientes com contratos agrupados. O layout permanece inalterado.

### Alteracoes no arquivo `src/components/BaseOffConsulta.tsx`

**1. Interface `BaseOffClient` (linha 47-97)** -- Adicionar campo `contratos`:
- Adicionar `contratos?: BaseOffContract[]` ao tipo
- Manter todos os campos existentes (layout nao muda)

**2. Funcao `handleSearch` (linhas 265-332)** -- Substituir queries Supabase por chamada a Edge Function:
- Remover as 4 queries condicionais (`supabase.from("baseoff_clients")...`)
- Substituir por `supabase.functions.invoke('baseoff-external-query', { body: { search_term: searchTerm.trim() } })`
- Mapear resposta da API para o formato `BaseOffClient` com `contratos` embutido
- Quando a API retorna array, usar `data` diretamente como `searchResults`

**3. Funcao `selectClient` (linhas 373-381)** -- Remover fetch de contratos:
- Remover chamada a `fetchContractsForClient(client)`
- Usar `setContracts(client.contratos || [])` diretamente

**4. Remover `fetchContractsForClient` (linhas 337-371)** -- Funcao inteira removida, pois contratos vem da API.

**5. Remover queries Supabase do fluxo "Ativo" (linhas 227-260, 434-571)** -- As funcoes `fetchCidades`, `handleConfirmAtivo` consultam `baseoff_clients` e `baseoff_active_clients`. Estas dependem de tabelas locais do Supabase, entao serao mantidas como estao (nao fazem parte da busca principal).

**6. Remover funcoes de duplicatas (linhas 653-713)** -- `checkDuplicates` e `removeDuplicates` consultam `baseoff_clients` local. Manter como estao pois sao funcoes admin separadas.

**7. Ajustar ContractsBlock e SimulationBlock** -- Ja recebem `contractsList` como prop, nenhuma mudanca necessaria.

### Mapeamento de campos da API para o componente

| Campo API | Campo interface existente |
|---|---|
| `id` (= cpf) | `id` |
| `contratos[]` | novo campo `contratos` |
| `data_nascimento` | `data_nascimento` |
| `valor_rmc` / `valor_rcc` | `valor_rmc` / `valor_rcc` |
| `banco_rmc` / `banco_rcc` | `banco_rmc` / `banco_rcc` |
| `tel_cel_3` | `tel_cel_3` |
| Todos os demais | mapeamento direto (nomes iguais) |

### Edge Function

A Edge Function `baseoff-external-query` ja existe e retorna dados no formato correto. A unica diferenca e que o usuario menciona endpoint `baseoff-search` -- usaremos o nome existente `baseoff-external-query` que ja esta deployado e configurado.

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/components/BaseOffConsulta.tsx` | Substituir busca Supabase por `supabase.functions.invoke`, remover `fetchContractsForClient`, adicionar `contratos` a interface, usar contratos da API |

### O que NAO muda

- Layout, cards, simulacoes, telefones, abas -- tudo permanece identico
- Fluxo "Ativo" (usa tabelas locais Supabase)
- Funcoes admin de importacao e duplicatas
- Edge Function existente (ja esta correta)

