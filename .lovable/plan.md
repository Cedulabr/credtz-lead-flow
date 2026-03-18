

## SMS Disparos — Solicitar Novos Leads + Filtros Melhorados

### O que existe hoje

A aba "Disparos" já possui uma seção "Leads" dentro do dialog de Nova Campanha (linhas 480-507 de `CampaignsView.tsx`) que importa leads **já existentes** dos módulos. Porém:
- Não há como solicitar **novos** leads diretamente
- Falta o status "autolead" nos filtros
- Não há orientação inteligente sobre créditos SMS vs Leads Premium

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/modules/sms/views/CampaignsView.tsx` | Adicionar botão "+Leads" que abre modal de solicitação; atualizar filtros de status; adicionar banner de orientação de créditos |
| `src/modules/sms/types.ts` | Adicionar "autolead" aos filtros de status |

### Detalhes

**1. Filtro de status atualizado**

Substituir `LEAD_STATUS_FILTERS` para incluir os campos solicitados:
- Novos, AutoLead, Em Andamento, Agendado (alinhado com o pipeline do Leads Premium)

**2. Botão "+Leads" (solicitar novos leads)**

Dentro da tab "Leads" do dialog, abaixo do botão "Importar Leads", adicionar um botão "+Leads" estilizado que abre um mini-wizard inline (não um modal separado) com:
- Seletor de convênio (busca de `leads_database` como o `RequestLeadsModal`)
- Seletor de DDD (chips com os DDDs principais)
- Seletor de tags (busca de `leads_database.tag`)
- Input de quantidade
- Chama a mesma RPC `request_leads_with_credits` e depois importa os leads retornados para a lista de contatos SMS

**3. Banner inteligente de créditos**

Buscar ambos os saldos (SMS via `get_user_sms_credits` + Leads via `get_user_credits`) e exibir:
- Se tem mais SMS que leads: "Você tem 400 disparos SMS mas apenas 50 leads. Solicite mais leads!"
- Se tem mais leads que SMS: "Você tem 200 leads mas apenas 30 SMS. Adquira mais créditos SMS!"
- Se ambos zero: bloqueio com orientação ao gestor

O banner aparece no topo da seção "Leads" do dialog, com cores amber/blue conforme o caso.

**4. Fluxo completo**

Usuário abre Nova Campanha → Vai em "Leads" na origem:
1. Vê banner de créditos orientando
2. Pode importar leads já trabalhados (existente) filtrando por status (Novos, AutoLead, Andamento, Agendado)
3. Pode clicar "+Leads" para solicitar novos leads do banco → escolhe convênio, DDD, tag, quantidade → sistema puxa via RPC → cria lista de contatos SMS automaticamente

