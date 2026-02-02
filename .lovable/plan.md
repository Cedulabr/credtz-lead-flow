
# Plano: Adicionar "Solicitar Cancelamento" para Colaboradores

## Contexto

Atualmente, o fluxo de cancelamento funciona da seguinte forma:
- **Gestores/Admins**: Podem cancelar propostas diretamente (status `proposta_cancelada`)
- **Colaboradores**: Não têm opção de solicitar cancelamento - apenas gestores podem cancelar

O usuário deseja que **colaboradores possam solicitar o cancelamento**, e o **gestor aprove ou rejeite** a solicitação.

---

## Solução Proposta

Adicionar um novo status `cancelado_aguardando` (já existe na constraint do banco) que funcionará de forma análoga ao `solicitar_exclusao`:

| Status | Quem pode usar | Ação do Gestor |
|--------|----------------|----------------|
| `cancelado_aguardando` | Colaborador | Aprovar ou Rejeitar |
| `proposta_cancelada` | Gestor (após aprovação) | Final |

---

## Alterações Necessárias

### 1. Atualizar `types.ts`

Adicionar `cancelado_aguardando` aos status operacionais e configurar sua exibição:

```typescript
// OPERATOR_STATUSES - adicionar:
"cancelado_aguardando", // Cancelamento Aguardando Gestor

// STATUS_CONFIG - adicionar:
cancelado_aguardando: {
  label: "Cancelamento Aguardando Gestor",
  shortLabel: "Aguard. Cancel.",
  emoji: "❌",
  color: "text-red-500",
  bgColor: "bg-red-500/10 border-red-300",
  isOperational: true,
  isFinal: false,
}
```

### 2. Atualizar `AprovacoesView.tsx`

Adicionar seção para aprovar/rejeitar solicitações de cancelamento:

- Filtrar itens com status `cancelado_aguardando`
- Mostrar botões "Aprovar Cancelamento" e "Rejeitar"
- Passar props para handlers de aprovação/rejeição de cancelamento

### 3. Atualizar `TelevendasModule.tsx`

Adicionar handlers para aprovar/rejeitar cancelamento:

```typescript
// Novos handlers:
handleApproveCancellation = (tv) => handleStatusChange(tv, "proposta_cancelada");
handleRejectCancellation = (tv) => handleStatusChange(tv, "devolvido"); // ou outro status

// Atualizar stats para contar cancelados_aguardando:
aguardandoGestao: televendas.filter((tv) => 
  ["pago_aguardando", "solicitar_exclusao", "cancelado_aguardando"].includes(tv.status)
).length
```

### 4. Atualizar `ActionMenu.tsx` (já funciona automaticamente)

Como o ActionMenu já usa `OPERATOR_STATUSES`, ao adicionar `cancelado_aguardando` à lista, o menu já mostrará a opção para colaboradores.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/modules/televendas/types.ts` | Adicionar `cancelado_aguardando` a OPERATOR_STATUSES e STATUS_CONFIG |
| `src/modules/televendas/views/AprovacoesView.tsx` | Adicionar seção e props para aprovar/rejeitar cancelamento |
| `src/modules/televendas/TelevendasModule.tsx` | Adicionar handlers e atualizar contagem de pendências |

---

## Fluxo de Trabalho Final

```text
COLABORADOR                          GESTOR
    │                                   │
    ├─► Proposta Digitada               │
    │                                   │
    ├─► Solicitar Cancelamento ─────────►│ Aba "Aprovações"
    │   (cancelado_aguardando)          │
    │                                   ├─► Aprovar → proposta_cancelada
    │                                   │   (com data de cancelamento)
    │◄──────────────────────────────────┤
    │                                   └─► Rejeitar → devolvido
    │◄──────────────────────────────────┘
```

---

## Detalhes Técnicos

### Interface do AprovacoesView

```typescript
interface AprovacoesViewProps {
  // ... props existentes ...
  onApproveCancellation: (tv: Televenda) => void;
  onRejectCancellation: (tv: Televenda) => void;
}
```

### Nova Seção no AprovacoesView

```typescript
// Filtrar cancelados aguardando
const canceladoAguardando = filteredApprovalItems.filter(
  tv => tv.status === "cancelado_aguardando"
);

// Renderizar seção
{canceladoAguardando.length > 0 && (
  <div>
    <SectionHeader 
      emoji="❌" 
      title="Solicitações de Cancelamento" 
      count={canceladoAguardando.length}
      urgent
    />
    {/* Cards com botões Aprovar/Rejeitar */}
  </div>
)}
```

### Atualização do StatusChangeModal

O modal já suporta data de cancelamento, então ao aprovar (mudar para `proposta_cancelada`), o gestor poderá informar a data.

---

## Comportamento Esperado

### Para Colaboradores
- No menu de ações, verão a opção "Cancelamento Aguardando Gestor"
- Ao selecionar, abre modal para informar motivo
- Proposta fica com status `cancelado_aguardando`
- Badge amarelo/vermelho indica aguardando aprovação

### Para Gestores
- Na aba "Aprovações", verão nova seção "Solicitações de Cancelamento"
- Podem aprovar (→ `proposta_cancelada` com data) ou rejeitar (→ `devolvido`)
- Contagem no badge de pendências inclui cancelamentos aguardando

---

## Resumo de Entregas

1. Novo status `cancelado_aguardando` disponível para colaboradores
2. Seção "Solicitações de Cancelamento" na aba Aprovações
3. Botões "Aprovar Cancelamento" e "Rejeitar" para gestores
4. Registro de data de cancelamento ao aprovar
5. Atualização da contagem de pendências no badge
