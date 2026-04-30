## Objetivo

No módulo **Admin → Financeiro → Pagamento de Comissão**, ao clicar em **"Lançar Todas"**, abrir um diálogo de configuração onde o admin escolhe **como** a comissão será calculada para o lote inteiro, e adicionar um **filtro de Produto** para permitir lançar em massa por categoria (Portabilidade, Margem, Refinanciamento, Cartão, etc.).

## Mudanças

### 1. Novo filtro: Produto
Adicionar `productFilter` ao lado dos filtros existentes (Empresa, Banco, Funcionário, Mês). As opções serão geradas dinamicamente a partir do campo `tipo_operacao` das propostas pendentes (Portabilidade, Margem Livre, Refinanciamento, Cartão Benefício, Cartão Consignado, Novo, etc.). O filtro entra na lógica de `filteredProposals`.

### 2. Botão "Lançar Todas" abre um diálogo de configuração
Hoje o botão chama `handlePostAll` direto, usando a regra cadastrada em `commission_rules` para cada proposta. A mudança:

- Botão passa a abrir um novo diálogo `BulkCommissionDialog`.
- O diálogo mostra: total de propostas filtradas, breakdown por produto/banco, e os controles abaixo.

### 3. Controles do diálogo de lote
Mesma lógica do diálogo individual já existente, aplicada ao lote inteiro:

- **Tipo de comissão**: `percentual` ou `valor_fixo` (radio).
- **Base de cálculo**: `parcela`, `saldo_devedor`, `bruto`, `liquido` (radio).
- **Valor**: input único (% ou R$ conforme o tipo).
- **Modo de aplicação** (radio adicional):
  - **Aplicar a todas** — usa o valor digitado em todas as propostas filtradas.
  - **Usar regra cadastrada quando existir** — fallback para `commission_rules` por banco/produto/nível e usa o valor digitado só onde não houver regra (comportamento atual aprimorado).
- **Pré-visualização**: mostra valor total estimado em R$ com base na configuração escolhida, antes de confirmar.

### 4. Processamento em lote
Substituir a lógica interna de `handlePostAll`:

- Para cada proposta filtrada, calcular `baseValue` conforme `commissionBase` (reaproveitar `getBaseValueByMode`).
- Calcular `amount` e `percentage` conforme `commissionMode` e o valor digitado (reaproveitar `getDialogCommissionValues`).
- Inserir em `commissions` com `status='pago'` e `televendas_id` (mantém deduplicação atual).
- Toast final com sucesso/falha + refresh.

## Detalhes técnicos

**Arquivo único alterado**: `src/components/admin/CommissionPayment.tsx`

- Adicionar estado: `productFilter`, `bulkDialogOpen`, `bulkMode`, `bulkBase`, `bulkInput`, `bulkApplyMode` ('forced' | 'rule_first'), `bulkPosting`.
- `uniqueProducts = useMemo(...)` derivado de `proposals.map(p => p.tipo_operacao)`.
- Adicionar `<Select>` "Produto" na barra de filtros (linha junto com Funcionário/Mês).
- Incluir `matchProduct` em `filteredProposals`.
- Trocar `onClick={handlePostAll}` por `onClick={() => setBulkDialogOpen(true)}`.
- Criar `<Dialog>` de bulk config com mesmos componentes UI já usados (`RadioGroup`, `Input`, `Select`).
- Função `executeBulkPost()`:
  ```ts
  for (const p of filteredProposals) {
    let amount, percentage, baseValue;
    if (bulkApplyMode === 'rule_first') {
      const r = calculateCommission(p);
      if (r.rule) ({ amount, percentage, baseValue } = r);
      else ({ amount, percentage, baseValue } = computeFromBulkInputs(p));
    } else {
      ({ amount, percentage, baseValue } = computeFromBulkInputs(p));
    }
    await supabase.from('commissions').insert({ ... });
  }
  ```
- `computeFromBulkInputs(p)` é uma versão de `getDialogCommissionValues` que recebe `bulkMode`, `bulkBase`, `bulkInput`.

**Sem mudanças de banco** — usa as colunas já existentes em `commissions` (`commission_amount`, `commission_percentage`, `credit_value`).

**Sem mudanças no diálogo individual** — continua funcionando exatamente como hoje.

## Resultado para o usuário

- Filtro de Produto disponível para selecionar e lançar em massa "todas as Portabilidades", "todas as Margens", "todos os Refinanciamentos", "todos os Cartões".
- Ao clicar em "Lançar Todas (N)", abre diálogo perguntando: tipo (%/R$), base (parcela/saldo devedor/bruto/líquido), valor, e se respeita a regra cadastrada quando existir.
- Vê o total estimado antes de confirmar.
- Confirma e lança tudo de uma vez com a configuração escolhida.
