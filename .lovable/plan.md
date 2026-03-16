

## Correções AutoLead — 3 Problemas

### 1. Template WhatsApp para Portabilidade com Troco (Faltando)
Os templates atuais não mencionam portabilidade/troco. Adicionar um novo template:
- **"Portabilidade com Troco"**: "Olá {{nome}}, tudo bem?\n\nIdentificamos que você pode fazer a portabilidade do seu empréstimo e ainda receber um troco! Quer saber o valor? Fale comigo!"

### 2. SMS com Link ao invés de número
Os SMS templates usam `{{whatsapp}}` que é substituído pelo número bruto (ex: 71986007832). Mudar para incluir link clicável:
- Substituir `{{whatsapp}}` por `https://wa.me/55{{whatsapp}}` nos templates SMS
- O hook `getWhatsAppPhone` já retorna o número limpo, então basta montar o link no template

### 3. Erro RPC `request_leads_with_credits` — Ambiguidade de Overload
O banco tem 2 versões da função: uma com 5 params e outra com 6 (inclui `tag_filter`). O código atual passa apenas 5 params, mas como o wizard agora tem tags, precisa passar `tag_filter` explicitamente para resolver a ambiguidade.

### Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/modules/autolead/types.ts` | Adicionar template WA "Portabilidade com Troco"; atualizar SMS templates com link `wa.me` |
| `src/modules/autolead/hooks/useAutoLead.ts` | Adicionar `tag_filter` na chamada RPC (linha 183-192) |

