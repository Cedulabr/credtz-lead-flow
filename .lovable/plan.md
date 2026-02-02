
# Plano: Adicionar Filtros de Tipo na Aba Aprovações

## Objetivo

Adicionar filtros rápidos na aba "Aprovações" para que o gestor possa visualizar separadamente:
- **Aguard Gestor** - Propostas pagas aguardando aprovação (`pago_aguardando`)
- **Aguard Cancelamento** - Solicitações de cancelamento aguardando (`cancelado_aguardando`)
- **Todos** - Todas as pendências (comportamento atual)

---

## Alterações no Arquivo

### Arquivo: `src/modules/televendas/views/AprovacoesView.tsx`

1. **Adicionar estado para o filtro de tipo:**
   ```typescript
   const [typeFilter, setTypeFilter] = useState("all");
   ```

2. **Criar constante com opções de filtro:**
   ```typescript
   const TYPE_FILTER_OPTIONS = [
     { value: "all", label: "Todos", emoji: "📋" },
     { value: "pago_aguardando", label: "Aguard Gestor", emoji: "💰" },
     { value: "cancelado_aguardando", label: "Aguard Cancel.", emoji: "❌" },
     { value: "solicitar_exclusao", label: "Aguard Exclusão", emoji: "🗑️" },
   ];
   ```

3. **Atualizar o filtro de items:**
   ```typescript
   const filteredApprovalItems = useMemo(() => {
     let items = approvalItems;
     
     // Filtrar por tipo
     if (typeFilter !== "all") {
       items = items.filter((tv) => tv.status === typeFilter);
     }
     
     // Filtrar por banco
     if (bankFilter !== "all") {
       items = items.filter((tv) => tv.banco === bankFilter);
     }
     
     return items;
   }, [approvalItems, bankFilter, typeFilter]);
   ```

4. **Adicionar botões de filtro rápido no banner:**
   Os filtros serão exibidos como botões/chips para seleção rápida, ao lado do filtro de banco existente.

---

## Layout Proposto

```text
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  X itens aguardando ação                                │
│                                                             │
│  [📋 Todos] [💰 Aguard Gestor] [❌ Aguard Cancel.] [🗑️ Excl.]│
│                                                             │
│  Banco: [Dropdown de bancos]                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Código das Alterações

### Estado e Constantes (início do componente)
```typescript
const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Todos", emoji: "📋", count: 0 },
  { value: "pago_aguardando", label: "Aguard Gestor", emoji: "💰", count: 0 },
  { value: "cancelado_aguardando", label: "Aguard Cancel.", emoji: "❌", count: 0 },
  { value: "solicitar_exclusao", label: "Aguard Exclusão", emoji: "🗑️", count: 0 },
];

// Dentro do componente:
const [typeFilter, setTypeFilter] = useState("all");
```

### Contagem dinâmica por tipo
```typescript
const filterOptionsWithCount = useMemo(() => {
  return TYPE_FILTER_OPTIONS.map(option => ({
    ...option,
    count: option.value === "all" 
      ? approvalItems.length 
      : approvalItems.filter(tv => tv.status === option.value).length
  })).filter(option => option.value === "all" || option.count > 0);
}, [approvalItems]);
```

### Botões de Filtro (no banner)
```typescript
<div className="flex flex-wrap items-center gap-2 mt-3">
  {filterOptionsWithCount.map((option) => (
    <Button
      key={option.value}
      variant={typeFilter === option.value ? "default" : "outline"}
      size="sm"
      onClick={() => setTypeFilter(option.value)}
      className="gap-1.5 h-8"
    >
      <span>{option.emoji}</span>
      <span>{option.label}</span>
      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
        {option.count}
      </Badge>
    </Button>
  ))}
</div>
```

---

## Comportamento Esperado

| Filtro Selecionado | O que mostra |
|--------------------|--------------|
| Todos | Todas as pendências (pago, cancelamento, exclusão, pendentes, devolvidos) |
| Aguard Gestor | Apenas propostas com status `pago_aguardando` |
| Aguard Cancel. | Apenas solicitações de cancelamento (`cancelado_aguardando`) |
| Aguard Exclusão | Apenas solicitações de exclusão (`solicitar_exclusao`) |

O filtro de banco continua funcionando em conjunto (filtros são cumulativos).

---

## Resumo

| Arquivo | Alteração |
|---------|-----------|
| `src/modules/televendas/views/AprovacoesView.tsx` | Adicionar filtros por tipo de aprovação com contagem dinâmica |
