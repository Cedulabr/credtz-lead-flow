

## Analise: Leads do Activate Leads nao aparecem

### Diagnostico

Fiz uma investigacao completa e os resultados sao:

1. **Dados existem no banco**: Ha **713 leads** na tabela `activate_leads`, todos com `origem = 'importacao'`, importados entre Jan/2026 e hoje (02/04/2026)
2. **RLS esta correta**: A politica SELECT permite acesso via `is_global_admin(auth.uid())`, que retorna `true` para o usuario logado (role = admin)
3. **Codigo de busca esta correto**: Para admin, a query nao aplica filtros extras — busca todos os leads
4. **Sem erros de compilacao**: TypeScript compila sem erros
5. **Todos os 713 leads tem `company_id = NULL`**: Isso nao e problema para admin (passa via `is_global_admin`), mas pode ser problema para gestores/usuarios normais

### Possivel Causa Raiz

O console mostra: **"Auth initialization took too long, forcing completion"**. Isso pode causar uma condicao de corrida onde:
- O componente monta e chama `fetchLeads` antes do `user` estar disponivel
- `fetchLeads` faz `if (!user?.id) return;` e sai sem buscar
- Quando o `user` finalmente carrega, o `useEffect` pode nao re-disparar corretamente

### Plano de Correcao

**1. Arquivo: `src/components/ActivateLeads.tsx`**
- Adicionar `user?.id` como dependencia direta no `useEffect` do `fetchLeads` para garantir re-fetch quando auth completa
- Adicionar um guard no `useEffect`: se `user?.id` existe e `leads.length === 0` e nao esta loading, forcar re-fetch
- Adicionar log de debug temporario para identificar se o fetch esta sendo chamado e quantos leads retorna

**2. Arquivo: `src/modules/activate-leads/hooks/useActivateLeads.ts`**
- Mesmo fix: garantir que o hook re-busca quando a sessao de auth finaliza
- O hook atual nao depende de `user` — pode executar antes da autenticacao estar pronta, resultando em query rejeitada pelo RLS

**3. Criar funcao `has_role_safe`** (Migration SQL)
- Os logs mostram erros repetidos: `function public.has_role_safe(text, app_role) does not exist`
- Isso afeta a tabela `activate_leads_blacklist` e pode causar erros cascata
- Criar a funcao para eliminar esses erros

### Detalhes Tecnicos

**Fix principal — retry apos auth** (`ActivateLeads.tsx`):
```typescript
// Adicionar useEffect que forca re-fetch quando user muda
useEffect(() => {
  if (user?.id && leads.length === 0 && !loading) {
    fetchLeads();
  }
}, [user?.id]);
```

**Fix no hook** (`useActivateLeads.ts`):
```typescript
// Adicionar dependencia no profile/user para re-fetch apos auth
const fetchLeads = useCallback(async () => {
  if (!profile?.id) return; // Guard: nao buscar sem auth
  // ... resto do codigo
}, [profile?.id]);
```

**Migration — criar `has_role_safe`**:
```sql
CREATE OR REPLACE FUNCTION public.has_role_safe(_user_id text, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id::uuid AND role = _role::text
  )
$$;
```

### Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `src/components/ActivateLeads.tsx` | Retry fetch apos auth + guard |
| `src/modules/activate-leads/hooks/useActivateLeads.ts` | Guard de auth + dependencia no profile |
| Migration SQL | Criar funcao `has_role_safe` |

