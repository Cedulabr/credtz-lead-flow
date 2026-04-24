

## Reconstrução completa do modal "Pedir Novos Leads"

Refazer o wizard do zero com layout fixo (header/indicador/conteúdo scrollável/footer fixo), 5 etapas, e fluxo dinâmico baseado no convênio escolhido.

### 1. Estrutura de layout (corrige o bug crítico dos botões flutuantes)

**`src/modules/leads-premium/components/RequestLeadsWizard/index.tsx`** — reescrito:

- Dialog desktop: `max-w-[520px]` + `h-[90vh]` + `p-0` (remover padding interno do DialogContent para controlar tudo via flex).
- Mobile: `Sheet side="bottom"` com `h-[92vh] p-0`.
- Container interno em **flex column** com 4 regiões fixas:
  ```
  <div className="flex flex-col h-full overflow-hidden">
    <header className="flex-shrink-0 px-5 py-4 border-b">…título + X</header>
    <div className="flex-shrink-0 px-5 py-3 border-b bg-muted/30">…step indicator</div>
    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">…conteúdo da etapa</div>
    <footer className="flex-shrink-0 px-5 py-3 border-t bg-background flex gap-3">…Voltar / Próximo</footer>
  </div>
  ```
- O conteúdo central usa `overflow-y-auto` nativo (sem `ScrollArea` Radix, que causa interferência com `min-h-0` em alguns layouts). Garante que **o footer nunca seja empurrado para fora**.
- Botão **X** de fechar no canto superior direito do header (substitui o close padrão do Radix posicionado de forma confiável).
- Indicador de etapas: 5 bolinhas conectadas. Em telas `< 480px` (`sm:hidden`), mostrar apenas as bolinhas + label da etapa atual abaixo. Acima disso, mostrar as labels.

### 2. Step 1 — Tipo de Convênio (substitui StepTipoLead)

**`StepTipoLead.tsx`** — atualizar:

- Título: "Qual convênio você quer trabalhar?" / Subtítulo: "Selecione o convênio principal dos leads".
- Reduzir para **4 cards** (remover "FGTS" e "Todos"; renomear "Servidor" → "Servidor Público"):
  - 💛 **INSS** — "Aposentados e pensionistas INSS"
  - 🔵 **SIAPE** — "Servidores federais (folha federal)"
  - 🏛️ **Servidor Público** — "Estadual e municipal — escolha o estado"
  - 📋 **CLT / Privado** — "Trabalhadores com carteira assinada"
- Atualizar `TIPOS_LEAD` em `types.ts` com esses 4 ids: `inss`, `siape`, `servidor`, `clt`.
- Próximo desabilitado até `data.tipoLead` estar setado (já é o comportamento atual — manter `canProceed` para etapa 0).

### 3. Step 2 — Perfil dinâmico (refatorar StepPerfil)

**`StepPerfil.tsx`** — reescrito do zero, render condicional por `data.tipoLead`:

#### Componentes auxiliares (extraídos para arquivos novos em `RequestLeadsWizard/fields/`):
- `TagsField.tsx` — input de busca + dropdown de tags existentes + chips removíveis. Reusa o RPC `get_available_tags`.
- `DDDField.tsx` — chips de DDDs em destaque (FEATURED_DDDS) + colapsável "Ver todos os DDDs (N)" com lista completa e contagens. Botão "Limpar seleção".
- `EstadoField.tsx` — `<Select>` com nomes completos dos estados brasileiros (mapeamento UF→nome). Obrigatório para Servidor Público. Mostra erro "Selecione o estado para continuar" se vazio ao tentar avançar. Helper text: "A região é definida automaticamente pelo estado selecionado."
- `ContractFiltersSection.tsx` — seção colapsável "Filtros de contrato" (expandida por padrão para Servidor Público) com:
  - Banco / Consignatária (Select)
  - Faixa de parcela (Slider duplo 0–5000) — display "R$ 0 — R$ 5.000"
  - Margem disponível mínima (Input number)
  - Parcelas pagas (mínimo) (Input number) — **novo campo** `parcelasPagasMin: number | null`
  - Valor de parcela (Slider duplo 0–2000) — **alias do mesmo `parcelaMin/Max`** para evitar duplicação no schema (parcela == valor da parcela). Vou nomeá-lo "Valor de parcela" e remover o duplicado "Faixa de parcela" para não confundir — mantenho um único slider de parcela.

#### Fluxos por convênio:

| Convênio | Tags | DDD | Estado | Filtros contrato | Telefone alert |
|---|---|---|---|---|---|
| INSS | ✅ | ✅ | — | — | ✅ |
| SIAPE | ✅ | ✅ | — | — | ✅ |
| Servidor Público | — | — | ✅ obrigatório | ✅ expandido | — |
| CLT / Privado | ✅ | ✅ | — | — | ✅ |

#### Banner "Leads com telefone" (INSS/SIAPE/CLT)

Implementação: ao clicar **Próximo** na etapa 2 e `data.tipoLead ∈ {inss, siape, clt}`:
1. Disparar query: `supabase.rpc('count_leads_with_phone', { convenio_filter, ddd_filter, tag_filter })` — **nova RPC** que retorna `{ total: int, with_phone: int }` filtrando por `is_available=true` e `phone IS NOT NULL AND phone != ''`.
2. Se `with_phone > 0`, mostrar banner inline azul-claro **dentro da etapa 2** com dois botões:
   - **"Sim, com telefone"** → setar `data.requireTelefone = true`, avançar para Step 3.
   - **"Não, incluir todos"** → setar `data.requireTelefone = false`, avançar.
3. Se `with_phone === 0`, avançar direto.

Estado local da etapa: `phoneCheckResult: { with_phone, total } | null` + `isCheckingPhone: boolean`.

### 4. Step 3 — Quantidade

Sem alterações estruturais. Manter `StepQuantidade.tsx` atual.

### 5. Step 4 — Resumo (reescrever StepResumo)

Lista limpa agrupada por seção, mostrando apenas o que faz sentido pelo convênio escolhido:
- **Convênio**: nome
- **Estado** (se servidor): nome completo
- **DDDs**: lista ou "Todos"
- **Tags**: lista ou "Nenhuma"
- **Filtros de contrato** (se servidor): banco, faixa de parcela, margem mín, parcelas pagas mín — listar apenas os preenchidos. Se nenhum, mostrar "Padrão".
- **Leads com telefone**: "Sim" / "Não" / "Não aplicável" (servidor)
- **Quantidade** + **Créditos restantes** (mantém o card existente)

Cada linha com botão de ✏️ que volta à etapa correspondente.

### 6. Step 5 — Confirmar

Manter `StepConfirmacao.tsx` atual (preview de leads + aviso de prazo 48h). Atualizar a chamada `preview_available_leads` para passar `require_telefone` quando aplicável (se a RPC suportar; caso contrário, tratar no frontend filtrando o resultado).

### 7. Mudanças em `types.ts`

```ts
export interface LeadRequestData {
  tipoLead: 'inss' | 'siape' | 'servidor' | 'clt' | null;
  // perfil
  uf: string | null;          // obrigatório para servidor
  ddds: string[];
  tags: string[];
  requireTelefone: boolean | null;  // null = não perguntado, true/false = resposta
  // contrato (servidor)
  banco: string | null;
  parcelaMin: number | null;
  parcelaMax: number | null;
  margemMin: number | null;
  parcelasPagasMin: number | null;  // NOVO
  // quantidade
  quantidade: number;
  prioridade: 'recentes' | 'antigos' | 'aleatorio';
  // descontinuados (mantidos no tipo só para compat com hook):
  convenio: string | null;  // será derivado de tipoLead na hora de chamar a RPC
}

export const TIPOS_LEAD = [
  { id: 'inss',     label: 'INSS',             description: 'Aposentados e pensionistas INSS', icon: '💛' },
  { id: 'siape',    label: 'SIAPE',            description: 'Servidores federais (folha federal)', icon: '🔵' },
  { id: 'servidor', label: 'Servidor Público', description: 'Estadual e municipal — escolha o estado', icon: '🏛️' },
  { id: 'clt',      label: 'CLT / Privado',    description: 'Trabalhadores com carteira assinada', icon: '📋' },
];

export const UF_NOMES: Record<string,string> = { BA:'Bahia', SP:'São Paulo', /* … */ };
```

### 8. Backend — nova RPC `count_leads_with_phone`

Migration adiciona:
```sql
create or replace function public.count_leads_with_phone(
  convenio_filter text default null,
  ddd_filter text[] default null,
  tag_filter text[] default null
) returns table(total bigint, with_phone bigint)
language sql stable security definer set search_path=public as $$
  select 
    count(*) as total,
    count(*) filter (where phone is not null and length(trim(phone)) >= 8) as with_phone
  from public.leads_database
  where is_available = true
    and (convenio_filter is null or upper(convenio) = upper(convenio_filter))
    and (ddd_filter is null or substring(regexp_replace(phone,'\D','','g') from 3 for 2) = any(ddd_filter))
    and (tag_filter is null or tag = any(tag_filter));
$$;
grant execute on function public.count_leads_with_phone(text,text[],text[]) to authenticated;
```

Atualizar `request_leads_with_credits` para aceitar dois novos parâmetros opcionais `require_phone boolean` e `parcelas_pagas_min int`, filtrando no SELECT interno. (Migration adicional usando `CREATE OR REPLACE` mantendo overload de 6 parâmetros já documentado em `mem://constraints/autolead-rpc-overloads` — vou adicionar uma **nova versão com 11 parâmetros nominais** sem quebrar a antiga.)

### 9. Hook `useLeadsPremium.ts`

Atualizar `handleRequestLeads` para repassar `require_phone` e `parcelas_pagas_min` ao RPC novo. Mapear `tipoLead` para `convenio_filter`:
- `inss` → `'INSS'`
- `siape` → `'SIAPE'`
- `servidor` → `'GOVERNO BA'` (e demais — manter `convenio_filter` por nome de UF? Por enquanto deixar `'GOVERNO ' + uf` ou apenas filtrar via DDDs do estado).
- `clt` → `'CLT'`

### 10. Arquivos editados / criados

**Editados:**
- `src/modules/leads-premium/components/RequestLeadsWizard/index.tsx` — layout fixo
- `src/modules/leads-premium/components/RequestLeadsWizard/StepTipoLead.tsx` — 4 cards
- `src/modules/leads-premium/components/RequestLeadsWizard/StepPerfil.tsx` — render dinâmico
- `src/modules/leads-premium/components/RequestLeadsWizard/StepResumo.tsx` — agrupado por seção
- `src/modules/leads-premium/components/RequestLeadsWizard/StepConfirmacao.tsx` — passar require_phone
- `src/modules/leads-premium/components/RequestLeadsWizard/types.ts` — novos campos, UF_NOMES
- `src/modules/leads-premium/hooks/useLeadsPremium.ts` — passar novos params à RPC

**Criados:**
- `src/modules/leads-premium/components/RequestLeadsWizard/fields/TagsField.tsx`
- `src/modules/leads-premium/components/RequestLeadsWizard/fields/DDDField.tsx`
- `src/modules/leads-premium/components/RequestLeadsWizard/fields/EstadoField.tsx`
- `src/modules/leads-premium/components/RequestLeadsWizard/fields/ContractFiltersSection.tsx`
- `src/modules/leads-premium/components/RequestLeadsWizard/fields/PhoneAlertBanner.tsx`

**Migration SQL (Supabase):**
- Função `count_leads_with_phone(text, text[], text[])`
- Sobrecarga estendida de `request_leads_with_credits` com `require_phone boolean` e `parcelas_pagas_min int`

### Resultado esperado

- Modal compacto 520×90vh com botões **Voltar/Próximo sempre visíveis** no rodapé fixo.
- Etapa 1 com 4 opções de convênio (INSS, SIAPE, Servidor Público, CLT/Privado).
- Etapa 2 muda completamente baseada no convênio: Servidor Público mostra Estado obrigatório + filtros de contrato expandidos; INSS/SIAPE/CLT mostram Tags + DDDs + alerta de telefone ao avançar.
- Estado preserva entre Voltar/Próximo. Validação inline para campos obrigatórios. Tudo em português.

