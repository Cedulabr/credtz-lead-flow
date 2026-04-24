

## Correções no Leads Premium — Governo BA, banco/parcelas, telefone e blacklist 30 dias

### Diagnóstico (com base no estado atual do banco e código)

1. **Sistema entrega lead de outro produto ao pedir Governo:** o wizard envia `convenio_filter = 'GOVERNO BA'` corretamente, mas o usuário está selecionando "Servidor Público" sem perceber que `tipoLead='servidor'` no front mapeia para o convênio. Confirmado no banco: existem **184 084 leads INSS, 3 165 SIAPE e apenas 14 GOVERNO BA**. Como a etapa 2 do servidor ainda permite seguir mesmo sem UF e o `request_leads_with_credits` cai em fallback `convenio_filter=NULL`, ele entrega leads de qualquer convênio. Precisa **forçar `convenio='GOVERNO BA'`** quando `tipoLead='servidor'` e UF=BA.

2. **Banco/Consignatária não aparece para Governo:** todos os 14 leads de Governo importados têm `banco = NULL`. Olhando o parser `parseGovernoCSV` (linha 243): `const bancoI = idx('consignataria');`. O `idx` usa `headers.every(needle ⊂ h)` — funciona. Mas no **arquivo real** o cabeçalho vem com cedilha/acento corrompido (`ConsignatÃ¡ria`) e a função `normalizeHeader` precisa remover diacríticos antes do match. Provavelmente está removendo, mas a coluna **"Convênio"** extra na planilha quebrou a indexação porque `parseCSVLine` não lida com a última coluna acentuada. **Mais crítico:** o ADE veio para a coluna banco no preview (ex.: `BANCO - BRASIL [360]` está em `ade`, e `banco=NULL`). O mapeamento dos índices está deslocado.

3. **Parcelas pagas / prazo original (Prestações):** confirmado pelo banco — `parcelas_pagas=15017` (lixo, deveria ser ~15) e `parcela=120` (deveria ser valor R$). O parser está pegando colunas erradas. A coluna **"Prestações"** não está sendo mapeada para `parcelas_em_aberto` (prazo original) e **"Pagas"** está pegando outra coluna numérica.

4. **Aviso "leads com telefone" para Governo:** hoje só dispara para INSS/SIAPE/CLT. O usuário pede que **também dispare para Governo**.

5. **Blacklist de 30 dias:** já existe a tabela `leads_blacklist` (criada em `20251229193056`) e `add_lead_to_blacklist`/`blacklist_lead_with_duration`. Mas:
   - A função `request_leads_with_credits` **NÃO consulta `leads_blacklist`** — só checa `leads_distribution` (que tem expiração de **10 anos**, ou seja, eterna). Resultado: leads recusados por outro usuário podem ser entregues novamente; e o mesmo lead "trabalhado e devolvido" nunca volta para ninguém.
   - Precisamos que `leads_distribution.expires_at` seja **30 dias** (não 10 anos) e que a função respeite ambas tabelas.

---

### Mudanças

#### A. Correção do parser `parseGovernoCSV` em `src/components/ImportBase.tsx`

Reescrever os índices das colunas baseando-se **exatamente** no cabeçalho fornecido pelo usuário:

```
CPF | Servidor | Matrícula | Tipo Serviço (Servidor) | Serviço (Servidor) |
Margem Disponível (R$) | Margem Total (R$) | Consignatária | Situação | ADE |
Serviço (Consignatária) | Prestações | Pagas | Valor | Deferimento |
Quitação | Ultimo Desconto | Ultima Parcela | Convênio
```

Mapeamento corrigido:
- `banco` ← coluna **Consignatária** (índice 7)
- `prazo_original` (`parcelas_em_aberto`) ← **Prestações** (índice 11) — prazo total do contrato
- `parcelas_pagas` ← **Pagas** (índice 12)
- `parcela` ← **Valor** (índice 13)
- `ade` ← **ADE** (índice 9) — não confundir com banco
- Ignorar a coluna **Convênio** do CSV (já é "GOVERNO BA" pelo formato).

Substituir os `findIndex` heurísticos por uma função `findColumn(headers, candidates[])` que tenta múltiplas variações normalizadas. Adicionar sanitização extra para cabeçalhos com encoding quebrado (Latin-1 vs UTF-8). Logar no console o mapeamento detectado para debug.

Renomear o display: "Prazo original do contrato" no preview e no resumo do wizard, em vez de "Parcelas em aberto".

#### B. Reimportar dados do Governo BA já existentes (corrigir os 14 leads)

Como apenas 14 registros estão com dados errados, criar uma migration que **DELETE FROM leads_database WHERE convenio='GOVERNO BA' AND banco IS NULL** para limpar os registros corrompidos. Usuário reimporta o CSV depois do parser corrigido.

#### C. Forçar convênio quando tipoLead = 'servidor' (Governo)

Em `src/modules/leads-premium/components/RequestLeadsWizard/index.tsx` (handler `handleConfirm`) ou no hook `requestLeads`, garantir o mapeamento explícito:
```ts
const convenioFilter =
  data.tipoLead === 'inss'    ? 'INSS' :
  data.tipoLead === 'siape'   ? 'SIAPE' :
  data.tipoLead === 'servidor'? 'GOVERNO BA' :   // hoje só BA disponível
  data.tipoLead === 'clt'     ? 'CLT' :
  null;
```
Hoje o wizard envia `data.convenio` que pode estar nulo, caindo no fallback que entrega qualquer convênio.

#### D. Aviso "leads com telefone" também para Governo

Em `StepPerfil.tsx`, ampliar a condição que dispara `count_leads_with_phone` para incluir `'servidor'`. Em `count_leads_with_phone` (RPC já existe) o `convenio_filter` será `'GOVERNO BA'`. O banner `PhoneAlertBanner` aparece igual: **"Encontramos X leads do convênio GOVERNO BA com telefone. Deseja priorizar?"**

#### E. Blacklist de 30 dias respeitada na entrega de leads

**Migration SQL:**

1. Alterar default de `leads_distribution.expires_at` para **`now() + interval '30 days'`** (em vez de 10 anos).
2. **Backfill** dos registros existentes com `expires_at > now() + interval '60 days'` para `now() + interval '30 days'` — opcional, marcar como "expira em 30 dias a partir de agora" para limpar a base.
3. Recriar `request_leads_with_credits` adicionando dois filtros adicionais no SELECT:
   ```sql
   -- excluir leads na blacklist ativa (qualquer usuário, qualquer motivo)
   AND NOT EXISTS (
     SELECT 1 FROM public.leads_blacklist lb
     WHERE lb.cpf = ld.cpf
       AND lb.expires_at > now()
   )
   -- excluir leads em distribuição ativa (qualquer usuário)
   AND NOT EXISTS (
     SELECT 1 FROM public.leads_distribution dist
     WHERE dist.lead_id = ld.id
       AND dist.expires_at > now()
   )
   ```
   Trocar a inserção em `leads_distribution` para usar `now() + interval '30 days'` no `expires_at`.

4. Ao adicionar lead na blacklist (já existe `add_lead_to_blacklist`), garantir `duration_days=30` por padrão e usar nas transições para `recusou_oferta`, `sem_interesse`, `sem_possibilidade`, `nao_e_cliente`, `sem_retorno`, `nao_e_whatsapp`. Atualizar `useLeadsPremium.ts` linha 197-200 para incluir todos esses status com 30 dias de blacklist (preserva 60 dias só para `sem_interesse` se preferir, mas o usuário pediu **30 dias uniformes**).

#### F. Mensagem clara ao usuário quando não há leads

Se o `request_leads_with_credits` retornar 0, mostrar toast: **"Não há leads do convênio {Governo BA / INSS / SIAPE} disponíveis com os filtros atuais. Os leads podem estar em blacklist temporária ou já distribuídos."**

---

### Arquivos editados

- `src/components/ImportBase.tsx` — parser `parseGovernoCSV` corrigido, mapeamento por nome de coluna fixo, label "Prazo original"
- `src/modules/leads-premium/components/RequestLeadsWizard/index.tsx` — força `convenioFilter` baseado em `tipoLead`
- `src/modules/leads-premium/components/RequestLeadsWizard/StepPerfil.tsx` — banner de telefone também para `servidor`
- `src/modules/leads-premium/components/RequestLeadsWizard/StepResumo.tsx` — mostrar "Prazo original" quando aplicável
- `src/modules/leads-premium/hooks/useLeadsPremium.ts` — blacklist 30 dias para todos os status de descarte; passar `convenioFilter` correto
- `src/modules/leads-premium/components/RequestLeadsWizard/fields/ContractFiltersSection.tsx` — adicionar input "Prazo original mínimo" (opcional, espelha `parcelas_em_aberto`)

### Migration Supabase

```sql
-- 1. Limpar registros Governo BA corrompidos (banco NULL, parcelas inválidas)
DELETE FROM public.leads_database
WHERE convenio = 'GOVERNO BA' AND (banco IS NULL OR parcelas_pagas > 600);

-- 2. Alterar default de expires_at para 30 dias
ALTER TABLE public.leads_distribution
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

-- 3. Recriar request_leads_with_credits respeitando blacklist + distribution 30d
CREATE OR REPLACE FUNCTION public.request_leads_with_credits(
  convenio_filter text DEFAULT NULL,
  banco_filter text DEFAULT NULL,
  produto_filter text DEFAULT NULL,
  leads_requested integer DEFAULT 10,
  ddd_filter text[] DEFAULT NULL,
  tag_filter text[] DEFAULT NULL,
  parcela_min numeric DEFAULT NULL,
  parcela_max numeric DEFAULT NULL,
  margem_min numeric DEFAULT NULL
) RETURNS TABLE(...) ...
-- adiciona filtro NOT EXISTS leads_blacklist (expires_at > now())
-- altera leads_distribution.expires_at insert para now() + interval '30 days'
```

### Resultado esperado

- Importar a planilha de Governo BA novamente: bancos (Consignatária), parcelas pagas, prazo original (Prestações) e valor de parcela aparecem corretamente.
- Pedir leads de "Servidor Público" entrega **somente** GOVERNO BA, nunca INSS/SIAPE.
- Banner "leads com telefone" também aparece para Governo.
- Filtro de Banco no wizard mostra os bancos reais dos leads de Governo (BRADESCO, BMG, etc.).
- Blacklist de 30 dias: leads recusados por qualquer usuário ficam ocultos por 30 dias para todos. Após 30 dias, voltam ao pool. Leads em distribuição ativa (não trabalhados ainda) ficam ocultos por 30 dias após a entrega — depois retornam ao pool se não foram trabalhados.

