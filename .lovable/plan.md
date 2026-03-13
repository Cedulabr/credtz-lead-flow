

## Correção: Visibilidade de Propostas por Perfil

### Problema

Dois bugs combinados fazem colaboradores verem propostas de toda a empresa:

**1. RLS Policy (causa principal)**: A policy SELECT em `saved_proposals` usa `company_id IN (SELECT get_user_company_ids(auth.uid()))` — isso permite que **qualquer membro** da empresa veja todas as propostas, incluindo colaboradores.

**2. Frontend `isGestor` errado (linha 96)**: O código verifica `profile?.role === 'partner'`, mas gestores são identificados via `user_companies.company_role = 'gestor'`, não pelo role do profile. Então a lógica de filtro do frontend nunca identifica gestores corretamente.

### Correções

**Migration SQL — Restringir RLS SELECT**:

Substituir a policy `saved_proposals_select_scope` para:
- **Colaborador**: `auth.uid() = user_id` (apenas as próprias)
- **Gestor**: propostas da mesma empresa via `is_company_gestor()`
- **Admin**: `is_global_admin()` (todas)

```sql
DROP POLICY "saved_proposals_select_scope" ON public.saved_proposals;

CREATE POLICY "saved_proposals_select_scope"
ON public.saved_proposals FOR SELECT TO authenticated
USING (
  public.is_global_admin(auth.uid())
  OR auth.uid() = user_id
  OR (
    company_id IS NOT NULL
    AND public.is_company_gestor(auth.uid(), company_id)
  )
);
```

Mesma lógica para UPDATE e DELETE (gestor pode ver mas só dono pode editar/deletar — manter como está).

**Frontend `ProposalGenerator.tsx`**:

Corrigir detecção de gestor usando `useGestorCompany` hook (já existente no projeto) em vez de `profile?.role === 'partner'`.

```typescript
const { isGestor: isGestorCompany } = useGestorCompany();
const isAdmin = profile?.role === 'admin';
const isGestor = isGestorCompany;
const canViewAllProposals = isAdmin || isGestor;
```

### Arquivos a Modificar

| Arquivo | Ação |
|---|---|
| Migration SQL | Substituir policy SELECT para restringir por role |
| `src/components/ProposalGenerator.tsx` | Usar `useGestorCompany` para detectar gestor corretamente |

