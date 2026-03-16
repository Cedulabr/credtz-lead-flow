

## AutoLead — Novas Copies, DDD com Tags e Preview de Mensagens

### Resumo

Três mudanças no módulo AutoLead:
1. Atualizar as copies de SMS e WhatsApp com o novo texto solicitado + 2 variações
2. Redesenhar o step de DDD para mostrar os principais primeiro com "Ver mais" expansível, e incluir seleção de Tags no mesmo step (como no módulo Pedir Leads)
3. Adicionar preview visual no resumo mostrando como as mensagens chegam via WhatsApp (balão verde) e SMS (balão cinza)

### Mudanças em Detalhe

**Step DDD + TAG (Step 1) — Merge dos steps 1 e 2 atuais:**
- DDDs em destaque (grid 5 colunas) com os 10 principais
- Botão "Ver mais DDDs" expandindo uma ScrollArea com todos os outros DDDs do Brasil
- Seção de Tags logo abaixo (carregadas do banco via `get_available_tags` RPC, como no Pedir Leads)
- Reduz o wizard de 7 para 6 steps

**Novas Copies WhatsApp (Step 2 — Mensagem WA):**
- Templates de WhatsApp selecionáveis em cards (como os SMS):
  1. **Mensagem Padrão** (a atual)
  2. **Novo Valor sem Aumento**: "Identificamos possibilidade de liberar um novo valor sem aumentar a sua parcela. Quer saber quanto? Fale comigo!"
  3. **Redução de Parcela**: "Conseguimos identificar uma condição especial para reduzir o valor da sua parcela atual..."

**Novas Copies SMS (Step 3):**
  1. **Novo Valor sem Aumento**: "Identificamos possibilidade de liberar um novo valor sem aumentar a sua parcela. Quer saber quanto? Fale comigo: {{whatsapp}}"
  2. **Redução de Parcela**: "Identificamos uma condição especial para reduzir o valor da sua parcela atual..."
  3. **Nova Oportunidade**: "Surgiu uma nova oportunidade de crédito para você..."

**Preview no Resumo (Step 5):**
- Seção "Como o lead vai receber" com dois cards visuais:
  - Balão verde estilo WhatsApp com a mensagem renderizada (substituindo variáveis por dados de exemplo)
  - Balão cinza estilo SMS com a mensagem renderizada
  - Mostra apenas SMS se `smsEnabled` estiver ativo

### Arquivos a Modificar

| Arquivo | Ação |
|---|---|
| `src/modules/autolead/types.ts` | Adicionar `WHATSAPP_TEMPLATES`, `ALL_DDDS`, `FEATURED_DDDS` como array de strings, atualizar `SMS_TEMPLATES`, adicionar `tags` ao `WizardData` |
| `src/modules/autolead/components/AutoLeadWizard.tsx` | Merge DDD+TAG em 1 step com pattern featured/expandable, WhatsApp templates selecionáveis, preview dual no resumo, reduzir de 7 para 6 steps |

