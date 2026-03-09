

## Plano: Permissoes + Base OFF com PostgreSQL externo

### 1. Adicionar modulos novos em "Gerenciar Permissoes"

O array `PERMISSION_MODULES` em `UsersList.tsx` esta faltando 2 modulos que ja existem na navegacao:

| Modulo | Chave | Faltando |
|---|---|---|
| Comunicacao SMS | `can_access_sms` | Sim |
| WhatsApp | `can_access_whatsapp` | Sim |

**Correcao:** Adicionar essas 2 entradas ao array `PERMISSION_MODULES` (linha 66-84).

---

### 2. Conectar Base OFF ao PostgreSQL externo

O frontend nao consegue conectar diretamente a um PostgreSQL externo. A solucao e criar uma **Edge Function** que recebe o termo de busca, consulta o banco externo e retorna os resultados.

**Arquitetura:**

```text
Frontend (busca CPF/Nome)
    |
    v
Edge Function "baseoff-external-query"
    |  (usa pg driver do Deno)
    v
PostgreSQL 76.13.229.101:6432
    |
    v
Retorna clientes + contratos
```

**Passos:**
- **Armazenar credenciais como secrets** do Supabase (BASEOFF_PG_HOST, BASEOFF_PG_PORT, BASEOFF_PG_USER, BASEOFF_PG_PASSWORD, BASEOFF_PG_DATABASE) -- nunca no codigo
- **Criar edge function** `baseoff-external-query` que:
  - Recebe `search_term` (CPF, NB, telefone ou nome)
  - Conecta ao PG externo via `deno-postgres`
  - Busca na tabela de clientes + contratos associados
  - Retorna dados transformados com oportunidades de credito
- **Atualizar `useOptimizedSearch.ts`** para chamar a edge function em vez do RPC `search_baseoff_clients`

**Nota importante:** Preciso saber a estrutura das tabelas no seu PostgreSQL externo (nomes das tabelas e colunas). Se forem as mesmas do Supabase (`baseoff_clients`, `baseoff_contracts`), posso manter a mesma logica. Caso contrario, precisarei adaptar.

---

### 3. Simplificar modulo Base OFF - apenas Consulta

**Remover do `BaseOffModule.tsx`:**
- Tab "Clientes" e componente `ClientesView`
- Tab "Importar" e componente `ImportEngine`
- Remover o sistema de tabs completamente (sobra apenas Consulta)

**Melhorar visao mobile da Consulta:**
- Cards de resultado com layout otimizado para toque (areas maiores)
- Exibir oportunidades de credito de forma destacada (margem disponivel, contratos refinanciaveis, saldo devedor)
- Detalhe do cliente em tela cheia mobile com scroll suave entre secoes

---

### Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| `src/components/UsersList.tsx` | Adicionar `can_access_sms` e `can_access_whatsapp` ao PERMISSION_MODULES |
| `supabase/functions/baseoff-external-query/index.ts` | Nova edge function para consulta ao PG externo |
| `supabase/config.toml` | Registrar nova edge function |
| `src/modules/baseoff/BaseOffModule.tsx` | Remover tabs Clientes/Importar, manter so Consulta |
| `src/modules/baseoff/hooks/useOptimizedSearch.ts` | Chamar edge function em vez de RPC |
| Secrets do Supabase | Armazenar credenciais do PG externo |

---

### Pergunta necessaria

Antes de implementar a edge function, preciso confirmar: **as tabelas no seu PostgreSQL externo se chamam `baseoff_clients` e `baseoff_contracts`?** Ou possuem nomes/estrutura diferente? Se puder compartilhar os nomes das tabelas e colunas principais, a integracao sera precisa.

