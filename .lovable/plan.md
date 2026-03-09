

## Diagnostico: Modulo Consulta Base OFF

### O que foi encontrado

A edge function `baseoff-external-query` esta respondendo com status 200 e retornando dados validos para o CPF `89498674434` (cliente **MARIA CELIA SOARES**, ATIVO, Marechal Deodoro/AL).

Porem, a resposta da edge function vem em formato `{ cache: false, data: [...] }` com as **colunas brutas do banco** (`statusbeneficio`, `bancoemprestimo`, `vlparcela`), ao inves do formato transformado que o codigo da edge function deveria produzir (`status_beneficio`, `banco_emprestimo`, `vl_parcela`, `contratos[]`, `credit_opportunities{}`).

Isso indica que a **versao deployada da edge function e diferente** do codigo no repositorio. A versao deployada retorna os dados crus, enquanto o codigo no repo tem toda a logica de agrupamento por CPF e calculo de oportunidades de credito.

### O que o frontend espera vs o que recebe

| Campo | Frontend espera | API retorna |
|-------|----------------|-------------|
| Status | `status_beneficio` | `statusbeneficio` |
| Contratos | `contratos[]` (array agrupado) | Campos flat por row |
| Oportunidades | `credit_opportunities{}` | Nao existe |

O hook `useOptimizedSearch` ja trata o wrapper `{ data: [...] }` corretamente (linha 82), mas os nomes dos campos nao batem porque a edge function deployada nao faz a transformacao.

### Plano de correcao

1. **Redeployar a edge function** `baseoff-external-query` — o codigo no repositorio ja esta correto com toda a logica de agrupamento e transformacao. Basta fazer o redeploy para que a versao correta entre em producao.

2. **Adicionar fallback no `useOptimizedSearch`** — para resiliencia, o hook deve mapear tanto os nomes transformados (`status_beneficio`) quanto os nomes brutos (`statusbeneficio`), garantindo que funcione independente da versao da edge function.

### Arquivos modificados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/baseoff-external-query/index.ts` | Redeploy (sem alteracao no codigo) |
| `src/modules/baseoff/hooks/useOptimizedSearch.ts` | Adicionar fallback para nomes de campos brutos |

