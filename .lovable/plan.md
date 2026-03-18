

## SMS Disparos — Deduplicação, +Leads Visível, Relatórios e UX Mobile

### Problemas Identificados

1. **Importação duplica contatos** — `handleImportLeads` insere sem verificar se o telefone/CPF já existe em listas anteriores
2. **Botão +Leads não aparece** — Ele existe no código (linha 643) mas está dentro da aba "Leads" do dialog. Precisa ser mais visível e o fluxo mais intuitivo
3. **Sem registro de histórico de disparos** — O `handleSendCampaign` chama a edge function mas não gera relatório detalhado com nome+telefone visível no frontend
4. **Sem aviso de múltiplos telefones por CPF** — Leads com phone + phone2 não são tratados
5. **UX mobile fraca** — Dialog não é otimizado para telas pequenas

### Nota sobre o Build Error

O erro "Failed to load native binding" do `@swc/core` é um problema de infraestrutura do servidor de desenvolvimento, não do código. Ele se resolve sozinho ao recarregar. As mudanças de código abaixo não estão relacionadas.

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/modules/sms/views/CampaignsView.tsx` | Refatorar completamente: deduplicação, +Leads visível, múltiplos telefones, histórico, mobile UX |
| `src/modules/sms/types.ts` | Sem mudanças |

### Detalhes Técnicos

**1. Deduplicação na Importação**

Antes de inserir contatos na lista, buscar todos os telefones já existentes em `sms_contacts` do mesmo `created_by`:

```typescript
// Buscar contatos já existentes nas listas do usuário
const { data: existingContacts } = await supabase
  .from("sms_contacts")
  .select("phone, list_id")
  .in("list_id", contactLists.map(l => l.id));

const existingPhones = new Set(existingContacts?.map(c => c.phone) || []);
const newLeads = leads.filter(l => !existingPhones.has(l.phone));
const duplicateCount = leads.length - newLeads.length;

if (duplicateCount > 0 && newLeads.length > 0) {
  // Mostrar dialog: "X contatos já foram importados. Deseja importar apenas os Y novos?"
}
if (newLeads.length === 0) {
  toast.info("Todos os contatos já foram importados anteriormente.");
  return;
}
```

Usar um `AlertDialog` intermediário para confirmar com o usuário antes de prosseguir.

**2. +Leads Mais Visível**

- Mover o botão "+Leads" para fora da aba "Leads" — colocá-lo como um botão secundário ao lado de "Nova Campanha" no header
- OU tornar o wizard parte do fluxo principal dentro da aba Leads, sempre visível (não escondido atrás de toggle)
- Decisão: Manter dentro da aba Leads mas tornar o wizard **sempre expandido** quando a aba Leads está selecionada, com o botão "+Leads" em destaque (estilo card com borda colorida) no topo

**3. Múltiplos Telefones por CPF**

Ao importar de `leads` ou `leads_database`, verificar `phone2`:

```typescript
// Contar leads com múltiplos telefones
const leadsWithMultiplePhones = rawLeads.filter(l => l.phone2);
if (leadsWithMultiplePhones.length > 0) {
  // Mostrar dialog: "X leads possuem mais de um número. Enviar para todos os números?"
  // Se sim: duplicar o contato com phone2
}
```

**4. Histórico de Disparos Melhorado**

O relatório CSV já existe (linha 362-396) mas falta:
- Adicionar o nome do contato no relatório (já está com `contact_name`)
- Após disparo, salvar um resumo na campanha (campo metadata ou notes)
- Mostrar mini-resumo inline no card da campanha

Após o `handleSendCampaign`, atualizar o card para mostrar: "Último disparo: X enviados, Y falhas — [Baixar Relatório]"

**5. UX Mobile**

- Dialog: usar `max-w-[95vw]` e `max-h-[85vh]` em mobile
- Botões de status: usar `grid-cols-2` em mobile em vez de `grid-cols-3`
- Wizard +Leads: layout empilhado em mobile
- DDDs: scroll horizontal em mobile

### Fluxo Interativo Proposto

```
Usuário abre "Nova Campanha"
  → Preenche nome e mensagem
  → Vai em "Leads" na origem
    → Vê banner de créditos
    → Escolhe módulo (Activate/Leads/Televendas)
    → Escolhe status (Novos/AutoLead/Andamento/Agendado)
    → Clica "Importar Leads"
      → Sistema verifica duplicatas
      → Se tem duplicatas: "130 contatos encontrados, 45 já importados. Importar apenas os 85 novos?"
      → Se tem múltiplos telefones: "12 leads possuem 2 números. Enviar para ambos?"
      → Importa e confirma
    → OU clica "+Leads" (botão em destaque)
      → Wizard inline abre: Convênio, DDD, Tag, Quantidade
      → Gera leads e importa automaticamente
  → Cria campanha
  → Clica "Disparar"
    → Sistema envia e registra histórico
    → Card mostra resumo: enviados/falhas
    → Botão "Relatório" gera CSV com nome+telefone+status+erro
```

