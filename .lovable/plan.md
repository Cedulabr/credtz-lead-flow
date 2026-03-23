

## Módulo PortFlow — Cadastro de Propostas com Tag no Televendas

### Conceito

O PortFlow será um wizard de cadastro idêntico ao Televendas (Sales Wizard), mas focado em **clientes alta idade** e **portabilidade com poucas parcelas pagas**. As propostas cadastradas serão inseridas na mesma tabela `televendas`, com uma coluna `modulo_origem` = `'portflow'` para identificação. Na Gestão de Televendas, essas propostas aparecerão com uma badge "PortFlow".

### Mudanças

| Componente | Ação |
|---|---|
| **Migration SQL** | Adicionar coluna `modulo_origem text DEFAULT 'televendas'` na tabela `televendas` |
| **`src/modules/portflow/PortFlowModule.tsx`** (novo) | Wrapper do SalesWizard que passa `moduloOrigem="portflow"` como prop |
| **`src/modules/sales-wizard/SalesWizard.tsx`** | Aceitar prop `moduloOrigem?: string`, inserir na coluna `modulo_origem` ao salvar; exibir header diferente se portflow |
| **`src/modules/sales-wizard/types.ts`** | Adicionar `moduloOrigem` ao `SalesWizardData` |
| **`src/components/LazyComponents.tsx`** | Adicionar lazy import do PortFlowModule |
| **`src/components/Navigation.tsx`** | Adicionar item "PortFlow" no menu com ícone e permissionKey |
| **`src/pages/Index.tsx`** | Adicionar tab `portflow` com permission e componente |
| **`src/components/UsersManagement/types.ts`** | Adicionar `can_access_portflow` ao PERMISSION_MODULES |
| **`src/modules/televendas/TelevendasModule.tsx`** | Exibir badge "PortFlow" nas propostas com `modulo_origem = 'portflow'`; adicionar filtro por origem |
| **`src/modules/televendas/components/StatusBadge.tsx`** ou similar | Badge visual "PortFlow" em destaque |

### Detalhes

**1. Migration — nova coluna**

```sql
ALTER TABLE public.televendas 
  ADD COLUMN IF NOT EXISTS modulo_origem text DEFAULT 'televendas';

CREATE INDEX IF NOT EXISTS idx_televendas_modulo_origem 
  ON public.televendas(modulo_origem);
```

**2. PortFlowModule — componente simples**

```typescript
import { SalesWizard } from "@/modules/sales-wizard/SalesWizard";

export function PortFlowModule() {
  return <SalesWizard moduloOrigem="portflow" />;
}
```

**3. SalesWizard — aceitar prop**

- Prop `moduloOrigem?: string` (default `'televendas'`)
- No insert: `modulo_origem: moduloOrigem`
- Header dinâmico: se portflow → "PortFlow — Nova Proposta" com ícone/cor diferente
- Pré-selecionar `tipo_operacao: "Portabilidade"` se portflow (opcional, pode deixar livre)

**4. Gestão Televendas — badge e filtro**

- Na lista de propostas, exibir badge azul "PortFlow" ao lado do nome quando `modulo_origem === 'portflow'`
- Adicionar filtro "Origem" com opções: Todos, Televendas, PortFlow

### Fluxo

```text
Usuário abre PortFlow
        ↓
SalesWizard com moduloOrigem="portflow"
        ↓
Cadastra proposta → tabela televendas (modulo_origem = 'portflow')
        ↓
Solicita documentação (mesmo fluxo)
        ↓
Gestão Televendas exibe proposta com badge "PortFlow"
```

