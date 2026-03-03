

## Plano: Corrigir 4 problemas em WhatsApp, Leads Premium e Televendas

### Problema 1: Instancias WhatsApp mostram todas para colaboradores

**Causa:** Em `src/hooks/useWhatsApp.ts` (linha 40-48), o hook busca TODAS as instancias da empresa do usuario (`company_id`), sem filtrar por `user_id`. Colaboradores deveriam ver apenas instancias designadas a eles pelo gestor.

**Correcao em `src/hooks/useWhatsApp.ts`:**
- Para colaboradores: buscar apenas instancias onde `user_id = user.id` (remover a busca por `company_id` para colaboradores)
- A logica atual de "buscar instancias da empresa" deve ser mantida apenas para gestores e admins
- Verificar o role do usuario: se nao for gestor/admin, buscar somente `user_id = user.id`

```text
// Colaborador: apenas suas instancias
query.eq("user_id", user.id)

// Gestor/Admin: instancias da empresa + proprias
query.eq("company_id", companyId) OU query.eq("user_id", user.id)
```

Precisara buscar o `company_role` do usuario via `user_companies` e o `profile.role` para determinar se e gestor/admin.

---

### Problema 2: Leads Premium - Colaborador nao consegue mudar para "Contato Futuro" e nao pode editar CPF

**Causa 1 - Contato Futuro:** Em `LeadDetailDrawer.tsx` (linhas 445-474), os botoes de acao comercial nao incluem "Contato Futuro" como opcao. Existe "Agendar Retorno" (status `agendamento`) mas nao "Contato Futuro" (`contato_futuro`).

**Correcao:** Adicionar botao "Contato Futuro" na secao de acoes, ao lado de "Agendar Retorno".

**Causa 2 - Editar CPF:** O campo CPF no `LeadDetailDrawer.tsx` (linha 373-376) e exibido como texto puro, sem opcao de edicao. Colaboradores precisam poder editar o CPF dos leads.

**Correcao:** Tornar o campo CPF editavel com um botao de edicao inline. Ao clicar, transforma em Input, salva diretamente no banco.

---

### Problema 3: Televendas - Gestor nao consegue aprovar/rejeitar propostas

**Causa:** O erro no console revela tudo: `column "updated_at" of relation "sms_proposal_notifications" does not exist`. 

A trigger SQL `sms_sync_televendas_status()` e disparada toda vez que o status de uma proposta muda. Ela tenta executar:
```sql
UPDATE public.sms_proposal_notifications
SET sent = true, updated_at = now()
WHERE televendas_id = NEW.id AND sent = false;
```
Mas a tabela `sms_proposal_notifications` NAO possui coluna `updated_at`. Isso causa erro 42703, que faz o UPDATE inteiro falhar (incluindo a mudanca de status).

**Correcao via migracao SQL:** Adicionar a coluna `updated_at` na tabela `sms_proposal_notifications`:
```sql
ALTER TABLE public.sms_proposal_notifications 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
```

---

### Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | Adicionar coluna `updated_at` em `sms_proposal_notifications` |
| `src/hooks/useWhatsApp.ts` | Filtrar instancias por role: colaborador ve so as suas |
| `src/modules/leads-premium/components/LeadDetailDrawer.tsx` | Adicionar botao "Contato Futuro" + campo CPF editavel |

### Sequencia

1. Migracao SQL (desbloqueia aprovacoes de televendas)
2. Corrigir useWhatsApp.ts (filtro de instancias por role)
3. Corrigir LeadDetailDrawer.tsx (contato futuro + editar CPF)

