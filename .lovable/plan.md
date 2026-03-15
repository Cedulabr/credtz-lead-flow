

## Correção: Digitação de Contrato — 3 Problemas Identificados

### Diagnóstico

Analisei os logs da Edge Function, o código do wizard e a documentação da API. Encontrei 3 problemas distintos:

---

### Problema 1: Edge Function retorna 404 na listagem de tabelas

**Causa raiz**: A documentação da API JoinBank mostra que o endpoint `/loan-product-rules/search/basic` usa **Bearer Token** como autenticação (diferente dos outros endpoints que usam header `apikey`). O proxy está enviando apenas `apikey` para todos os endpoints.

Além disso, o método `supabase.auth.getClaims()` não existe no supabase-js v2 — deve ser `supabase.auth.getUser()`.

**Correção em `joinbank-proxy/index.ts`**:
- Trocar `getClaims` por `getUser()` para validação JWT
- Enviar o `JOINBANK_LOGIN_ID` como `Authorization: Bearer` para o endpoint de rules
- Adicionar headers CORS completos (incluindo headers de plataforma do Supabase)
- Adicionar log do response body no erro para debug

### Problema 2: Data de nascimento não carrega e não permite edição manual

**Causa raiz dupla**:
1. O campo `data_nascimento` vem do banco em formato `DD/MM/YYYY` (ex: "19/08/1965") mas o `<input type="date">` exige `YYYY-MM-DD`
2. Os campos `ddb`, `dib`, `esp`, `sexo`, `nome_mae` não estão sendo mapeados explicitamente no `useOptimizedSearch.ts` — dependem do spread `...flat` que pode ter nomes diferentes (ex: `dtnascimento`, `nomemae`)

**Correção em `useOptimizedSearch.ts`**: Adicionar mapeamento explícito para `ddb`, `dib`, `esp`, `sexo`, `nome_mae`

**Correção em `DigitacaoWizard.tsx`**: Converter datas recebidas (DD/MM/YYYY ou ISO) para formato YYYY-MM-DD antes de atribuir aos campos do formulário

### Problema 3: benefitStartDate usa campo errado

**Causa**: Linha 104 do wizard usa `client.dib` mas o campo correto é `client.ddb` (Data de Despacho do Benefício = Início do Benefício conforme o usuário indicou)

**Correção em `DigitacaoWizard.tsx`**: Trocar `client.dib` por `client.ddb || client.dib` com fallback

---

### Arquivos a Modificar

| Arquivo | Ação |
|---|---|
| `supabase/functions/joinbank-proxy/index.ts` | Corrigir auth (getUser), enviar Bearer Token para rules endpoint, melhorar CORS e logs |
| `src/modules/baseoff/hooks/useOptimizedSearch.ts` | Mapear explicitamente `ddb`, `dib`, `esp`, `sexo`, `nome_mae` |
| `src/modules/baseoff/components/DigitacaoWizard.tsx` | Converter formatos de data, usar `ddb` para benefitStartDate |

