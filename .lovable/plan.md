

## Botão "Sincronizar Módulos" no Gerenciar Permissões

### Problema

Quando um novo módulo é criado e adicionado ao `PERMISSION_MODULES`, a coluna correspondente (`can_access_*`) pode não existir na tabela `profiles`. Isso exige edição manual de migrations. O usuário quer um botão que force a criação automática das colunas faltantes.

### Mudanças

| Componente | Ação |
|---|---|
| Migration SQL | Criar função RPC `sync_permission_columns(column_names text[])` que verifica quais colunas faltam na tabela `profiles` e as cria como `boolean DEFAULT true` |
| `src/components/UsersManagement/UserPermissionsModal.tsx` | Adicionar botão "Sincronizar Módulos" no header que chama a RPC com todas as keys do `PERMISSION_MODULES`, mostra resultado (X colunas criadas) e recarrega |

### Detalhes

**1. RPC `sync_permission_columns`**

```sql
CREATE OR REPLACE FUNCTION public.sync_permission_columns(column_names text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  col text;
  added text[] := '{}';
BEGIN
  FOREACH col IN ARRAY column_names LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = col
    ) THEN
      EXECUTE format('ALTER TABLE public.profiles ADD COLUMN %I boolean DEFAULT true', col);
      added := array_append(added, col);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('added', added, 'total_checked', array_length(column_names, 1));
END;
$$;
```

Restrita a admin via check interno ou via RLS (apenas admin pode chamar).

**2. Botão no modal**

Ao lado do badge "X/Y ativas", adicionar botão com ícone `RefreshCw` + tooltip "Sincronizar novos módulos". Ao clicar:
- Chama `supabase.rpc('sync_permission_columns', { column_names: PERMISSION_MODULES.map(m => m.key) })`
- Se `added.length > 0`: toast "X novos módulos sincronizados: [nomes]"
- Se `added.length === 0`: toast "Todos os módulos já estão sincronizados"
- Recarrega o usuário para refletir os novos campos

