

## Correções no módulo Gestão Televendas

### 1. Botão "Reativar Proposta" para canceladas

**Onde:** `src/modules/televendas/views/PropostasView.tsx` (card da proposta) e `src/modules/televendas/components/DetailModal.tsx` (cabeçalho do modal de detalhes).

**O que fazer:**
- Quando `tv.status === "proposta_cancelada"`, exibir um botão verde outlined com ícone `Undo2` (lucide), texto **"Reativar Proposta"**, ao lado do `StatusBadge`.
- Ao clicar (com `e.stopPropagation()` para não abrir o detail modal):
  - Confirmar via `AlertDialog` ("Reativar esta proposta? Ela voltará para o pipeline ativo.")
  - `UPDATE televendas SET status='em_andamento', status_bancario='em_analise', status_updated_at=now(), status_updated_by=auth.uid(), data_cancelamento=null WHERE id=tv.id`
  - Inserir registro em `televendas_status_history` (`from_status='proposta_cancelada'`, `to_status='em_andamento'`, `reason='Reativação manual'`)
  - Atualização **otimista** do estado local (`setTelevendas(prev => prev.map(...))`) em `TelevendasModule.tsx` — sem refetch, badge atualiza instantaneamente e a proposta sai do filtro "Cancelada".
  - Toast: `"Proposta reativada com sucesso."`
- Permissão: gestor ou admin (`isGestorOrAdmin`). Operadores não veem o botão.
- Adicionar nova prop `onReactivate?: (tv) => Promise<void>` em `PropostasView` e passar do `TelevendasModule`.

### 2. Observações com lista cronológica e atualização imediata

**Diagnóstico:** hoje `observacao` é um único campo texto em `televendas`, editável apenas pelo modal completo de edição. Não há lista nem histórico — o usuário quer múltiplas entradas que apareçam ao salvar.

**Solução: nova tabela `televendas_observacoes`**

Migration:
```sql
CREATE TABLE public.televendas_observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  televendas_id uuid NOT NULL REFERENCES televendas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  observacao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.televendas_observacoes(televendas_id, created_at DESC);
ALTER TABLE public.televendas_observacoes ENABLE ROW LEVEL SECURITY;

-- SELECT: dono da televenda OU gestor da empresa OU admin
-- INSERT: usuário autenticado (com a mesma regra de acesso à televenda)
-- (políticas espelham as de televendas, usando has_role_safe)
```

**UI — `DetailModal.tsx`:**
- Substituir o bloco read-only "OBSERVAÇÕES" (linhas 469-483) por uma seção **"📝 OBSERVAÇÕES"** contendo:
  - **Lista** (state `observations`) ordenada por `created_at DESC`, cada item: avatar/nome do autor, timestamp relativo (`formatTimeAgo`) e texto.
  - Quando vazia: placeholder `"Nenhuma observação ainda. Adicione a primeira abaixo."`
  - **Formulário** sticky no fim: `<Textarea>` + botão "Adicionar observação".
- Buscar observações em `fetchObservations()` (chamado junto com `fetchHistory`).
- Ao submeter:
  1. `INSERT` em `televendas_observacoes`.
  2. **Append otimista** no state local antes do round-trip (`setObservations(prev => [novo, ...prev])`).
  3. Limpar o textarea (`setNewObservation("")`).
  4. Toast `"Observação adicionada."`
  5. Em caso de erro: remover do state e mostrar toast de erro.
- Compatibilidade: o campo `televendas.observacao` legado continua exibido como "Observação inicial" se preenchido, acima da lista.

**Preview no card** (`PropostasView.tsx` linha 296): trocar para mostrar a observação **mais recente** da lista (via campo derivado retornado em `fetchTelevendas` com `latest_observacao`) — ou manter o campo legado por enquanto e atualizar via subquery em fase posterior. Para esta entrega: manter preview legado e adicionar contador `💬 N` quando houver observações na nova tabela.

### Arquivos modificados
- `src/modules/televendas/TelevendasModule.tsx` — handler `handleReactivate` com update otimista
- `src/modules/televendas/views/PropostasView.tsx` — botão "Reativar Proposta"
- `src/modules/televendas/components/DetailModal.tsx` — nova seção de observações com lista + form
- `src/modules/televendas/types.ts` — tipo `ObservacaoItem`
- Migration SQL: criar tabela `televendas_observacoes` + RLS

### Resultado
- Cancelada → botão verde "Reativar Proposta" → status muda para `em_andamento` instantaneamente, sai do filtro de canceladas.
- Adicionar observação → aparece no topo da lista imediatamente, textarea limpa, sem reload, placeholder "Nenhuma observação" é substituído pela primeira entrada.
