

## SMS Disparos — Adicionar "Meus Clientes" + Filtros por Status do Kanban

### Problema

O módulo de origem no disparo SMS não inclui "Meus Clientes" (tabela `propostas`). Além disso, os filtros de status do Leads Premium mostram "Em Andamento" em vez dos status reais do Kanban (Novos, Auto Leads, Aguardando Retorno, Agendamento, Fechados, Recusados).

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/modules/sms/types.ts` | Adicionar "Meus Clientes" ao `LEAD_SOURCE_OPTIONS`; substituir `LEAD_STATUS_FILTERS` por filtros dinâmicos por módulo |
| `src/modules/sms/views/CampaignsView.tsx` | Adicionar query para `propostas` no `handleImportLeads`; renderizar filtros de status dinâmicos conforme o módulo selecionado; adicionar `statusMap` para `meus_clientes` |

### Detalhes

**1. types.ts — Novo source + filtros por módulo**

```typescript
export const LEAD_SOURCE_OPTIONS = [
  { value: "activate_leads", label: "Activate Leads", icon: "⚡" },
  { value: "leads_premium", label: "Leads Premium", icon: "💎" },
  { value: "meus_clientes", label: "Meus Clientes", icon: "👤" },
  { value: "televendas", label: "Televendas", icon: "📞" },
];

export const LEAD_STATUS_FILTERS_BY_SOURCE: Record<string, {value:string;label:string}[]> = {
  activate_leads: [
    { value: "novo", label: "Novos" },
    { value: "autolead", label: "AutoLead" },
    { value: "em_andamento", label: "Em Andamento" },
    { value: "agendado", label: "Agendado" },
  ],
  leads_premium: [
    { value: "novo", label: "Novos" },
    { value: "autolead", label: "AutoLead" },
    { value: "aguardando_retorno", label: "Aguard. Retorno" },
    { value: "agendamento", label: "Agendamento" },
    { value: "fechado", label: "Fechados" },
    { value: "recusado", label: "Recusados" },
  ],
  meus_clientes: [
    { value: "aguardando_retorno", label: "Aguard. Retorno" },
    { value: "contato_futuro", label: "Contato Futuro" },
    { value: "em_andamento", label: "Em Andamento" },
    { value: "fechado", label: "Fechado" },
  ],
  televendas: [
    { value: "novo", label: "Novos" },
    { value: "em_andamento", label: "Em Andamento" },
    { value: "agendado", label: "Agendado" },
  ],
};
```

**2. CampaignsView.tsx — Query para `propostas` + filtros dinâmicos**

No `handleImportLeads`, adicionar bloco `meus_clientes`:
- Query da tabela `propostas` filtrando por `company_id` ou `user_id`
- Mapear `client_name` → name, `client_phone` → phone
- Filtrar por `client_status` conforme statusMap

No `statusMap`, adicionar:
```typescript
meus_clientes: {
  aguardando_retorno: ["aguardando_retorno"],
  contato_futuro: ["contato_futuro"],
  em_andamento: ["em_andamento"],
  fechado: ["cliente_fechado", "fechado"],
},
leads_premium: {
  novo: ["new_lead"],
  autolead: ["autolead", "auto_lead"],
  aguardando_retorno: ["aguardando_retorno"],
  agendamento: ["agendamento", "contato_futuro"],
  fechado: ["cliente_fechado"],
  recusado: ["recusou_oferta", "sem_interesse", "nao_e_cliente"],
},
```

Na renderização dos filtros, trocar `LEAD_STATUS_FILTERS` por `LEAD_STATUS_FILTERS_BY_SOURCE[leadSource]` para mostrar filtros contextuais ao módulo selecionado. Resetar `leadStatusFilter` para "all" quando trocar de módulo.

