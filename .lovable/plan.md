

## Registrar Mensagem e Número no Histórico do Lead (WhatsApp)

### Problema

Hoje o `onSent` do `WhatsAppSendDialog` retorna apenas instância e método de envio, mas **não inclui a mensagem enviada** nem o áudio selecionado. Os módulos salvam no histórico que "WhatsApp foi enviado" mas sem o conteúdo da conversa.

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/components/WhatsAppSendDialog.tsx` | Expandir `WhatsAppSentInfo` com `message`, `audioTitle`, `clientPhone`; passar esses dados em todas as chamadas `onSent` |
| `src/modules/leads-premium/components/LeadDetailDrawer.tsx` | Salvar `message`, `audioTitle` e `clientPhone` no entry de histórico |
| `src/modules/leads-premium/components/LeadListItem.tsx` | Idem — salvar mensagem e dados no histórico |
| `src/components/ActivateLeads.tsx` | Incluir `message` e `audioTitle` no metadata/notes do `activate_leads_history` |
| `src/components/MyClientsList.tsx` | Incluir `message` e `audioTitle` no `client_interactions` |
| `src/components/MyClientsKanban.tsx` | Incluir `message` e `audioTitle` no `pipeline_history` notes/metadata |

### Detalhes

**1. WhatsAppSentInfo expandido**

```typescript
export interface WhatsAppSentInfo {
  instanceName: string;
  instancePhone: string | null;
  sentVia: 'api' | 'link';
  message: string;          // texto enviado
  audioTitle?: string;       // título do áudio se enviado
  clientPhone: string;       // telefone do cliente para quem enviou
}
```

Cada chamada `onSent?.()` no dialog será atualizada para incluir `message`, `selectedAudio?.title` e `fullPhone`.

**2. Consumidores — formato do registro**

Todos os módulos passarão a salvar no histórico/metadata:

```json
{
  "action": "whatsapp_sent",
  "whatsapp_instance": "Instância X",
  "whatsapp_number": "5585999...",
  "sent_via": "api",
  "message": "Olá João, tudo bem?",
  "audio_title": "Áudio de boas-vindas",
  "client_phone": "5585888..."
}
```

Isso permite rastreabilidade completa: quem enviou, de qual número, para qual número, e o que foi dito.

