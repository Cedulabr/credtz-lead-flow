

## Fix: AutoLead RPC Ambiguity + Mobile Layout

### 1. RPC Ambiguity Error

The database has two overloads of `request_leads_with_credits`:
- One with 5 params: `(convenio_filter, banco_filter, produto_filter, leads_requested, ddd_filter)`
- One with 6 params: `(convenio_filter, banco_filter, produto_filter, leads_requested, ddd_filter, tag_filter)`

The current call only passes 3 named params (`leads_requested`, `ddd_filter`, `convenio_filter`), so PostgreSQL can't choose between them.

**Fix in `useAutoLead.ts`**: Pass all parameters explicitly to match the 5-param overload:

```typescript
const { data: leads, error: leadsError } = await supabase.rpc(
  "request_leads_with_credits" as any,
  {
    leads_requested: wizardData.quantidade,
    ddd_filter: wizardData.ddds.length > 0 ? wizardData.ddds : null,
    convenio_filter: wizardData.tipoLead === "todos" ? null : wizardData.tipoLead,
    banco_filter: null,
    produto_filter: null,
  }
);
```

### 2. Mobile Layout Fix — AutoLeadWizard

The Sheet uses `h-[90vh]` which pushes buttons off-screen on small devices. Changes:

- Reduce sheet height to `h-[85vh]` with `max-h-[calc(100dvh-2rem)]`
- Add `pb-safe` (safe area padding) to the button bar
- Make button bar sticky with smaller padding
- Reduce internal spacing to fit content better

### Files to Modify

| File | Change |
|---|---|
| `src/modules/autolead/hooks/useAutoLead.ts` | Pass all 5 RPC params explicitly |
| `src/modules/autolead/components/AutoLeadWizard.tsx` | Fix mobile layout/button visibility |

