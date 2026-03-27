

## Fix: Tags não aparecem no AutoLead — Timeout na query

### Causa raiz

O console mostra: `Tags query error: canceling statement due to statement timeout`. A query atual faz um SELECT direto na tabela `leads_database` com filtro `is_available = true` e `.limit(500)`, o que causa um full table scan lento demais.

Já existe uma RPC function `get_available_tags` otimizada que é usada no `RequestLeadsModal` — basta reutilizá-la.

### Correção

**Arquivo**: `src/modules/autolead/components/AutoLeadWizard.tsx`

Substituir a query direta (linhas 73-94) por chamada à RPC existente:

```typescript
// ANTES (timeout)
const { data: tagData } = await supabase
  .from("leads_database")
  .select("tag")
  .not("tag", "is", null)
  .eq("is_available", true)
  .limit(500);

// DEPOIS (usa RPC otimizada)
const { data: tagData, error } = await supabase.rpc('get_available_tags');
if (tagData) {
  const unique = tagData.map((t: any) => t.tag).filter(Boolean);
  setAvailableTags(unique);
}
```

Mudança única e cirúrgica — sem alteração de layout ou lógica.

