

## Plano: Dashboard Modular com Cards Interativos

### Objetivo

Criar um dashboard moderno com cards informativos para os módulos solicitados, incluindo dados em tempo real, status de API e navegação integrada.

### Arquitetura Proposta

O dashboard será implementado no `ConsultorDashboard.tsx` (para colaboradores) e opcionalmente integrado ao `Dashboard.tsx` (para admin/gestor), seguindo o padrão visual existente com `motion` e cards responsivos.

### Cards a Implementar

| Card | Fonte de Dados | Valor Principal | Descrição | Navegação |
|------|----------------|-----------------|-----------|-----------|
| **Leads Premium** | `leads` (assigned_to = user, status != new_lead) | Contagem | "Leads trabalhados este mês" | `leads` |
| **Radar de Oportunidades** | `radar_credits` (credits_balance) | Créditos disponíveis | "Créditos para buscas" | `radar` |
| **Leads Ativados** | `activate_leads` (assigned_to = user) | Contagem | "Leads ativos disponíveis" | `activate-leads` |
| **Vendas Televendas** | `televendas` (user_id = user, status = pago) | Contagem | "Vendas cadastradas este mês" | `televendas-manage` |
| **Documentos Salvos** | `client_documents` (uploaded_by = user) | Contagem | "Documentações armazenadas" | `documents` |
| **API WhatsApp** | `whatsapp_instances` (hasToken) | "Conectado" / "Desconectado" | Botão "Verificar" | `whatsapp` |
| **Crédito SMS** | `sms_credits` (credits_balance) | Saldo numérico | "Créditos disponíveis" | `sms` |

### Layout Visual

```text
┌────────────────────────────────────────────────────────────────┐
│  Bom dia, João! 👋                    [Atualizar]              │
│  Terça, 9 de março                                             │
└────────────────────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ⭐ Leads     │ │ 📡 Radar     │ │ ⚡ Leads     │
│   Premium    │ │ Oportunid.   │ │   Ativados   │
│              │ │              │ │              │
│     127      │ │     45       │ │      89      │
│ trabalhados  │ │ créditos     │ │ disponíveis  │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🛒 Vendas    │ │ 📄 Docs      │ │ 💬 WhatsApp  │
│ Televendas   │ │ Salvos       │ │   API        │
│              │ │              │ │              │
│     23       │ │     156      │ │ ● Conectado  │
│ este mês     │ │ documentos   │ │ [Verificar]  │
└──────────────┘ └──────────────┘ └──────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 📱 Crédito SMS                                                  │
│                                                                 │
│ Saldo: 1.250 créditos disponíveis para envio                   │
│ [Ir para SMS]                                                  │
└────────────────────────────────────────────────────────────────┘
```

### Detalhes Técnicos

**1. Hook de Dados do Dashboard**

Criar queries paralelas em `useEffect` para buscar:
- Contagem de leads premium (mês atual)
- Contagem de activate leads (atribuídos ao usuário)
- Vendas do televendas (status = pago, mês atual)
- Documentos salvos (total)
- Créditos Radar (`radar_credits.credits_balance`)
- Créditos SMS (`sms_credits.credits_balance`)
- Instâncias WhatsApp (`whatsapp_instances` com token)

**2. Verificação de Conexão WhatsApp**

O botão "Verificar" chamará a edge function `send-whatsapp` em modo teste (sem enviar mensagem) para validar se o token está funcional, atualizando o status visual.

**3. Cards Clicáveis**

Cada card terá `onClick={() => onNavigate('tab')}` com hover states e cursor pointer, seguindo o padrão já usado nos cards de recontatos.

**4. Grid Responsivo**

```css
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
```

### Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `src/components/ConsultorDashboard.tsx` | Redesenhar com 7 cards interativos |

### Dependências Existentes

- `useWhatsApp` hook (verificação de instâncias)
- Tabelas: `leads`, `activate_leads`, `televendas`, `client_documents`, `sms_credits`, `radar_credits`, `whatsapp_instances`
- Todas as queries usam RLS com `auth.uid()`

