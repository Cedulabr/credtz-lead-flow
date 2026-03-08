

## Plano: Corrigir Lançamento de Folgas no Controle de Ponto

### Diagnóstico

Analisei a tabela `time_clock_day_offs`, suas constraints, políticas RLS e o componente `DayOffManager.tsx`. Os problemas identificados são:

1. **Unique constraint `(user_id, off_date)`**: Cada usuário só pode ter UM registro por data. Ao tentar lançar uma folga em uma data que já tem registro (mesmo de tipo diferente), o `upsert` tenta fazer UPDATE, mas as políticas RLS podem bloquear o update se as condições mudaram.

2. **Bulk upsert com RLS**: Ao lançar para todos os colaboradores, o `upsert` de array com `onConflict` pode falhar parcialmente — se alguns usuários já têm registros naquela data, o UPDATE é bloqueado por RLS no contexto de batch.

3. **Falta de tratamento para usuários regulares (não admin/não gestor)**: O componente não trata o caso de um colaborador comum, deixando `selectedCompanyId` vazio.

### Correções

#### 1. `DayOffManager.tsx` — Melhorar lógica de save

- Para **individual**: Primeiro verificar se já existe registro (`select` por `user_id` + `off_date`). Se existir, fazer `update` explícito em vez de `upsert`. Se não existir, fazer `insert`.
- Para **bulk**: Usar a mesma abordagem — deletar registros existentes naquela data para os usuários e inserir novos, em vez de `upsert`.
- Adicionar fallback para carregar `companyId` de usuários regulares (colaboradores) via `user_companies`.

#### 2. Melhorar feedback de erro

- Exibir mensagem de erro mais clara quando RLS bloqueia.
- Adicionar log no console para debug.

### Arquivo

| Arquivo | Ação |
|---|---|
| `src/components/TimeClock/DayOffManager.tsx` | Substituir upsert por delete+insert, adicionar suporte a colaboradores |

