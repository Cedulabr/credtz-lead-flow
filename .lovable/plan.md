
# Plano: Adicionar Data de Pagamento ao Marcar Proposta como Paga

## Problema Identificado
Atualmente, quando uma proposta é marcada como "paga", não há opção para registrar a **data em que o pagamento foi efetivado**. O sistema apenas registra quando o status foi alterado (`status_updated_at`), mas não a data real do pagamento.

---

## Solução Proposta

### 1. Adicionar Coluna no Banco de Dados

Nova coluna `data_pagamento` na tabela `televendas`:

```sql
ALTER TABLE public.televendas
ADD COLUMN data_pagamento DATE NULL;
```

### 2. Modificar o Modal de Mudança de Status

Atualizar o `StatusChangeModal.tsx` para:
- Detectar quando o novo status é um status de pagamento (`pago_aguardando`, `proposta_paga`)
- Exibir um **date picker** para selecionar a data do pagamento
- Por padrão, mostrar a data de hoje
- O campo será opcional mas recomendado

### 3. Atualizar a Lógica de Confirmação

Modificar a função `confirmStatusChange` no `TelevendasModule.tsx` para:
- Receber a data de pagamento como parâmetro adicional
- Salvar no banco de dados junto com a atualização de status

### 4. Exibir a Data de Pagamento

Adicionar no `DetailModal.tsx`:
- Exibir a "Data de Pagamento" quando a proposta estiver paga

---

## Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/` | Nova migração para adicionar coluna `data_pagamento` |
| `src/modules/televendas/types.ts` | Adicionar `data_pagamento?: string` no tipo `Televenda` |
| `src/modules/televendas/components/StatusChangeModal.tsx` | Adicionar date picker para status de pagamento |
| `src/modules/televendas/TelevendasModule.tsx` | Atualizar `confirmStatusChange` para salvar `data_pagamento` |
| `src/modules/televendas/components/DetailModal.tsx` | Exibir data de pagamento na seção de operação |
| `src/integrations/supabase/types.ts` | Atualizar tipos gerados (automático) |

---

## Detalhes Técnicos

### Interface do Modal Atualizada

O `StatusChangeModal` será estendido com:

```typescript
interface StatusChangeModalProps {
  // ... props existentes
  onConfirm: (reason: string, paymentDate?: string) => Promise<void>;
}
```

Quando o `newStatus` for `pago_aguardando` ou `proposta_paga`:

```text
┌─────────────────────────────────────────────┐
│  Alterar Status da Proposta                 │
├─────────────────────────────────────────────┤
│                                             │
│  [Pendente] ──────▶ [Pago Aguard. Gestor]   │
│                                             │
│  ⚠️ Alteração crítica                       │
│  Esta alteração será registrada...          │
│                                             │
│  📅 Data do Pagamento *                     │
│  ┌─────────────────────────────────────┐    │
│  │  30/01/2026               📅        │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Motivo da alteração *                      │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│          [Cancelar]  [Confirmar Alteração]  │
└─────────────────────────────────────────────┘
```

### Atualização do Banco

```typescript
const { error: updateError } = await supabase
  .from("televendas")
  .update({ 
    status: newStatus, 
    status_updated_at: new Date().toISOString(),
    status_updated_by: user?.id,
    data_pagamento: paymentDate || null  // NOVO
  })
  .eq("id", tv.id);
```

### Exibição no DetailModal

Após "Data de Cadastro", adicionar:

```typescript
{televenda.data_pagamento && (
  <InfoRow 
    icon={CheckCircle} 
    label="Data do Pagamento" 
    value={formatDate(televenda.data_pagamento)}
    className="bg-green-500/5"
  />
)}
```

---

## Fluxo de Uso

1. Operador clica para alterar status para "Pago Aguardando Gestor"
2. Modal abre mostrando a transição de status
3. Date picker aparece com data de hoje selecionada por padrão
4. Operador pode alterar para a data real do pagamento
5. Operador preenche o motivo (obrigatório)
6. Ao confirmar, `data_pagamento` é salvo junto com o novo status

---

## Status que Exibem Date Picker

O date picker aparecerá apenas para os seguintes status:
- `pago_aguardando` - Operador informando que o pagamento foi efetuado
- `proposta_paga` - Gestor aprovando como pago (pode corrigir a data)

---

## Resumo de Entregas

1. Nova coluna `data_pagamento` no banco de dados
2. Date picker no modal de mudança de status (para status de pagamento)
3. Data de pagamento salva automaticamente
4. Exibição da data de pagamento no modal de detalhes
5. Tipos TypeScript atualizados
