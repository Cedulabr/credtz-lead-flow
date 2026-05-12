
# Módulo Reaproveitamento

Cria um novo módulo na sidebar para retrabalhar propostas canceladas (status `proposta_cancelada` na tabela `televendas`), com score de IA, KPIs e ação de 1 clique para reativar.

## 1. Banco de dados (migration)

Na tabela `televendas`:
- `motivo_cancelamento` text NULL
- `reativada_em` timestamptz NULL
- `reativacao_score` smallint NULL
- `reativacao_justificativa` text NULL
- Novo valor de status permitido: `reativada` (não há CHECK constraint hoje, basta documentar)

Atualizar `STATUS_CONFIG` em `src/modules/televendas/types.ts` com a entrada `reativada` (label "Reativada", emoji ♻️, verde).

Permissão dinâmica:
- Adicionar coluna `can_access_reaproveitamento` boolean default false em `profiles` (segue padrão do registry de permissões).

RLS em `televendas` já existe e isola por `company_id` / `user_id`. Confirmar/garantir que:
- Admin vê tudo
- Gestor vê propostas de qualquer usuário cuja `company_id` bata com a sua (via `has_role_safe` + `user_companies`)
- Operador vê só `user_id = auth.uid()`

Ajustar policy se necessário usando `has_role_safe` (sem recursão).

Lista padrão de motivos (usada no dropdown e no score):
`Preço`, `Sem retorno do cliente`, `Concorrente`, `Cliente desistiu`, `Documentação`, `Margem insuficiente`, `Outro`.

## 2. Edge Function `calcular-score-reaproveitamento`

Input: `{ proposta_id: uuid }`. Lê a proposta, calcula score 0–100 e atualiza `reativacao_score` + `reativacao_justificativa`.

Fórmula:
```
score = w_valor*valor_norm + w_tempo*tempo_norm + w_motivo*motivo_peso
  valor_norm  = min(troco/10000, 1)                  peso 40
  tempo_norm  = max(0, 1 - dias_desde_cancel/90)     peso 30
  motivo_peso = { Preço:1.0, Sem retorno:0.9, Documentação:0.7,
                  Cliente desistiu:0.5, Margem insuficiente:0.4,
                  Concorrente:0.2, Outro:0.5 }       peso 30
```
Retorna `{ score, justificativa }` (ex.: "Alto valor (R$ 8.500), cancelada há 12 dias por Preço — boa chance de retorno.").

Trigger after update em `televendas` quando status passa para `proposta_cancelada` chama via `pg_net` o edge function (assíncrono) para preencher score automaticamente. Recalcular também on-demand pelo botão "Recalcular score" no drawer.

## 3. Atualização do fluxo de cancelamento

`src/modules/televendas/components/StatusChangeModal.tsx` (ou modal equivalente que muda status para `proposta_cancelada`):
- Quando o novo status for `proposta_cancelada`, exibir Select obrigatório `motivo_cancelamento` com a lista padrão + campo livre para "Outro".
- Persistir `motivo_cancelamento` e `data_cancelamento` (já existe).

## 4. Sidebar / Roteamento

- `src/components/Navigation.tsx`: novo item "Reaproveitamento" (icon `IconRefreshAlert` do tabler-icons-react ou `RotateCcw` do lucide se tabler não estiver instalado), visível só se `isAdmin || profile.can_access_reaproveitamento`.
- `src/components/LazyComponents.tsx`: `LazyReaproveitamentoModule`.
- `src/pages/Index.tsx`: registrar tab `reaproveitamento` em `tabComponents` e em `TAB_PERMISSIONS` com `permission: 'can_access_reaproveitamento'`.
- Admin painel: adicionar toggle da nova permissão em `src/components/AdminPanel.tsx` (registry de permissões).

## 5. Novo módulo `src/modules/reaproveitamento/`

Estrutura:
```
ReaproveitamentoModule.tsx        # header + KPIs + filtros + tabs + lista
hooks/useReaproveitamento.ts      # fetch propostas canceladas + mutations
hooks/useReativarProposta.ts      # mutation reativar
components/KpiCards.tsx           # 4 cards
components/FilterBar.tsx          # busca + motivo + período
components/ReaproveitamentoTabs.tsx
components/PropostaCard.tsx       # card com avatar, tags, score bar, ações
components/ScoreBar.tsx           # barra 64px verde/âmbar/vermelho
components/PropostaDrawer.tsx     # Sheet com detalhes + reativar
utils/avatarColor.ts              # cor determinística pelo nome
types.ts
index.ts
```

### Header
"Reaproveitamento" + ícone refresh-alert + Badge contagem de canceladas.

### KPIs (grid 1/2/4 col)
1. Total canceladas
2. Reativadas hoje (`reativada_em::date = today`)
3. Valor potencial (sum `troco` de canceladas, BRL)
4. Alta chance de retorno (count `reativacao_score >= 80`)

### Filtros
- Busca text (nome, cpf, banco, tipo_operacao)
- Select Motivo (distinct dos dados + "Todos")
- Select Período: 30/60/90 dias (sobre `data_cancelamento`)

### Tabs
`Todas | 🔥 Quentes (≥80) | Recentes (≤30d) | Alto valor (≥R$ 5.000)`

### Card de proposta
- Avatar circular com iniciais, cor determinística (hash do nome → paleta HSL via tokens)
- Nome (bold) + banco como "company"
- Tipo operação como produto
- Tags: dias desde cancelamento, valor BRL, tipo de proposta
- `motivo_cancelamento` com ícone `AlertCircle`
- `ScoreBar` 64px (verde ≥80 / âmbar ≥60 / vermelho <60)
- Borda esquerda 3px verde quando score ≥80 (token `--success`)
- Botões à direita: **Reativar** (verde primary, ícone refresh) e **Ver proposta** (ghost, ícone eye)

### Reativar
1. Loading "Reativando..." com Loader2
2. `update televendas set status='reativada', reativada_em=now() where id=?`
3. Toast sonner: `Proposta de {nome} reativada! Disponível em Gestão de Televendas.`
4. Remove card via invalidate query
5. KPIs recarregam pela mesma query

### Drawer (Sheet à direita)
Detalhes completos: cliente, banco, tipo, valor, datas (criação/cancelamento), motivo, justificativa do score, histórico (`televendas_status_history` + `televendas_observacoes`). Botão "Reativar proposta" no rodapé sticky.

## 6. Integração com Gestão de Televendas

`src/modules/televendas/types.ts`:
- Acrescentar `reativada` em `STATUS_CONFIG` (label "Reativada", emoji ♻️, verde, `isFinal:false`).

`src/modules/televendas/views/PropostasView.tsx` (e filtros):
- Adicionar chip de filtro "Reativadas".
- `StatusBadge.tsx`: render badge verde + ícone `Recycle` (lucide) para `reativada`.
- Permitir edição igual às ativas (já é o comportamento padrão pra status não-final).

## 7. Tokens visuais (index.css)

Garantir tokens HSL semânticos:
- `--success: 152 70% 36%` (≈ #1D9E75) e `--success-foreground`
- Reuso para borda accent, botão Reativar e barra de score.

## 8. Detalhes técnicos

- Querys via `@tanstack/react-query` com `invalidateQueries(['reaproveitamento'])` e `['televendas']` após reativar.
- Avatar color: `hsl((hash(nome) % 360), 65%, 55%)`.
- BRL: `Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })`.
- Datas: helper `src/lib/date.ts` para `dias desde cancelamento`.
- Toda label em PT-BR, código em EN.
- Mobile-first: KPIs em grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, cards stack vertical no mobile, drawer com footer sticky.

## 9. Memória a salvar após implementação

`mem://features/reaproveitamento/overview` — fórmula do score, lista de motivos, status `reativada`, integração com Gestão de Televendas.
