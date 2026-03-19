

## Registrar Número WhatsApp Usado no Histórico do Lead ✅

### Implementação

Adicionado callback `onSent` ao `WhatsAppSendDialog` que retorna `{ instanceName, instancePhone, sentVia }` após envio bem-sucedido (API ou link wa.me).

| Arquivo | Ação |
|---|---|
| `src/components/WhatsAppSendDialog.tsx` | Nova prop `onSent` + export `WhatsAppSentInfo` type |
| `src/modules/leads-premium/components/LeadDetailDrawer.tsx` | Registra no JSONB `history` do lead |
| `src/modules/leads-premium/components/LeadListItem.tsx` | Registra no JSONB `history` do lead |
| `src/components/ActivateLeads.tsx` | Registra em `activate_leads_history` |
| `src/components/MyClientsList.tsx` | Registra em `client_interactions` |
| `src/components/MyClientsKanban.tsx` | Registra em `pipeline_history` |
