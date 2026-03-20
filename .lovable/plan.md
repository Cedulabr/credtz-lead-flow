

## Evolução Financeiro — Propostas Pagas do Televendas Sobem para Comissões

### Problema

Hoje, as comissões são lançadas manualmente no Conta Corrente. Quando uma proposta é marcada como `proposta_paga` no Televendas, nada acontece no módulo Financeiro. O admin precisa criar manualmente cada comissão.

### Abordagem

Criar uma nova seção "Pagamento de Comissão" no módulo Financeiro que lista automaticamente todas as propostas com status `proposta_paga` da tabela `televendas`. O admin poderá visualizar essas propostas, calcular a comissão com base nas `commission_rules` e lançar o pagamento (inserir na tabela `commissions`) com um clique.

### Mudanças

| Componente | Ação |
|---|---|
| Migration SQL | Adicionar coluna `televendas_id` (uuid, nullable, unique) na tabela `commissions` para vincular comissão à proposta de origem e evitar duplicatas |
| `src/components/admin/AdminFinance.tsx` | Adicionar seção "Pagamento de Comissão" no menu do Financeiro |
| `src/components/admin/CommissionPayment.tsx` (novo) | Componente que lista propostas pagas do televendas sem comissão lançada, permite calcular e lançar comissão |

### Detalhes

**1. Migration — vincular commissions ao televendas**

```sql
ALTER TABLE public.commissions 
  ADD COLUMN IF NOT EXISTS televendas_id text UNIQUE;
```

Isso permite saber quais propostas já tiveram comissão lançada (evita duplicatas).

**2. CommissionPayment — novo componente**

- Busca propostas com `status = 'proposta_paga'` da tabela `televendas`
- Faz LEFT JOIN lógico: exclui as que já possuem registro em `commissions` via `televendas_id`
- Para cada proposta mostra: nome, CPF, banco, tipo operação, parcela, saldo devedor, data pagamento, usuário
- Busca `commission_rules` ativas para o banco/produto da proposta + nível do usuário
- Calcula automaticamente o valor da comissão
- Botão "Lançar Comissão" que insere na tabela `commissions` com `televendas_id` preenchido
- Botão "Lançar Todas" para processar em lote
- Filtros: por empresa, por período, por banco
- Badge com contagem de propostas pendentes de comissão

**3. AdminFinance — nova entrada no menu**

Adicionar item "Pagamento de Comissão" com ícone `Receipt` e cor azul, ao lado do "Conta Corrente" existente.

### Fluxo

```text
Televendas: Proposta marcada como "Proposta Paga"
                    ↓
Financeiro > Pagamento de Comissão:
  - Lista propostas pagas sem comissão lançada
  - Calcula comissão com base nas regras (banco + produto + nível do usuário)
  - Admin revisa e clica "Lançar Comissão"
                    ↓
Tabela commissions: Nova entrada criada com televendas_id vinculado
                    ↓
Conta Corrente / Minhas Comissões: Comissão aparece para o usuário
```

