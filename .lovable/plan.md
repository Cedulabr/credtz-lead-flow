

## Registrar Número WhatsApp Usado no Histórico do Lead

### Abordagem

Adicionar um callback `onSent` ao `WhatsAppSendDialog` que retorna os dados da instância usada (nome da instância e número de telefone). Cada módulo consumidor usará esse callback para registrar no histórico do lead qual número WhatsApp foi utilizado para o contato.

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/components/WhatsAppSendDialog.tsx` | Adicionar prop `onSent` com callback que retorna `{ instanceName, instancePhone, sentVia }`. Chamar após envio bem-sucedido |
| `src/modules/leads-premium/components/LeadDetailDrawer.tsx` | Consumir `onSent` para registrar no history do lead via `updateLeadStatus` |
| `src/modules/leads-premium/components/LeadListItem.tsx` | Consumir `onSent` para registrar no history do lead |
| `src/components/ActivateLeads.tsx` | Consumir `onSent` para salvar no histórico do activate_lead |
| `src/components/MyClientsList.tsx` | Consumir `onSent` para registrar contato WhatsApp no histórico |
| `src/components/MyClientsKanban.tsx` | Consumir `onSent` para registrar contato WhatsApp no histórico |

### Detalhes

**1. WhatsAppSendDialog — nova prop `onSent`**

```typescript
interface WhatsAppSendDialogProps {
  // ... existing
  onSent?: (info: { instanceName: string; instancePhone: string | null; sentVia: 'api' | 'link' }) => void;
}
```

No `handleSend`, após sucesso, chamar:
```typescript
onSent?.({
  instanceName: selectedInstance?.instance_name || '',
  instancePhone: selectedInstance?.phone_number || null,
  sentVia: 'api'
});
```

No `handleFallback`, chamar com `sentVia: 'link'`.

**2. Módulos consumidores — registrar no histórico**

Cada módulo adicionará uma entrada de histórico com action `whatsapp_sent` contendo:
```json
{
  "action": "whatsapp_sent",
  "timestamp": "...",
  "user_id": "...",
  "user_name": "...",
  "whatsapp_instance": "Instância Principal",
  "whatsapp_number": "5585999999999",
  "sent_via": "api"
}
```

- **Leads Premium**: Usar a função `updateLeadStatus` existente ou inserir diretamente no campo `history` (JSONB) do lead
- **Activate Leads**: Atualizar o campo de observações ou histórico do activate_lead
- **Meus Clientes**: Registrar no histórico da proposta (tabela `televendas` ou `clientes`)

