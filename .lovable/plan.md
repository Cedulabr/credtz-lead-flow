## Diagnóstico do problema

Encontrei a causa principal: hoje existem duas fontes de permissão que ficaram divergentes.

- A tela antiga de usuários grava permissões nas colunas `profiles.can_access_*`.
- O menu novo lê principalmente a tabela `module_permissions`.
- Resultado: vários usuários estão com módulo liberado no perfil antigo, mas sem linha ativa em `module_permissions`, então o módulo nunca aparece no menu.
- A publicação realtime de `module_permissions` já está habilitada e com `REPLICA IDENTITY FULL`, então o problema de “demorar horas/dias” não é mais realtime em si; é falta de sincronização e fallback do menu.

A consulta no banco mostrou muitos casos assim, por exemplo:

- `notas`: 18 usuários com perfil liberado e menu sem linha
- `sms`: 18 usuários
- `digitacao`: 17 usuários
- `televendas`: 17 usuários
- `digitacao-agibank`: 16 usuários
- `time-clock`: 11 usuários

## Plano de correção

### 1. Fazer o menu reconhecer permissões antigas imediatamente
Ajustar `useUserMenu` para combinar:

- permissões ativas da tabela `module_permissions`
- permissões legadas vindas do `profiles.can_access_*`

Assim, se o usuário já tem `can_access_controle_ponto = true`, `can_access_portflow = true`, etc., o módulo aparece no menu mesmo que ainda não exista linha em `module_permissions`.

### 2. Criar sincronização automática no banco
Criar uma migração com funções/triggers para manter as duas fontes sincronizadas:

- quando `profiles.can_access_*` mudar, o banco cria/atualiza a linha correspondente em `module_permissions`
- quando `module_permissions.is_active` mudar para módulos com flag antiga, o banco atualiza a coluna correspondente em `profiles`
- incluir trava anti-loop para evitar trigger chamando trigger infinitamente

Isso acelera liberações futuras e evita que permissões fiquem “presas” por dias.

### 3. Migrar dados já divergentes
Na mesma migração, preencher `module_permissions` para todos os usuários que hoje já têm `can_access_* = true` no perfil.

Isso corrige os usuários afetados agora, sem precisar ativar/desativar módulo manualmente.

### 4. Corrigir o painel admin de configuração avançada
A tela `ModuleConfigDrawer` atualmente salva direto em `module_permissions`, mas não sincroniza `profiles` como a tela principal já faz.

Vou atualizar esse fluxo para também manter as flags legadas consistentes.

### 5. Melhorar atualização instantânea no frontend
Ajustar invalidações/cache para:

- `useUserMenu` refazer consulta corretamente após alteração
- o preview do menu no admin refletir o estado atualizado
- o usuário receber atualização via realtime ou, no pior caso, por refetch curto sem esperar horas

## Arquivos envolvidos

- `src/hooks/useUserMenu.ts`
- `src/components/admin/ModuleConfigDrawer.tsx`
- `src/config/permissionFlags.ts` se precisar expor o mapa reverso
- nova migração Supabase para triggers e backfill

## Resultado esperado

Depois da correção:

- ativou no Admin, aparece no menu do usuário rapidamente
- usuários que já estão com permissões antigas ativas passam a ver os módulos
- módulos como Controle de Ponto, Leads Agibank, Digitação, SMS, Notas etc. não dependem mais de ajuste manual duplicado
- o sistema fica resiliente mesmo enquanto coexistirem permissões antigas e o novo menu dinâmico