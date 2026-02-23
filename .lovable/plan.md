
# Plano de Melhorias - Modulo Gestao de Televendas

## Resumo dos Problemas Identificados

1. **Aprovacao em massa de cancelamentos** - Nao existe opcao para aprovar todos de uma vez
2. **Filtro de meses** - Atualmente mostra 12 meses; deve mostrar apenas 2 ultimos + seletor para meses anteriores
3. **Bancos duplicados** - Dados no banco estao inconsistentes (ex: "RED", "RED ", "Facta", "FACTA", "Banco Facta", "BRB", "Banco BRB - RED"). O filtro puxa dos dados existentes em vez dos bancos cadastrados no Admin
4. **Pipeline com dados inconsistentes** - 2 propostas canceladas com status_bancario = "aguardando_digitacao"
5. **Botao Sync/Status Bancario** - Atualmente fica escondido no DetailModal. Deve ficar ao lado do nome na lista, e propostas ja atualizadas devem descer na ordenacao

---

## Tarefa 1: Aprovacao em massa de cancelamentos

**Arquivo**: `src/modules/televendas/views/AprovacoesView.tsx`

- Adicionar um checkbox "Selecionar todos" no cabecalho da secao "Solicitacoes de Cancelamento"
- Adicionar checkbox individual em cada card de cancelamento
- Botao "Aprovar Cancelamento em Massa" que aparece quando ha itens selecionados
- Ao clicar, abre o StatusChangeModal com confirmacao para processar todos de uma vez
- Nova prop `onBulkApproveCancellation` no componente para processar a lista

**Arquivo**: `src/modules/televendas/TelevendasModule.tsx`

- Criar handler `handleBulkApproveCancellation` que itera sobre os selecionados e aplica `proposta_cancelada` com historico para cada um

---

## Tarefa 2: Filtro de meses - apenas 2 ultimos + seletor

**Arquivo**: `src/modules/televendas/components/FiltersDrawer.tsx`

- Alterar a geracao de `monthOptions`:
  - Mostrar diretamente os 2 ultimos meses como botoes rapidos (mes atual e mes anterior)
  - Adicionar opcao "Meses anteriores" que abre um `Select` com os meses de 3 a 12 meses atras
- Manter a logica de filtragem existente inalterada

---

## Tarefa 3: Bancos duplicados - usar bancos do Admin

**Arquivo**: `src/modules/televendas/TelevendasModule.tsx`

- Substituir `availableBanks` (extraido dos dados) por `registeredBanks` (ja carregado do `useTelevendasBanks`) no `FiltersDrawer`
- Passar `registeredBanks` em vez de `availableBanks` para o drawer

**Arquivo**: `src/modules/televendas/components/FiltersDrawer.tsx`

- O prop `availableBanks` passara a receber os bancos cadastrados no Admin

**Migracao de dados (SQL)**: Normalizar os nomes duplicados existentes no banco:

```text
UPDATE televendas SET banco = 'BRB - 360' WHERE banco = '360';
UPDATE televendas SET banco = 'Banco Banrisul' WHERE banco = 'banrisul';
UPDATE televendas SET banco = 'Banco Facta' WHERE banco IN ('Facta', 'FACTA');
UPDATE televendas SET banco = 'Banco Pic Pay' WHERE banco IN ('Pic Pay', 'PIC PAY');
UPDATE televendas SET banco = 'Banco BRB - RED' WHERE banco IN ('RED', 'RED ');
UPDATE televendas SET banco = 'Banco Daycoval' WHERE banco = 'Daycoval';
UPDATE televendas SET banco = 'Finanto Bank' WHERE banco = ' FINANTO';
-- etc. Mapeamento completo dos 27 nomes para os 14 cadastrados
```

---

## Tarefa 4: Corrigir Pipeline - propostas canceladas com status errado

**Migracao de dados (SQL)**:

```text
UPDATE televendas 
SET status_bancario = 'cancelado_banco' 
WHERE status = 'proposta_cancelada' 
  AND status_bancario = 'aguardando_digitacao';
```

Isso corrige os 2 registros identificados.

---

## Tarefa 5: Botao Sync ao lado do nome + ordenacao por atualizacao

**Arquivo**: `src/modules/televendas/views/PropostasView.tsx`

Mudancas no card de proposta:
- Mover o botao de "Marcar como visto" (Eye/Sync) para ao lado do nome do cliente na Row 1
- Ao clicar no Sync, atualizar `last_sync_at` (como ja funciona)
- Adicionar ordenacao: propostas com `last_sync_at` mais recente vao para o final da lista; as que nunca foram verificadas ou estao desatualizadas ficam no topo
- Usar `useMemo` para reordenar a lista antes de renderizar

Logica de ordenacao:
```text
1. Propostas sem last_sync_at (nunca verificadas) - TOPO
2. Propostas com last_sync_at antigo - MEIO  
3. Propostas com last_sync_at recente - BASE
```

---

## Sequencia de Implementacao

1. Migracao SQL (normalizar bancos + corrigir status_bancario)
2. Filtro de meses (FiltersDrawer)
3. Bancos do Admin no filtro (TelevendasModule + FiltersDrawer)
4. Botao Sync reposicionado + ordenacao (PropostasView)
5. Aprovacao em massa de cancelamentos (AprovacoesView + TelevendasModule)

---

## Arquivos Impactados

| Arquivo | Tipo de Alteracao |
|---|---|
| `src/modules/televendas/views/AprovacoesView.tsx` | Checkbox + aprovacao em massa |
| `src/modules/televendas/views/PropostasView.tsx` | Reposicionar Sync + ordenacao |
| `src/modules/televendas/components/FiltersDrawer.tsx` | Filtro de meses + bancos do Admin |
| `src/modules/televendas/TelevendasModule.tsx` | Handler em massa + passar bancos Admin |
| Migracao SQL | Normalizar bancos + corrigir status_bancario |
