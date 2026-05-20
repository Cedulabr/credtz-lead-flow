## Objetivo

Substituir a sidebar atual por uma navegação hierárquica em accordions, alimentada dinamicamente por uma nova fonte de verdade (`module_permissions` + `menu_categories`). Itens permanecem invisíveis quando o usuário não tem permissão. Admin ganha um painel "Gerenciar Permissões" reformulado, com cards de módulos, drawer de configuração, categorias dinâmicas, preview do menu por usuário e log de auditoria.

## Estrutura do menu (final)

Sempre visível (hardcoded, não passa pela tabela):
- Meus Dados → Perfil, Configurações da conta
- Marketplace, Faturamento, Indicar

Dinâmico (vem de `module_permissions` + `menu_categories`):
- Gestão Whatsapp, Captação, Televendas, Financeiro, Gestão, e qualquer categoria criada pelo admin
- Cada categoria com 0 módulos ativos para o usuário fica oculta
- Seção da rota atual auto-expande no load

## Banco de dados

### Nova tabela `menu_categories` (categorias dinâmicas)
Campos de domínio: `key` (slug único), `label`, `icon`, `position`, `is_system` (true = não pode deletar, ex.: Capação/Televendas seed inicial).
RLS: leitura para qualquer autenticado; insert/update/delete só admin.

### Nova tabela `module_permissions` (por usuário)
Campos de domínio: `user_id`, `module_key`, `is_active`, `category_key` (FK lógica para `menu_categories.key`), `display_name`, `icon`, `position`.
Unique (`user_id`, `module_key`).
RLS: usuário lê o próprio; admin lê/escreve tudo.

### Nova tabela `admin_audit_log`
Campos de domínio: `action` (`module_enabled`, `module_disabled`, `module_recategorized`, `category_created`, etc.), `module_key`, `target_user_id`, `changed_by`, `payload` (jsonb), `created_at`.
RLS: insert via trigger/RPC; select só admin.

### Catálogo de módulos
Registro estático no frontend (`src/config/modules.ts`) com: `key`, `defaultLabel`, `defaultIcon`, `defaultCategory`, `route`, descrição. Lista canônica dos 19 módulos do prompt. O admin só atribui/sobrescreve esses metadados na tabela.

### Migração das permissões existentes
Script SQL que lê as colunas `can_access_*` do `profiles` e popula `module_permissions` 1×1 por usuário, mapeando para `module_key` + `category_key` padrão do catálogo. Após validado, as colunas antigas e a RPC `sync_permission_columns` podem ser descontinuadas (passo manual, fora desta entrega).

## Frontend

### Sidebar (`src/components/layout/SidebarNav.tsx` — redesenho in-place)
- Novo hook `useUserMenu()` que faz: `menu_categories` (todas) + `module_permissions` do `auth.uid()` onde `is_active = true`, agrupa por `category_key`, ordena por `position`.
- Renderiza accordions colapsáveis (componente `Collapsible` do shadcn) com chevron, ícone, label e contador.
- Seção contendo a rota atual abre por default.
- Item ativo destacado com `bg-primary/15 text-primary`.
- Mobile: rail icon-only com Tooltip; expande em sheet.
- Sem itens em uma categoria → categoria some.

### Admin "Gerenciar Permissões" (`src/pages/admin/PermissionsAdmin.tsx`)
- Header: seletor de usuário (busca por nome/email) + botão "Pré-visualizar menu deste usuário" (abre dialog com a sidebar renderizada read-only).
- Grid de cards (um por módulo do catálogo) mostrando: ícone, nome, badge Ativo/Inativo, categoria atual, switch on/off rápido, botão "Configurar".
- Drawer lateral (shadcn `Sheet` right) com: toggle ativo, select de categoria (inclui "+ Nova categoria…" abrindo mini-form inline), input display name, seletor de ícone (grid de ícones Lucide pré-curados), input numérico de posição, botão Salvar.
- Aba/seção "Categorias" para CRUD de `menu_categories` (criar, renomear, reordenar, excluir não-system).
- Toda mutação grava em `admin_audit_log` via RPC `log_admin_action`.
- Atualização otimista (TanStack Query `setQueryData`) para refletir mudanças instantaneamente.

### Substituição do `PermissionGate`
- Atualizar `PermissionGate` para consultar `module_permissions` (via contexto cacheado) em vez de `profile.can_access_*`. Mantém a mesma API pública para não quebrar callers.

## Arquivos

Criar:
- `supabase/migrations/<ts>_module_permissions_system.sql`
- `src/config/modules.ts` (catálogo + ícones default)
- `src/hooks/useUserMenu.ts`
- `src/hooks/useModulePermissions.ts` (admin: CRUD)
- `src/hooks/useMenuCategories.ts`
- `src/pages/admin/PermissionsAdmin.tsx`
- `src/components/admin/ModuleCard.tsx`
- `src/components/admin/ModuleConfigDrawer.tsx`
- `src/components/admin/CategoriesManager.tsx`
- `src/components/admin/UserMenuPreview.tsx`
- `src/components/layout/SidebarSection.tsx` (accordion item)
- `src/components/layout/IconPicker.tsx`

Editar:
- `src/components/layout/SidebarNav.tsx` (redesenho)
- `src/components/PermissionGate.tsx` (nova fonte)
- `src/App.tsx` (rota `/admin/permissions` apontando para nova página; remover/redirecionar antiga)
- `src/components/admin/AdminLayout.tsx` (entrada do módulo de permissões)
- `src/pages/admin/ModulesAdmin.tsx` (ajustar/integrar se conflitar)

## Detalhes técnicos

- RLS de `module_permissions`: select usa `auth.uid() = user_id OR has_role_safe(auth.uid(),'admin')`. Mutações: `has_role_safe(auth.uid(),'admin')`.
- RPC `log_admin_action(action text, module_key text, target_user_id uuid, payload jsonb)` SECURITY DEFINER para garantir gravação no audit log mesmo quando RLS está restritivo.
- Catálogo de módulos no frontend evita "modules table" — admin não cria módulos novos, só ativa/recategoriza/relabela os existentes. Adicionar novo módulo = nova entrada em `src/config/modules.ts`.
- Categorias seed iniciais (is_system=true): `gestao_whatsapp`, `captacao`, `televendas`, `financeiro`, `gestao`.
- Realtime opcional (fora do escopo): poderia escutar mudanças em `module_permissions` do próprio usuário para refletir promoções instantaneamente; por ora, refetch após login/refresh.

## Fora do escopo

- Roles/empresas (mantém `profiles.role` atual; só admin acessa o painel).
- Remoção física das colunas `can_access_*` do `profiles` (manter como fallback até validação em produção).
- Telemetria avançada / Notificações ao usuário quando ganha módulo novo.
