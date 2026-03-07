

## Plano: Parcelas Pagas/Restantes, Margens Reais, Cartoes, Simulador com Tipo de Operacao e PDF

### Alteracoes

#### 1. Calculo de parcelas pagas e restantes (`ContratoCard.tsx`, `types.ts`)

- Criar funcao `calculateInstallments(dataAverbacao, prazo)`:
  - Parsear `data_averbacao` (dd/MM/yyyy)
  - Calcular meses decorridos entre averbacao e hoje = parcelas pagas
  - Parcelas restantes = prazo - parcelas pagas
- Substituir campo "Inicio Desconto" por "Data Averbacao" no ContratoCard
- Adicionar campos visuais: **Parcelas Pagas** e **Parcelas Restantes** no header do contrato (ao lado de Parcela, Saldo, Prazo)
- Adicionar `parcelas_pagas` e `parcelas_restantes` calculados ao `BaseOffContract` como campos opcionais

#### 2. Margens reais descontando emprestimos (`MargemCards.tsx`, `ClienteDetalheView.tsx`)

- **Margem 35%** (ou 30% para LOAS/BPC esp 87/88):
  - `margemBruta = mr * 0.35` (ou `mr * 0.30` se esp === '87' || esp === '88')
  - `totalParcelasEmprestimo = soma de vl_parcela de contratos tipo 98 (consignado)`
  - `margemLivre = margemBruta - totalParcelasEmprestimo`
- **RMC**: `valor_rmc` da API ja e a margem total. Subtrair parcelas de contratos RMC existentes (tipo_emprestimo que indica cartao RMC)
- **RCC**: Mesmo calculo, subtrair parcelas de contratos RCC
- Passar `contracts`, `esp` para `MargemCards` para que ele faca o calculo internamente

#### 3. Secao "Cartoes" separada (`ClienteDetalheView.tsx`)

- Filtrar contratos onde `tipo_emprestimo` indica cartao (RMC/RCC - tipos comuns: cartao consignado)
- Criar secao visual "💳 Cartoes" entre Margens e Contratos
- Mostrar: banco, data averbacao, parcela, valor liberado (vl_emprestimo)
- Contratos de cartao NAO aparecem na lista principal de contratos

#### 4. Simulador de Troco - melhorias (`TrocoCalculator.tsx`)

- **Mostrar apenas 3 taxas default** (maiores): 1.85%, 1.80%, 1.75%
- **Bancos editaveis**: Substituir array hardcoded `BANCOS_SIMULACAO` por lista editavel via Supabase (tabela `baseoff_bank_rates`)
  - Colunas: `id`, `bank_name`, `bank_code`, `default_rate`, `is_active`, `created_by`, `created_at`
  - Bancos iniciais: BRB, Finanto, Pic Pay, Digio
  - CRUD inline no componente: adicionar/editar/remover bancos com suas taxas
- **Tipo de operacao**: Selector "Portabilidade com Troco" vs "Refinanciamento"
  - **Portabilidade**: aplica IOF (~3%) e limite de saque de 70% sobre o liquido
  - **Refinanciamento**: aplica IOF, sem limite de 70%
- Adicionar colunas na tabela: "Troco Bruto", "IOF", "Troco Liquido (70%)" para portabilidade

#### 5. PDF mais claro (`ProfessionalProposalPDF.tsx`)

- Clarear cores do header: trocar fundo azul escuro (37,99,235) por azul mais claro
- Clarear boxes de fundo: trocar `colors.dark` por tons mais claros
- Aumentar contraste do texto: usar preto em vez de slate-800
- Reduzir opacidade dos boxes de fundo coloridos

#### 6. Migracao SQL - tabela `baseoff_bank_rates`

```text
Colunas:
- id uuid PK
- bank_name text NOT NULL
- bank_code text
- default_rate numeric NOT NULL
- is_active boolean DEFAULT true
- created_by uuid
- company_id uuid nullable
- created_at timestamp
- updated_at timestamp
```

Seed com BRB, Finanto, Pic Pay, Digio e taxas iniciais.

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar tabela `baseoff_bank_rates` com seed |
| `types.ts` | Adicionar `parcelas_pagas?`, `parcelas_restantes?` ao BaseOffContract |
| `utils.ts` | Criar `calculateInstallments()` |
| `ContratoCard.tsx` | Substituir "Inicio Desconto" por "Data Averbacao", mostrar parcelas pagas/restantes |
| `MargemCards.tsx` | Receber contracts + esp, calcular margens reais descontando emprestimos |
| `ClienteDetalheView.tsx` | Separar contratos de cartao, passar dados para MargemCards, criar secao Cartoes |
| `TrocoCalculator.tsx` | 3 taxas default, bancos de Supabase, selector portabilidade/refinanciamento, regra 70% |
| `ProfessionalProposalPDF.tsx` | Clarear cores do PDF |

