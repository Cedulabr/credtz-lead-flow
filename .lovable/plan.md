

## Identificação do Responsável no módulo Activate Leads

### Problema
Gestor/Admin não consegue identificar visualmente qual usuário está tratando cada lead na lista. Há filtro de usuário, mas falta a coluna/badge mostrando o responsável em cada linha.

### Alterações

**1. `src/components/ActivateLeads.tsx` — Lista (tabela)**
- Adicionar nova coluna **"👤 Responsável"** no `TableHeader` (visível apenas para `isAdmin || isGestor`), entre "Nome" e "Última Atividade".
- Em cada linha (`TableCell`), exibir um badge com:
  - Avatar circular com inicial do nome + nome do usuário (`assignedUser.name`)
  - Se `lead.assigned_to === null`: badge cinza "🆓 Não atribuído"
  - Se atribuído ao próprio usuário logado: cor primária destacada ("Você")
  - Cores diferentes por usuário (hash do user_id para cor estável) para identificação rápida visual

**2. `src/components/ActivateLeads.tsx` — Filtro de usuário melhorado**
- O Select de usuário já existe (linhas 1831-1847). Melhorias:
  - Mostrar contagem de leads por usuário no dropdown: `👤 João (12)`
  - Adicionar busca rápida quando houver muitos usuários (>10)
  - Tornar o filtro mais visível (destacar com cor quando ativo)

**3. `src/modules/activate-leads/components/ActivateLeadCard.tsx` — Pipeline view**
- Adicionar no card do pipeline, no canto superior direito, um pequeno avatar+nome do responsável (mesma cor do badge da lista) para que o gestor identifique rapidamente no Kanban também.

**4. Coluna "Responsável" também no badge de status (mobile)**
- Em telas pequenas onde a coluna pode quebrar, garantir que abaixo do nome do lead também apareça `👤 Nome do responsável` em texto pequeno.

### Visualização resultante

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ☐ │ 👤 Nome           │ 👤 Responsável  │ 🕐 Atividade │ 📞 Tel ... │
├─────────────────────────────────────────────────────────────────────┤
│ ☐ │ JOSE NILTON       │ 🟢 João Silva   │ Tratado 1min │ ...        │
│   │ 🆕 Novo           │                 │              │            │
├─────────────────────────────────────────────────────────────────────┤
│ ☐ │ MARIA SOUZA       │ 🆓 Não atribuído│ há 2h        │ ...        │
└─────────────────────────────────────────────────────────────────────┘
```

Filtro topo: `👥 Todos ▾` → ao abrir mostra `👤 João Silva (12)`, `👤 Ana (5)`, etc.

