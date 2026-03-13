

## Módulo AutoLead — Prospecção Automática via WhatsApp

### Visão Geral

Novo módulo `src/modules/autolead/` que combina créditos de Leads Premium + instâncias WhatsApp + lógica anti-ban para prospecção automática. Interface mobile-first com wizard de configuração e timeline de acompanhamento.

### 1. Database — Tabelas e RLS

**Tabela `autolead_jobs`**:
```sql
id uuid PK, user_id uuid, company_id uuid,
total_leads int, leads_sent int DEFAULT 0, leads_failed int DEFAULT 0,
status text DEFAULT 'draft', -- draft, running, paused, completed, cancelled
message_template text, use_default_message boolean DEFAULT true,
selected_ddds text[], selected_tags text[], tipo_lead text,
whatsapp_instance_ids text[],
max_per_number_day int DEFAULT 40,
pause_every int DEFAULT 10, pause_minutes int DEFAULT 10,
send_window_start time DEFAULT '08:30', send_window_end time DEFAULT '18:30',
created_at, started_at, paused_at, finished_at
```

**Tabela `autolead_messages`**:
```sql
id uuid PK, job_id uuid FK, lead_id uuid,
lead_name text, phone text, whatsapp_instance_id uuid,
message text, status text DEFAULT 'scheduled', -- scheduled, sending, sent, failed, cancelled
scheduled_at timestamptz, sent_at timestamptz, error_message text,
created_at
```

RLS: Usuário vê os próprios; gestor vê da empresa; admin vê todos (mesmo padrão do WhatsAppConfig).

### 2. Edge Function — `autolead-worker`

Invocada via cron (pg_cron) a cada 1 minuto:
1. Busca mensagens com `status = 'scheduled'` e `scheduled_at <= now()`
2. Agrupa por job, verifica se job está `running`
3. Pega token da `whatsapp_instances` correspondente
4. Envia via WhatsAPI (mesma lógica de `send-whatsapp`)
5. Atualiza status para `sent` ou `failed`
6. Incrementa `leads_sent`/`leads_failed` no job
7. Se todas enviadas, marca job como `completed`

### 3. Lógica Anti-Ban (ao criar o job)

Quando o usuário confirma, o sistema gera os registros em `autolead_messages` com:

- **Shuffle**: leads embaralhados aleatoriamente
- **Delay aleatório**: `scheduled_at` com intervalo de 2-7 min entre cada mensagem
- **Rotação de WhatsApp**: round-robin entre instâncias selecionadas, nunca repetindo consecutivamente
- **Janela de horário**: se `scheduled_at` cair fora de 08:30-18:30, empurra para o próximo dia útil
- **Pausa automática**: a cada N mensagens (default 10), adiciona pausa extra de 10 min
- **Limite diário**: máx 40 mensagens por instância/dia; se exceder, agenda para o dia seguinte

### 4. Frontend — Estrutura de Arquivos

```
src/modules/autolead/
├── AutoLeadModule.tsx          # Container principal com views
├── index.ts                    # Export
├── types.ts                    # Tipos e constantes
├── hooks/
│   └── useAutoLead.ts          # CRUD de jobs, fetch messages, controle
├── components/
│   ├── AutoLeadHome.tsx        # Tela inicial (créditos + botão iniciar)
│   ├── AutoLeadWizard.tsx      # Wizard 6 etapas (Sheet mobile / Dialog desktop)
│   ├── AutoLeadTimeline.tsx    # Acompanhamento em tempo real
│   └── AutoLeadJobCard.tsx     # Card de job ativo/histórico
└── views/
    └── JobDetailView.tsx       # Detalhe de um job específico
```

### 5. Wizard — 6 Etapas

| Etapa | Título | Ação |
|-------|--------|------|
| 1 | Créditos | Mostra saldo, input de quantidade (slider/presets 5/10/15/20/30) |
| 2 | DDD | Multi-select de DDDs (mesmo componente do Leads Premium) |
| 3 | TAG | Single-select tipo lead (INSS, Servidor, FGTS, etc.) |
| 4 | Mensagem | Radio: padrão vs personalizar. Editor com variáveis `{{nome}}`, `{{cidade}}`, `{{beneficio}}` |
| 5 | WhatsApps | Checkbox list de instâncias conectadas (mínimo 1). Usa `useWhatsApp` |
| 6 | Confirmar | Resumo + botão "Iniciar Prospecção" |

Ao confirmar:
1. Chama `requestLeads` (RPC existente) para obter leads
2. Cria registro em `autolead_jobs`
3. Gera `autolead_messages` com scheduling anti-ban
4. Redireciona para timeline

### 6. Timeline de Acompanhamento

- Cards com status em tempo real (realtime subscription em `autolead_messages`)
- Indicadores: enviados/total, próximo envio, taxa de sucesso
- Botões: Pausar / Retomar / Cancelar
- Pausar: atualiza job para `paused`, worker ignora mensagens scheduled desse job
- Cancelar: marca mensagens pending como `cancelled`

### 7. Integração no App

- Adicionar nav item `autolead` com ícone `Zap` e permission `can_access_autolead`
- Lazy load em `LazyComponents.tsx`
- Registrar em `Index.tsx` (tabComponents + TAB_PERMISSIONS)
- Registrar em `Navigation.tsx`

### 8. Arquivos a Criar/Modificar

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar tabelas `autolead_jobs` e `autolead_messages` + RLS |
| `supabase/functions/autolead-worker/index.ts` | Edge function worker |
| `src/modules/autolead/` (8 arquivos) | Módulo frontend completo |
| `src/components/LazyComponents.tsx` | Adicionar lazy export |
| `src/components/Navigation.tsx` | Adicionar nav item |
| `src/pages/Index.tsx` | Registrar tab + permission |

### 9. Mensagem Padrão

```
Olá {{nome}}, tudo bem?

Estamos entrando em contato pois identificamos que você pode ter oportunidades disponíveis em seus contratos.

Se quiser mais informações, posso verificar aqui para você!
```

