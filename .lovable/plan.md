

## Fix: Erro de Ambiguidade na RPC `request_leads_with_credits` no SMS

### Problema

A chamada RPC no `CampaignsView.tsx` passa apenas 5 parâmetros (`leads_requested`, `ddd_filter`, `convenio_filter`, `banco_filter`, `produto_filter`), mas a função tem duas sobrecargas (5 e 6 parâmetros). O PostgreSQL não consegue decidir qual usar.

### Solução

Adicionar `tag_filter: null` à chamada RPC na linha 380-386 do `CampaignsView.tsx`.

### Mudança

| Arquivo | Ação |
|---|---|
| `src/modules/sms/views/CampaignsView.tsx` | Adicionar `tag_filter: null` ao objeto de parâmetros da chamada `request_leads_with_credits` (linha ~386) |

Isso resolve a ambiguidade forçando o PostgreSQL a usar a sobrecarga de 6 parâmetros.

