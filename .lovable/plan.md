

## AutoLead — SMS Portabilidade, Leads no Premium, Pipeline Kanban e Agendamento

### 4 Mudanças

**1. Adicionar template SMS "Portabilidade com Troco"**
Em `types.ts`, adicionar ao array `SMS_TEMPLATES` o modelo com link wa.me, igual aos demais.

**2. Leads do AutoLead aparecem no Leads Premium com status "autolead"**
No `useAutoLead.ts`, após o RPC `request_leads_with_credits` retornar os leads, inserir cada um na tabela `leads` com `status: 'autolead'` e `origem_lead: 'AutoLead'` — mesma lógica que `useLeadsPremium.ts` faz (linhas 303-324) mas com status diferente.

Adicionar o status `autolead` ao `PIPELINE_STAGES` em `types.ts` do módulo leads-premium.

**3. Atualizar colunas do Kanban Pipeline**
Em `PipelineView.tsx`, atualizar `PIPELINE_COLUMNS` para as 6 colunas solicitadas:
- Novos (`new_lead`)
- Auto Leads (`autolead`) — novo
- Em Andamento (`em_andamento`)
- Agendamento (`agendamento`)
- Fechado (`cliente_fechado`)
- Recusado (`recusou_oferta`)

Grid muda de `grid-cols-5` para `grid-cols-6`.

**4. Modal de agendamento ao arrastar para "Agendamento"**
No `PipelineView.tsx`, ao fazer drop na coluna `agendamento`, interceptar e abrir um modal/dialog com:
- Data do agendamento (input date)
- Horário (input time)
- Observação (textarea)
- Toggle "Agendar mensagem SMS" + campo de texto SMS
- Toggle "Agendar mensagem WhatsApp" + campo de texto WhatsApp

Ao confirmar, salvar `future_contact_date` e `future_contact_time` no lead, e agendar as mensagens na tabela `autolead_messages` (ou via SMS automation) se ativado.

### Arquivos a Modificar

| Arquivo | Ação |
|---|---|
| `src/modules/autolead/types.ts` | Adicionar SMS template "Portabilidade com Troco" |
| `src/modules/autolead/hooks/useAutoLead.ts` | Inserir leads na tabela `leads` com status `autolead` após RPC |
| `src/modules/leads-premium/types.ts` | Adicionar stage `autolead` ao `PIPELINE_STAGES` |
| `src/modules/leads-premium/views/PipelineView.tsx` | Atualizar colunas (6), adicionar modal de agendamento no drop |
| `src/modules/leads-premium/components/ScheduleModal.tsx` | Novo — Modal de agendamento com campos de data/hora e mensagens SMS/WA |

