
# Plano: Melhorias na Aba Aprovações e Clientes do Módulo Televendas

## Problemas Identificados

1. **Aba Aprovações sem filtro por banco**: Não há como filtrar as aprovações pendentes por banco, dificultando a gestão quando há muitos itens.

2. **Aba Clientes sem ordenação alfabética e paginação**: Os clientes são exibidos por data de atualização e todos de uma vez, sem paginação.

3. **Cancelamento sem data de cancelamento**: Quando uma proposta é cancelada (`proposta_cancelada`), não há opção de registrar a data do cancelamento (similar à `data_pagamento`).

---

## Solução Proposta

### 1. Filtro por Banco na Aba Aprovações

**Alterações em `AprovacoesView.tsx`:**
- Adicionar prop `availableBanks` e `bankFilter`/`onBankFilterChange`
- Adicionar dropdown de seleção de banco no topo da view
- Filtrar os `approvalItems` pelo banco selecionado

**Alterações em `TelevendasModule.tsx`:**
- Criar estado separado `approvalBankFilter` para a aba aprovações
- Passar as props necessárias para AprovacoesView

### 2. Ordenação Alfabética e Paginação na Aba Clientes

**Alterações em `ClientesView.tsx`:**
- Alterar o `useMemo` de `clientGroups` para ordenar por `nome` em ordem alfabética (ao invés de por `ultimaAtualizacao`)
- Adicionar estado de paginação: `currentPage` e `itemsPerPage = 10`
- Implementar controles de paginação (Anterior/Próximo)
- Mostrar apenas 10 clientes por página
- Exibir indicador "Página X de Y"

### 3. Data de Cancelamento ao Confirmar Cancelamento

**Migração de banco de dados:**
- Adicionar coluna `data_cancelamento` (DATE) na tabela `televendas`

**Alterações em `types.ts`:**
- Adicionar `data_cancelamento?: string | null` no tipo `Televenda`

**Alterações em `StatusChangeModal.tsx`:**
- Adicionar `proposta_cancelada` à lista de status que requerem data
- Criar array separado `CANCELLATION_STATUSES`
- Exibir date picker com label "Data do Cancelamento" quando o status for de cancelamento

**Alterações em `TelevendasModule.tsx`:**
- Modificar `confirmStatusChange` para salvar `data_cancelamento` quando aplicável

**Alterações em `DetailModal.tsx`:**
- Exibir "Data do Cancelamento" quando a proposta estiver cancelada

---

## Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/` | Adicionar coluna `data_cancelamento` |
| `src/modules/televendas/types.ts` | Adicionar `data_cancelamento` ao tipo Televenda |
| `src/modules/televendas/views/AprovacoesView.tsx` | Filtro por banco |
| `src/modules/televendas/views/ClientesView.tsx` | Ordenação alfabética + paginação |
| `src/modules/televendas/components/StatusChangeModal.tsx` | Date picker para cancelamentos |
| `src/modules/televendas/TelevendasModule.tsx` | Estado do filtro de banco + salvar data_cancelamento |
| `src/modules/televendas/components/DetailModal.tsx` | Exibir data de cancelamento |

---

## Detalhes Técnicos

### Ordenação e Paginação de Clientes

```typescript
// ClientesView.tsx
const [currentPage, setCurrentPage] = useState(1);
const ITEMS_PER_PAGE = 10;

const clientGroups = useMemo(() => {
  // ... grouping logic ...
  return Array.from(groups.values()).sort(
    (a, b) => a.nome.localeCompare(b.nome, 'pt-BR') // Ordem alfabética
  );
}, [televendas]);

const paginatedClients = useMemo(() => {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  return clientGroups.slice(startIndex, startIndex + ITEMS_PER_PAGE);
}, [clientGroups, currentPage]);

const totalPages = Math.ceil(clientGroups.length / ITEMS_PER_PAGE);
```

### Filtro por Banco em Aprovações

```typescript
// AprovacoesView.tsx - Nova interface
interface AprovacoesViewProps {
  // ... props existentes ...
  availableBanks: string[];
  bankFilter: string;
  onBankFilterChange: (bank: string) => void;
}

// Filtro aplicado
const filteredApprovalItems = useMemo(() => {
  if (bankFilter === "all") return approvalItems;
  return approvalItems.filter(tv => tv.banco === bankFilter);
}, [approvalItems, bankFilter]);
```

### Date Picker para Cancelamentos

```typescript
// StatusChangeModal.tsx
const PAYMENT_STATUSES = ["pago_aguardando", "proposta_paga"];
const CANCELLATION_STATUSES = ["proposta_cancelada"];

const requiresPaymentDate = PAYMENT_STATUSES.includes(newStatus);
const requiresCancellationDate = CANCELLATION_STATUSES.includes(newStatus);

// No modal:
{requiresCancellationDate && (
  <DatePicker 
    label="Data do Cancelamento" 
    value={cancellationDate}
    onChange={setCancellationDate}
  />
)}
```

### Migração SQL

```sql
ALTER TABLE public.televendas 
ADD COLUMN IF NOT EXISTS data_cancelamento DATE NULL;

COMMENT ON COLUMN public.televendas.data_cancelamento IS 'Data em que a proposta foi cancelada';
```

---

## Comportamento Esperado

### Aba Aprovações
- Dropdown de filtro por banco no topo
- Opções: "Todos os bancos" + bancos únicos das propostas pendentes
- Filtragem instantânea ao selecionar um banco
- Contagem de itens atualizada conforme o filtro

### Aba Clientes
- Clientes ordenados de A a Z pelo nome
- Máximo de 10 clientes por página
- Botões "Anterior" / "Próximo" para navegação
- Indicador "Página 1 de 5" (exemplo)
- Reset da página ao mudar filtros

### Cancelamento com Data
- Ao mudar status para "Proposta Cancelada", aparece date picker
- Data padrão: hoje
- Campo salvo no banco como `data_cancelamento`
- Exibido no modal de detalhes quando aplicável

---

## Resumo de Entregas

1. Dropdown de filtro por banco na aba Aprovações
2. Ordenação alfabética (A-Z) na aba Clientes
3. Paginação com 10 clientes por página
4. Date picker para registrar data do cancelamento
5. Exibição da data de cancelamento no modal de detalhes
