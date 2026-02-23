

# Plano: Melhorias no Modulo Gestao de Televendas

## 1. Aprovacao em massa de cancelamentos

**Problema**: Gestor precisa aprovar cancelamentos um por um.

**Solucao**: Adicionar selecao em massa na secao "Solicitacoes de Cancelamento" da AprovacoesView.

**Arquivo**: `src/modules/televendas/views/AprovacoesView.tsx`
- Adicionar estado `selectedCancellations` (Set de IDs)
- Checkbox "Selecionar todos" no header da secao cancelamentos
- Checkbox individual em cada card de cancelamento
- Botao "Aprovar Todos Selecionados" que aparece quando ha itens selecionados
- Nova prop `onBulkApproveCancellation` que recebe array de Televenda

**Arquivo**: `src/modules/televendas/TelevendasModule.tsx`
- Criar `handleBulkApproveCancellation(items: Televenda[])` que itera e aplica `proposta_cancelada` com historico para cada proposta
- Passar a nova prop para AprovacoesView

---

## 2. Botao Sync visivel para todos os usuarios + registro de quem clicou

**Problema**: O botao Sync so aparece para gestores/admins e fica escondido. Deve ser visivel para todos e registrar quem atualizou.

**Arquivo**: `src/modules/televendas/views/PropostasView.tsx`

Mudancas:
- Remover a condicao `isGestorOrAdmin` do botao Sync -- agora aparece para TODOS
- Mover o botao para ficar ao lado do nome do cliente (Row 1), nao no lado direito
- O `handleMarkAsSeen` ja grava `last_sync_by` com o `user.id` -- manter isso
- Adicionar exibicao de quem fez o ultimo sync (nome do usuario) no tooltip ou sub-label
- Precisamos buscar o nome do usuario que fez o sync: adicionar prop `users` com a lista de usuarios para mapear `last_sync_by` para nome

**Arquivo**: `src/modules/televendas/TelevendasModule.tsx`
- Passar prop `users` para PropostasView

---

## 3. Ordenacao: propostas atualizadas descem

**Arquivo**: `src/modules/televendas/views/PropostasView.tsx`

Adicionar `useMemo` para reordenar a lista antes de renderizar:

```text
Ordem de prioridade:
1. Sem last_sync_at (nunca verificadas) -- TOPO
2. last_sync_at antigo (mais de 2h) -- MEIO
3. last_sync_at recente (menos de 2h) -- BASE
Dentro de cada grupo, manter ordem por created_at desc
```

---

## 4. Corrigir Pipeline Operacional -- dados inconsistentes

**Problema detectado na analise**:

| Status Comercial | Status Bancario | Quantidade | Acao |
|---|---|---|---|
| proposta_cancelada | aguardando_digitacao | 2 | Corrigir para cancelado_banco |
| proposta_cancelada | em_andamento | 22 | Corrigir para cancelado_banco |
| proposta_cancelada | pago_cliente | 1 | Corrigir para cancelado_banco |
| proposta_paga | aguardando_digitacao | 1 | Corrigir para pago_cliente |
| proposta_paga | em_andamento | 4 | Corrigir para pago_cliente |
| proposta_paga | pendente | 1 | Corrigir para pago_cliente |

Total: **31 registros inconsistentes** (mais do que os 2 inicialmente estimados).

**SQL de correcao (via ferramenta de dados)**:
```text
UPDATE televendas SET status_bancario = 'cancelado_banco'
WHERE status = 'proposta_cancelada' AND status_bancario NOT IN ('cancelado_banco');

UPDATE televendas SET status_bancario = 'pago_cliente'
WHERE status = 'proposta_paga' AND status_bancario NOT IN ('pago_cliente');
```

**Prevencao futura**: Adicionar logica no `confirmStatusChange` do TelevendasModule para auto-sincronizar o `status_bancario` quando o status comercial muda para um estado final (`proposta_paga` ou `proposta_cancelada`).

---

## Sequencia de implementacao

1. Correcao de dados no pipeline (SQL via ferramenta de dados)
2. Prevencao de inconsistencias futuras no TelevendasModule (auto-sync status_bancario)
3. Botao Sync visivel para todos + ao lado do nome + ordenacao (PropostasView)
4. Aprovacao em massa de cancelamentos (AprovacoesView + TelevendasModule)

---

## Arquivos impactados

| Arquivo | Alteracao |
|---|---|
| `src/modules/televendas/views/AprovacoesView.tsx` | Checkbox + selecao em massa + botao bulk approve |
| `src/modules/televendas/views/PropostasView.tsx` | Sync para todos, ao lado do nome, ordenacao por last_sync_at, exibir quem sincronizou |
| `src/modules/televendas/TelevendasModule.tsx` | Handler bulk approve, auto-sync status_bancario, passar users para PropostasView |
| Correcao SQL (dados) | 31 registros com status_bancario inconsistente |

---

## Detalhes tecnicos

### Auto-sync status_bancario (prevencao futura)
No `confirmStatusChange`, ao detectar que `newStatus` e `proposta_paga`, automaticamente setar `status_bancario = 'pago_cliente'`. Ao detectar `proposta_cancelada`, setar `status_bancario = 'cancelado_banco'`. Isso evita que novas propostas fiquem com status bancario desalinhado.

### Bulk approve flow
1. Usuario seleciona cancelamentos via checkboxes
2. Clica "Aprovar Todos"
3. Sistema mostra confirmacao com quantidade
4. Ao confirmar, itera sobre cada item chamando o mesmo fluxo do `handleApproveCancellation` individual
5. Registra historico para cada proposta
6. Refresh da lista ao final

