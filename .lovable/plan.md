

## AutoLead — Agendamento, Envio Automatico e Multiplos Jobs

### Problemas Identificados

1. **Mensagens nao enviam**: Nao existe um **cron job** que invoque o `autolead-worker`. A edge function existe mas nunca e chamada, entao as mensagens ficam "scheduled" para sempre.

2. **Sem agendamento de data**: O job inicia imediatamente. O usuario quer poder escolher o dia/hora para iniciar o envio.

3. **Nao permite criar multiplos jobs**: O botao "Iniciar Prospecção" fica desabilitado quando ja existe um job ativo (`activeJob`). O usuario quer configurar varios envios.

4. **Gestores nao veem jobs da equipe**: O hook `useAutoLead.ts` filtra `eq("user_id", user.id)`, entao gestores so veem seus proprios jobs. A RLS ja permite acesso via `is_company_gestor`, mas a query do frontend nao busca por empresa.

### Solucao

| Mudanca | Arquivo |
|---|---|
| Criar cron job para invocar `autolead-worker` a cada minuto | SQL via insert tool (nao migration) |
| Adicionar step de agendamento no wizard (data/hora de inicio) | `AutoLeadWizard.tsx` |
| Adicionar campo `scheduled_start_at` ao tipo e ao job | `types.ts`, `useAutoLead.ts` |
| Permitir multiplos jobs simultaneos | `AutoLeadHome.tsx`, `useAutoLead.ts` |
| Gestores veem jobs da empresa | `useAutoLead.ts` |
| Novo status "scheduled" para jobs agendados | `types.ts`, `AutoLeadHome.tsx` |
| Migration: coluna `scheduled_start_at` na tabela | SQL migration |

### Detalhes

**1. Cron Job (causa raiz do envio)**

Usar `pg_cron` + `pg_net` para invocar `autolead-worker` a cada minuto. Isso e o que faz as mensagens serem processadas. Sem isso, nada envia.

**2. Agendamento no Wizard**

Adicionar um novo passo (ou campo no passo de confirmacao) com:
- Opcao "Iniciar agora" (default)
- Opcao "Agendar para" com date picker + time picker
- Se agendado, o job e criado com status `scheduled` e `scheduled_start_at`
- O worker so processa mensagens de jobs com status `running`
- Um segundo cron ou logica no worker verifica jobs `scheduled` cuja data ja passou e muda para `running`

**3. Multiplos jobs**

- Remover `disabled={!!activeJob}` do botao
- Mostrar lista de jobs ativos (nao apenas 1)
- Timeline aceita qualquer job, nao apenas o "activeJob"

**4. Gestores veem jobs da equipe**

No `useAutoLead.ts`, se o usuario for gestor, buscar jobs por `company_id` em vez de `user_id`. A RLS ja permite isso.

### Mudancas nos arquivos

**`types.ts`**: Adicionar `scheduled_start_at?: string` ao `WizardData` e `AutoLeadJob`

**`useAutoLead.ts`**:
- Buscar `company_id` do usuario
- Se gestor: query sem filtro `user_id`, usando `company_id`
- No `createJob`: se `scheduled_start_at` definido, criar job com status `scheduled` em vez de `running`; ajustar `scheduled_at` das mensagens relativo a data agendada

**`AutoLeadWizard.tsx`**:
- Novo step 6 (antes da confirmacao): "Quando iniciar?"
- Radio: "Agora" ou "Agendar"
- Se agendar: date picker + time picker
- Total de steps passa de 6 para 7

**`AutoLeadHome.tsx`**:
- Remover `disabled={!!activeJob}` do botao
- Mostrar multiplos jobs ativos em lista
- Adicionar status `scheduled` com badge amarelo

**`autolead-worker/index.ts`**:
- Adicionar logica no inicio: buscar jobs com status `scheduled` onde `scheduled_start_at <= now()` e mudar para `running`

**Migration SQL**: `ALTER TABLE autolead_jobs ADD COLUMN IF NOT EXISTS scheduled_start_at timestamptz`

**Cron Job SQL** (via insert tool): Agendar `autolead-worker` a cada minuto com `pg_cron`

