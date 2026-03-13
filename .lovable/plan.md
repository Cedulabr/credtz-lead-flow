

## Correção: Pipeline Operacional + Melhorias de UX no Televendas

### Problema Principal (Bug)

No `BankingPipeline.tsx` (linha 119-121), `mapToPipelineStatus` mapeia tanto `pago_aguardando` quanto `proposta_paga` para `pago_cliente`. Resultado: o card "Pago" no pipeline mostra **24 contratos**, mas ao filtrar, aparecem propostas com badge "Aguard. Gestor" — confuso e incorreto. Mesma coisa com `cancelado_aguardando` → `cancelado_banco`.

### Correção do Pipeline

Criar dois novos status no pipeline para separar "aguardando aprovação" dos status finais:

```text
ANTES (6 colunas):
Aguard.Dig → Bloqueado → Em Andamento → Pendente → Pago(mistura) → Cancelado(mistura)

DEPOIS (8 colunas):
Aguard.Dig → Bloqueado → Em Andamento → Pendente → Aguard.Pgto → Aguard.Cancel → Pago ✅ → Cancelado ❌
```

**Arquivo `BankingPipeline.tsx`:**
- Adicionar `aguardando_pagamento` e `aguardando_cancelamento` ao `BANKING_STATUS_CONFIG`
- Corrigir `mapToPipelineStatus`: `pago_aguardando` → `aguardando_pagamento`, `cancelado_aguardando` → `aguardando_cancelamento`
- Apenas `proposta_paga` → `pago_cliente` e `proposta_cancelada`/`exclusao_aprovada` → `cancelado_banco`

### Melhorias Visuais (mesmo arquivo + PropostasView)

**1. Pipeline cards responsivos** — em mobile, os 8 cards ficam em scroll horizontal com `snap-x` para melhor navegação touch.

**2. Contagem no badge do status na PropostasView** — mostrar `data_pagamento` formatada junto ao badge "Paga" para deixar claro quando foi pago.

**3. Indicador visual claro de "Aguardando Gestor"** — no PropostasView, propostas com `pago_aguardando` ou `cancelado_aguardando` terão um badge adicional pulsante "🔔 Aguardando Aprovação" em vez de depender apenas da cor da borda.

**4. DashboardCards** — adicionar card "Aguardando Aprovação" com contagem de `pago_aguardando + cancelado_aguardando + solicitar_exclusao` para gestores.

**5. Filtro drawer — label da visão por data** — quando o filtro é "Visão por Criação", esclarecer que propostas pagas de outros meses não aparecerão (sugerir trocar para "Visão por Pagamento" com tooltip).

### Arquivos a Modificar

| Arquivo | Ação |
|---|---|
| `src/modules/televendas/components/BankingPipeline.tsx` | Separar `aguardando_pagamento`/`aguardando_cancelamento` do pipeline, corrigir `mapToPipelineStatus`, scroll snap mobile |
| `src/modules/televendas/views/PropostasView.tsx` | Badge pulsante "Aguardando Aprovação" para propostas `_aguardando` |
| `src/modules/televendas/components/DashboardCards.tsx` | Card "Aguardando Aprovação" para gestores |
| `src/modules/televendas/hooks/useTelevendasStats.ts` | Expor contagem de `aguardandoAprovacao` |

