

## Redesign Moderno: Gestão de Usuários (SaaS-style)

### Resumo

Substituir o `UsersList.tsx` atual (953 linhas, tabela básica) por um módulo moderno inspirado em Stripe/Vercel/Supabase com: cards de métricas, filtros avançados, tabela com avatar e menu de ações, modal de permissões categorizado, modos lista/grid, e responsividade mobile-first.

### Arquitetura

Dividir o monolito `UsersList.tsx` em componentes menores dentro de uma nova pasta:

```text
src/components/UsersManagement/
├── index.tsx              # Orquestrador principal
├── UserMetricsCards.tsx    # 4 cards de resumo
├── UserFiltersBar.tsx      # Busca + filtros (empresa, função, status, permissões)
├── UserTable.tsx           # Tabela moderna com avatar, badges, menu ⋯
├── UserGridView.tsx        # Grid de cards para modo alternativo
├── UserAvatar.tsx          # Avatar com iniciais coloridas
├── UserActionMenu.tsx      # Dropdown menu de 3 pontos
├── UserPermissionsModal.tsx # Modal com permissões categorizadas
├── UserEditModal.tsx       # Modal de edição
├── UserPasswordModal.tsx   # Modal de senha
└── types.ts               # Interfaces compartilhadas
```

### Detalhes por Seção

**1. Cards de Métricas** (`UserMetricsCards.tsx`)
- 4 cards: Total de Usuários, Ativos, Gestores, Colaboradores
- Calculados via `useMemo` sobre a lista de users + userCompanies
- Design: borda suave, sombra leve, número grande, label pequeno

**2. Filtros** (`UserFiltersBar.tsx`)
- Campo de busca com ícone (nome, email, CPF)
- Select de Empresa (lista de companies)
- Select de Função (Admin, Parceiro, Gestor, Colaborador)
- Select de Status (Ativo, Inativo)
- Toggle de modo visualização (List/Grid)
- Botão "+ Novo Usuário"

**3. Tabela Moderna** (`UserTable.tsx`)
- Colunas: Avatar+Nome+Email | Empresa | Função (badge) | Status (dot colorido 🟢⚪) | Permissões (tags) | Ações (⋯)
- `UserAvatar`: círculo com iniciais, cores geradas por hash do nome
- Hover nas linhas com transição suave
- No mobile: transforma cada row em card

**4. Grid View** (`UserGridView.tsx`)
- Cards de usuário com avatar, nome, empresa, badges de função/status
- Menu de ações no canto do card

**5. Menu de Ações** (`UserActionMenu.tsx`)
- DropdownMenu com: Editar, Permissões, Resetar senha, Definir senha, Vincular empresa, Ativar/Desativar, Excluir
- Ícones + labels, separador antes de ações destrutivas

**6. Modal de Permissões** (`UserPermissionsModal.tsx`)
- Título: "Gerenciar Permissões — [Nome]"
- Permissões agrupadas em categorias:
  - **Comercial**: Gerador de Propostas, Meus Clientes, Televendas, Gestão Televendas
  - **Leads**: Leads Premium, Activate Leads, Indicar
  - **Financeiro**: Finanças, Tabela Comissões, Minhas Comissões
  - **Sistema**: Consulta Base OFF, Documentos, Alertas, Colaborativo, Controle de Ponto
  - **Comunicação**: SMS, WhatsApp, Meu Número
  - **Relatórios**: Relatório de Desempenho
- Cada permissão: nome + descrição curta + toggle moderno
- Skeleton loading durante carregamento

**7. Skeleton Loading**
- Skeleton cards para métricas durante load
- Skeleton rows/cards para lista durante load

### Lógica Preservada

Toda a lógica de negócio existente será mantida intacta:
- `loadUsers`, `loadUserCompanies`, `loadCompanies`
- `handleSaveUser`, `toggleUserStatus`, `deleteUser`
- `handleUpdatePassword`, `resetUserPassword`
- `updateUserPermissions`, `handleRolePromotion`
- `PERMISSION_MODULES` array
- `CreateUser` component (reutilizado)

### Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `src/components/UsersManagement/index.tsx` | **Criar** — componente principal |
| `src/components/UsersManagement/UserMetricsCards.tsx` | **Criar** — cards de resumo |
| `src/components/UsersManagement/UserFiltersBar.tsx` | **Criar** — busca e filtros |
| `src/components/UsersManagement/UserTable.tsx` | **Criar** — tabela moderna |
| `src/components/UsersManagement/UserGridView.tsx` | **Criar** — grid de cards |
| `src/components/UsersManagement/UserAvatar.tsx` | **Criar** — avatar com iniciais |
| `src/components/UsersManagement/UserActionMenu.tsx` | **Criar** — menu dropdown |
| `src/components/UsersManagement/UserPermissionsModal.tsx` | **Criar** — modal categorizado |
| `src/components/UsersManagement/UserEditModal.tsx` | **Criar** — modal de edição |
| `src/components/UsersManagement/UserPasswordModal.tsx` | **Criar** — modal de senha |
| `src/components/UsersManagement/types.ts` | **Criar** — interfaces |
| `src/components/admin/AdminPeople.tsx` | **Atualizar** — importar novo componente |
| `src/components/UsersList.tsx` | Manter como fallback, mas admin usa o novo |

