

## AutoLead — Correção de 4 Bugs Críticos

### Problemas Identificados

**1. SMS mostra "sem créditos" para Admin**
O código busca SMS credits via `user_companies` → encontra gestor → busca `sms_credits`. Admin não está em `user_companies`, então `ucData` é null e credits fica 0. Mesmo problema em `AutoLeadHome`, `AutoLeadWizard` e `useAutoLead.getGestorSmsInfo`.

**Solução**: Se o usuário for admin (profile.role === 'admin'), buscar diretamente em `sms_credits` com o próprio user_id, sem passar por `user_companies`.

**2. Tags não aparecem**
O wizard busca tags de `activate_leads.origem`, mas a RPC `request_leads_with_credits` filtra por `leads_database.tag`. As tags reais no banco são: "PMT Alta", "Premium", "Tomadores".

**Solução**: Buscar tags de `leads_database.tag` (DISTINCT, WHERE is_available = true) em vez de `activate_leads.origem`.

**3. "Nenhum lead disponível com os filtros selecionados"**
Há 184K leads disponíveis. O problema é que o `useAutoLead.createJob` chama a RPC com `as any` e passa `tag_filter` — mas a RPC que está rodando no banco pode estar retornando erro silencioso por conta do overload. Além disso, o código não loga o erro real do RPC.

**Solução**: Remover o `as any` cast; garantir que os parâmetros estejam corretos; melhorar tratamento de erro para mostrar a mensagem real.

**4. Gestor/Admin precisa gerir disparos**
Falta uma seção de gerenciamento onde admin/gestor veja todos os jobs de autolead da empresa.

**Solução**: Adicionar uma aba "Gestão" no AutoLeadModule que mostra todos os jobs da empresa (para gestor) ou todos os jobs (para admin), com ações de pausar/retomar/cancelar.

### Arquivos a Modificar

| Arquivo | Ação |
|---|---|
| `src/modules/autolead/components/AutoLeadWizard.tsx` | Fix: SMS credits para admin (busca direta); tags de `leads_database.tag` |
| `src/modules/autolead/components/AutoLeadHome.tsx` | Fix: SMS credits para admin (busca direta) |
| `src/modules/autolead/hooks/useAutoLead.ts` | Fix: `getGestorSmsInfo` para admin; remover `as any` da RPC; corrigir params; admin vê todos os jobs |
| `src/modules/autolead/AutoLeadModule.tsx` | Adicionar aba "Gestão" para admin/gestor |
| `src/modules/autolead/components/AutoLeadManagement.tsx` | **Novo** — Painel de gestão com lista de todos os jobs, filtros por usuário, ações de controle |

### Detalhes Técnicos

**Fix SMS Credits (Admin bypass)**
```typescript
// Em vez de buscar via user_companies, admin busca direto:
if (profile?.role === 'admin') {
  const { data } = await supabase
    .from("sms_credits")
    .select("credits_balance")
    .eq("user_id", user.id)
    .maybeSingle();
  setSmsCredits(data?.credits_balance ?? 0);
  setIsGestor(true); // admin tem poderes de gestor
  return;
}
```

**Fix Tags (fonte correta)**
```typescript
// Buscar de leads_database em vez de activate_leads
const { data: tagData } = await supabase
  .from("leads_database")
  .select("tag")
  .not("tag", "is", null)
  .eq("is_available", true)
  .limit(500);
const unique = [...new Set(tagData?.map(l => l.tag).filter(Boolean))];
setAvailableTags(unique);
```

**Fix RPC Call (remover `as any`, params corretos)**
```typescript
const { data: leads, error: leadsError } = await supabase.rpc(
  "request_leads_with_credits",
  {
    leads_requested: wizardData.quantidade,
    ddd_filter: wizardData.ddds.length > 0 ? wizardData.ddds : null,
    convenio_filter: wizardData.tipoLead === "todos" ? null : wizardData.tipoLead,
    banco_filter: null,
    produto_filter: null,
    tag_filter: wizardData.tags?.length > 0 ? wizardData.tags : null,
  }
);
```

**Painel de Gestão** — Componente com:
- Tabela de todos os jobs (admin: todos; gestor: da empresa)
- Colunas: Usuário, Status, Leads enviados, SMS, Data, Ações
- Botões de Pausar/Retomar/Cancelar por job
- Contador de jobs ativos

