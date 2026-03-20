

## Fix: Consultor "Sem nome" no Pagamento de Comissão

### Diagnóstico

A query de profiles no client-side está retornando vazia porque a função `has_role()` na RLS verifica `profiles.role` contra o enum `app_role` (que só tem 'admin' e 'partner'). Se o usuário logado não passar no check de RLS, a consulta retorna zero perfis — resultando em "Sem nome" para todos.

Os nomes **existem** no banco (confirmado via query direta: Ana Luiza, Jamily Silva, Alana Rodrigues, etc.), mas o client não consegue lê-los.

### Solução

Criar uma função RPC `get_profiles_by_ids` com `SECURITY DEFINER` que retorna id, name, email e user_percentage_profile, bypass de RLS. Atualizar o `CommissionPayment` para usar essa RPC.

### Mudanças

| Componente | Ação |
|---|---|
| Migration SQL | Criar RPC `get_profiles_by_ids(user_ids uuid[])` SECURITY DEFINER que retorna name, email, level |
| `src/components/admin/CommissionPayment.tsx` | Substituir query direta de profiles pela chamada RPC; garantir que nomes apareçam no filtro "Funcionário" e coluna "Consultor" |

### Detalhes

**1. RPC**

```sql
CREATE OR REPLACE FUNCTION public.get_profiles_by_ids(user_ids uuid[])
RETURNS TABLE(id uuid, name text, email text, user_percentage_profile text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT p.id, p.name, p.email, p.user_percentage_profile
  FROM public.profiles p
  WHERE p.id = ANY(user_ids);
$$;
```

**2. CommissionPayment.tsx — trocar query**

```typescript
// Antes:
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, name, email, user_percentage_profile')
  .in('id', userIds);

// Depois:
const { data: profiles } = await supabase
  .rpc('get_profiles_by_ids', { user_ids: userIds });
```

Os nomes reais (Ana Luiza, Jamily Silva, etc.) passarão a aparecer tanto na coluna "Consultor" quanto no filtro "Funcionário".

