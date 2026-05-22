## Diagnóstico

Conferi os dados e o código. Os usuários afetados (`alessandroalves` gestor, `analuiza` colaborador) **têm linhas `is_active=true` em `module_permissions`** para os dois módulos, **têm `user_companies` ativos** e os módulos estão registrados em `MODULE_CATALOG`, `LazyComponents` e `Index.tsx`. Mesmo assim "não carregam".

Identifiquei três causas combinadas:

### 1. `module_permissions` não está em `supabase_realtime`
A correção anterior (subscription realtime no `useUserMenu`) não tem efeito — a tabela **não está publicada**. Resultado: quando você ativa um módulo no admin, a sessão do usuário só recebe via `refetchOnWindowFocus` (5s + voltar à aba). Em muitos casos o usuário fica olhando o menu antigo achando que "não carregou".

### 2. Gate em `Index.tsx` retorna falso durante o carregamento das permissões
```ts
if (MODULE_BY_KEY[activeTab]) {
  return activeModules[activeTab] === true;   // undefined no 1º render
}
```
No primeiro render `useUserMenu` ainda está em loading → `activeModules` vazio → `BlockedAccess` aparece. Se o usuário entra direto via deep-link ou refresh, vê a tela bloqueada por uma fração de segundo (e às vezes ela "fica") em vez do conteúdo.

### 3. Falta de feedback / instrumentação
Não há nenhum `console.log` ou Error Boundary específico nesses módulos, então não dá para diferenciar "bloqueado por permissão" de "componente quebrou ao carregar" de "permissão ainda carregando". Hoje é tudo a mesma tela em branco/bloqueada.

## Plano de correção

### Passo 1 — Habilitar realtime de verdade em `module_permissions`
Migração:
```sql
ALTER TABLE public.module_permissions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_permissions;
```
Com isso, a subscription que já existe em `useUserMenu` passa a invalidar o cache do usuário **imediatamente** quando o admin clica no toggle. Liberação instantânea, sem F5.

### Passo 2 — Corrigir `hasPermission` em `src/pages/Index.tsx`
Trocar a checagem por uma versão consciente do estado de loading:
- Enquanto `useUserMenu` está carregando → mostrar `LoadingAuth` (mesmo skeleton do auth), não `BlockedAccess`.
- Só decidir bloquear depois que `permissions` chegar.
- Adicionar fallback: se `MODULE_BY_KEY[activeTab]` existe **e** o perfil tem a flag legada `can_access_*` ligada, tratar como liberado (compatibilidade com permissões antigas que ainda não foram migradas para `module_permissions`).

### Passo 3 — Sincronizar legado ↔ novo
Quando o admin ativa um módulo em `PermissionsAdmin`, também gravar a flag `can_access_*` correspondente no `profiles` (apenas para os módulos que ainda têm coluna no `profiles`). Mapa:
- `time-clock` → `can_access_controle_ponto`
- `leads-agibank` → (criar) ou apenas confiar em `module_permissions`
- demais já mapeados em `TAB_PERMISSIONS`.

Isso elimina a divergência entre as duas fontes de verdade e dá segurança para componentes que ainda leem `profile.can_access_*` diretamente.

### Passo 4 — Instrumentação para acelerar diagnósticos futuros
- Envolver cada `Lazy*Module` em `Index.tsx` num `<ErrorBoundary>` que loga `console.error` com `moduleKey` e mostra um card "Falha ao carregar módulo X — recarregar".
- Adicionar `console.debug('[perm]', activeTab, activeModules[activeTab], isLoading)` no `renderActiveComponent` (removível depois).

### Passo 5 — Validar
- Logar com conta `analuiza@credtz.com` (preview), abrir `time-clock` e `leads-agibank`, conferir que carregam.
- Toggle no admin → confirmar que o menu do outro usuário atualiza em < 1s sem refresh (realtime).
- Conferir Edge Logs e console limpos.

## Detalhes técnicos / Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/<novo>.sql` | `REPLICA IDENTITY FULL` + `ADD TABLE` na publicação |
| `src/pages/Index.tsx` | `hasPermission` ciente do loading + fallback `can_access_*`; envolver módulos em ErrorBoundary |
| `src/hooks/useUserMenu.ts` | Expor `isLoading` de `permissions` para o gate |
| `src/pages/admin/PermissionsAdmin.tsx` | Ao togglar, também `update profiles set can_access_*` para módulos com flag legada |
| `src/components/ModuleErrorBoundary.tsx` (novo) | Boundary leve com botão "Tentar novamente" |

## Fora do escopo
- Não vou alterar a UI do menu, dos módulos, nem regras de negócio internas (RLS de `agibank_leads`, lógica de ponto). Só permissão/visibilidade/carregamento.

Se concordar, sigo para implementação.