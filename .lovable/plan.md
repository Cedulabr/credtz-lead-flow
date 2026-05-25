# Permissões — Ativar Todos + Correção de Renderização do Menu

## 1. Novo controle "Ativar Todos" (com filtro por categoria)

Local: `src/pages/admin/PermissionsAdmin.tsx`, acima do grid de cards de módulos (aparece apenas quando há um usuário selecionado).

UI:
- Botão **"Ativar Todos"** + `Select` com as categorias reais já existentes em `menu_categories` (Gestão WhatsApp, Captação, Televendas, Financeiro, Gestão, etc.), além da opção **"Todas as categorias"**.
- Botão secundário **"Desativar Todos"** (mesmo escopo) para simetria.
- Toast de sucesso: `"X permissões ativadas com sucesso"` (ou desativadas).

Lógica:
- Itera sobre `MODULE_CATALOG` filtrando por `defaultCategory === categoriaSelecionada` (ou todos).
- Faz um único `upsert` em lote no `module_permissions` (`onConflict: user_id,module_key`) com `is_active=true`, preservando `category_key`, `display_name`, `icon`, `position` quando já existirem.
- Em paralelo, sincroniza os `profiles.can_access_*` correspondentes via `MODULE_TO_PROFILE_FLAG` (mantém compatibilidade com o sistema legado, igual já é feito no `upsertMutation` atual).
- Invalida `["module_permissions", selectedUserId]` ao final.

Permissão:
- Botão visível apenas para `isAdmin` (já é a guard atual da página). A RLS existente em `module_permissions` continua sendo o gate real.

## 2. Correção da renderização do menu

### Diagnóstico
O menu lateral em `SidebarNav.tsx` usa `useUserMenu()` (sem `userId`), que monta as seções a partir de `menu_categories` + `module_permissions` ativos. Já existe um fallback legacy (lê `profiles.can_access_*`) e realtime na tabela `module_permissions`. Porém:

1. **`useUserMenu` no Sidebar é chamado sem `userId`**, então o realtime do `useUserModulePermissions` é registrado com `filter: user_id=eq.<currentUserId>` — funciona, mas a invalidação só ocorre se o usuário logado **for o mesmo** que teve a permissão alterada. Quando um admin ativa o módulo para outro usuário, o outro usuário só vê após refresh — isso está correto.
2. **Itens ativos cuja `category_key` não existe em `menu_categories` são silenciosamente descartados** no loop `for (const c of cats.data)`. Esse é o principal motivo de "ativei mas não aparece": se o admin (ou trigger de backfill) inseriu `category_key = 'gestao'` mas a categoria cadastrada tem outra `key`, o item desaparece. Vamos:
   - Adicionar uma **seção fallback "Outros"** que recolhe qualquer item ativo cuja `category_key` não bate com nenhuma categoria cadastrada, em vez de descartar.
   - Logar `console.warn` listando as `category_key` órfãs para facilitar diagnóstico.
3. **`staleTime` de categorias é 60s** — ok, mas adicionar `refetchOnMount: "always"` para garantir refresh imediato após troca de aba.
4. **Garantir que admin sempre veja tudo**: no `useUserMenu`, se `isAdmin === true` e `!userId` (menu do próprio admin), montar as seções a partir do `MODULE_CATALOG` completo, ignorando filtros de `is_active`. Isso satisfaz o STEP 4 (super_admin sempre vê todos os módulos ativos — e, no caso do admin, todos os existentes).

### Mudanças de código
- **`src/hooks/useUserMenu.ts`**
  - Importar `useAuth` → `isAdmin`.
  - Quando `!userId && isAdmin`: gerar `activePerms` a partir de `MODULE_CATALOG` inteiro (todos ativos).
  - Quando montar seções: agrupar itens ativos com `category_key` desconhecida na seção sintética `{ categoryKey: "outros", label: "Outros", icon: "Folder", position: 9999 }` em vez de descartá-los; emitir `console.warn` com a lista.
  - Definir `refetchOnMount: "always"` em `useMenuCategories`.

- **`src/components/layout/SidebarNav.tsx`**
  - Sem mudanças funcionais — apenas confirmar que o `time-clock` continua fixo no TOP_ITEMS (regra atual) e que a seção "Outros" renderiza pelo mesmo `renderSection`.

### Verificação manual
1. Admin ativa um módulo de um usuário → toggle imediato no card; usuário-alvo recarrega e vê item.
2. Desativar → some do menu após refresh.
3. Logar como admin → todos os módulos aparecem.
4. Inserir manualmente um `module_permissions` com `category_key` inexistente → item aparece em "Outros" + warning no console (em vez de sumir).
5. "Ativar Todos" → categoria escolhida fica 100% verde nos cards; toast com contagem correta.

## Resumo dos arquivos editados
- `src/pages/admin/PermissionsAdmin.tsx` — UI + mutation bulk
- `src/hooks/useUserMenu.ts` — admin bypass + seção "Outros" + refetch

Nenhuma alteração de RLS, migration ou lógica de permissão existente é necessária.