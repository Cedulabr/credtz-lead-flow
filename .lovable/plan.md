

## Plano: Refatorar Index.tsx — Lazy Loading, Permissoes, Arquitetura

### Alteracoes

#### 1. `src/components/LazyComponents.tsx` — Adicionar todos os modulos faltantes

Adicionar lazy imports para todos os modulos que hoje sao importados diretamente no Index.tsx:

- `Dashboard`, `IndicateClient`, `Notifications`, `FinanceKanban`, `ProposalGenerator`, `MyClientsList`, `ClientDocuments`, `SalesWizard`, `TelevendasModule`, `BaseOffModule`, `OpportunitiesModule`, `PerformanceReport`, `Collaborative`, `MyData`, `TimeClock`, `SmsModule`, `WhatsAppConfig`, `MeuNumeroModule`, `CommissionTable`, `SystemStatus`, `BaseOffConsulta`

Criar versoes `Lazy*` com `withLazyLoading` para cada um.

#### 2. `src/components/PermissionGate.tsx` — Novo componente

```tsx
interface PermissionGateProps {
  permissionKey: string;
  blockedMessage: string;
  children: React.ReactNode;
}
```

- Usa `useAuth()` internamente
- Admin sempre passa
- Non-admin: `profileData?.[permissionKey] === true` (acesso explicito)
- Se bloqueado, renderiza `<BlockedAccess message={...} />`

#### 3. `src/pages/Index.tsx` — Reescrita completa

**Imports**: Apenas `Navigation`, `LoadingAuth`, `BlockedAccess`, hooks, e lazy components de `LazyComponents.tsx`. Zero imports diretos de modulos pesados.

**hasPermission**: Mudar de `!== false` para `=== true`.

**Mapa de tabs**: Substituir o switch por objeto declarativo:

```tsx
type TabConfig = {
  component: React.ReactNode;
  permission?: string;
  blockedMessage?: string;
  wrapper?: 'p4' | null;
};

const TAB_MAP: Record<string, TabConfig> = {
  'dashboard': { component: <LazyDashboard onNavigate={setActiveTab} /> },
  'indicate': { 
    component: <LazyIndicateClient />,
    permission: 'can_access_indicar',
    blockedMessage: 'Acesso à seção Indicar bloqueado...'
  },
  // ... all tabs
};
```

**Render**: 
```tsx
const config = TAB_MAP[activeTab] || TAB_MAP['dashboard'];
if (config.permission && !hasPermission(config.permission)) {
  return <BlockedAccess message={config.blockedMessage} />;
}
return <Suspense fallback={<LoadingFallback />}>{config.component}</Suspense>;
```

**Layout**: Manter estrutura atual mas remover `overflow-x-hidden` redundante do wrapper interno.

#### 4. `src/components/LoadingFallback.tsx` — Componente global

Extrair o LoadingFallback que hoje e definido dentro de `renderActiveComponent` para componente proprio reutilizavel.

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `LazyComponents.tsx` | Adicionar ~18 lazy imports faltantes |
| `LoadingFallback.tsx` | Novo componente global de loading |
| `PermissionGate.tsx` | Novo wrapper de permissao |
| `Index.tsx` | Reescrever: zero imports diretos, mapa de tabs, permissao `=== true` |

### Nota de seguranca

A mudanca de `!== false` para `=== true` pode bloquear usuarios que nao tem o campo definido no profile. Isso e intencional (deny-by-default), mas usuarios existentes sem campos de permissao explicitamente `true` perderao acesso. Admins nao sao afetados.

