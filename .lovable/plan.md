

## Plano: Expandir BaseOffClient com todos os 59 campos da API

### Problema

A interface `BaseOffClient` em `types.ts` tem apenas ~18 campos, mas a Edge Function ja retorna ~45+ campos do banco externo. O hook `useOptimizedSearch` descarta a maioria dos campos na transformacao (linhas 92-116), e os componentes `ClienteHeader` e `ClienteDetalheView` so exibem um subconjunto minimo.

### Alteracoes

**1. `src/modules/baseoff/types.ts`** - Expandir `BaseOffClient`

Adicionar todos os campos retornados pela Edge Function:
- Beneficio: `dib`, `ddb`, `bloqueio`, `pensao_alimenticia`, `representante`
- Bancarios: `agencia_pagto`, `orgao_pagador`, `conta_corrente`, `meio_pagto`
- RMC/RCC: `banco_rmc`, `valor_rmc`, `banco_rcc`, `valor_rcc`
- Endereco: `bairro`, `cep`, `endereco`, `logr_tipo_1`, `logr_titulo_1`, `logr_nome_1`, `logr_numero_1`, `logr_complemento_1`, `bairro_1`, `cidade_1`, `uf_1`, `cep_1`
- Contato extra: `tel_cel_3`, `tel_fixo_2`, `tel_fixo_3`, `email_2`, `email_3`
- Contratos inline: `contratos` array, `credit_opportunities` object

Adicionar interface `BaseOffCreditOpportunities` e `BaseOffInlineContract`.

Atualizar `BaseOffContract` para incluir campo `competencia`.

**2. `src/modules/baseoff/hooks/useOptimizedSearch.ts`** - Preservar todos os campos

Substituir o mapeamento manual (linhas 92-116) por spread do objeto da API (`...row`), mantendo apenas o calculo de `status`.

**3. `src/modules/baseoff/components/ClienteHeader.tsx`** - Exibir campos adicionais

Adicionar secoes:
- Dados do Beneficio: DIB, DDB, Bloqueio, Pensao Alimenticia, Representante
- Dados Bancarios completos: Agencia, Orgao Pagador, Conta Corrente, Meio Pagamento, Banco RMC/RCC, Valor RMC/RCC
- Endereco completo: Logradouro, Bairro, Cidade, UF, CEP (ambos enderecos)

Layout em 3 colunas no desktop.

**4. `src/modules/baseoff/views/ClienteDetalheView.tsx`** - Usar contratos inline

Quando `client.contratos` existir (vindo da API externa), usar diretamente ao inves de buscar de `baseoff_contracts`. Isso elimina a query vazia que retorna 0 contratos.

Atualizar `telefones` para incluir `tel_cel_3`, `tel_fixo_2`, `tel_fixo_3`.

**5. `src/modules/baseoff/components/MargemCards.tsx`** - Usar valor_rmc/valor_rcc

Passar `valor_rmc` e `valor_rcc` do client para os cards de Margem Cartao e Cartao Beneficio.

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `src/modules/baseoff/types.ts` | Expandir interfaces com todos os campos |
| `src/modules/baseoff/hooks/useOptimizedSearch.ts` | Spread completo dos dados da API |
| `src/modules/baseoff/components/ClienteHeader.tsx` | Exibir todos os dados em 3 colunas |
| `src/modules/baseoff/views/ClienteDetalheView.tsx` | Usar contratos inline, telefones extras |
| `src/modules/baseoff/components/MargemCards.tsx` | Integrar RMC/RCC do client |

Nenhuma migracao SQL necessaria. Nenhuma alteracao na Edge Function.

