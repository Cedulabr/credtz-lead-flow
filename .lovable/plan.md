

## Correções: WhatsApp Histórico + Leads Premium Contato Futuro

### Problema 1: WhatsApp — Admin/Gestor não vê histórico de mensagens e agendamentos

**Causa**: `fetchMessages` e `fetchScheduled` em `WhatsAppConfig.tsx` (linhas 197-216) filtram sempre por `.eq("user_id", user.id)`, ignorando o role do usuário.

**Correção em `src/components/WhatsAppConfig.tsx`**:

- `fetchMessages` (linha 197): Para admin, remover filtro `user_id`. Para gestor, buscar IDs de usuários da empresa via `user_companies` e usar `.in("user_id", companyUserIds)`.
- `fetchScheduled` (linha 208): Mesma lógica — admin vê todos, gestor vê da empresa, colaborador vê apenas os próprios.
- Adicionar colunas de identificação (nome do usuário) na tabela de histórico e agendamentos para admin/gestor saberem de quem é cada mensagem.

### Problema 2: Leads Premium — Contato Futuro não muda status

**Causa**: Quando o usuário seleciona `contato_futuro` pelo **dropdown da lista** (`LeadListItem.tsx`), o fluxo é:
1. `handleStatusSelect` → `onStatusChange(lead, value)` → `handleListStatusChange(lead, newStatus)` → `handleStatusChange(leadId, newStatus)` — **sem `additionalData`**.
2. Isso muda o status diretamente sem mostrar o modal de data.

No entanto, quando feito pelo **drawer** (`LeadDetailDrawer`), o modal aparece e a data é passada corretamente.

O problema real é que ao usar o dropdown da lista, o status `contato_futuro` é aplicado sem `future_contact_date`, o que pode funcionar tecnicamente mas não faz sentido no negócio. Se houver constraint ou trigger que exige a data, o update falha silenciosamente.

**Correção em `src/modules/leads-premium/LeadsPremiumModule.tsx`**:

- Interceptar `handleListStatusChange`: quando `newStatus === 'contato_futuro'`, abrir o lead no drawer com o modal de data em vez de mudar direto. Alternativa: abrir um modal inline de data futura (similar ao que já existe para simulação/digitação).

**Abordagem**: Adicionar um modal de contato futuro no `LeadsPremiumModule.tsx` (como já existe para simulação e digitação), que é disparado tanto pelo drawer quanto pelo dropdown da lista.

```typescript
// LeadsPremiumModule.tsx - novo state
const [showFutureContactModal, setShowFutureContactModal] = useState(false);
const [futureContactLead, setFutureContactLead] = useState<Lead | null>(null);
const [futureContactDate, setFutureContactDate] = useState("");

// handleListStatusChange atualizado
const handleListStatusChange = (lead: Lead, newStatus: string) => {
  if (newStatus === 'contato_futuro') {
    setFutureContactLead(lead);
    setFutureContactDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    setShowFutureContactModal(true);
    return;
  }
  handleStatusChange(lead.id, newStatus);
};
```

### Arquivos a Modificar

| Arquivo | Ação |
|---|---|
| `src/components/WhatsAppConfig.tsx` | Ajustar `fetchMessages` e `fetchScheduled` para respeitar role (admin/gestor/colaborador) |
| `src/modules/leads-premium/LeadsPremiumModule.tsx` | Interceptar `contato_futuro` no dropdown da lista para abrir modal de data |

