

## Plano: Corrigir filtros de data, pipeline operacional e alertas no Televendas

### 1. Filtro por data de criacao (TelevendasModule.tsx, linhas 160-164)

O modo "criacao" usa um OR que mistura `data_venda` e `data_pagamento`, fazendo contratos pagos em fevereiro aparecerem na visao de criacao de fevereiro.

**Correcao:** Remover o OR, filtrar apenas por `data_venda`:
```typescript
// Linha 160-164 — ANTES:
query = query.or(`and(data_venda.gte...,data_venda.lte...),and(status.eq.proposta_paga,data_pagamento.gte...,data_pagamento.lte...)`);

// DEPOIS:
query = query.gte("data_venda", startStr).lte("data_venda", endStr);
```

---

### 2. Pipeline Operacional filtra errado (TelevendasModule.tsx, linha 218)

O filtro compara `tv.status_bancario` diretamente, mas esse campo geralmente e null. O pipeline conta usando `mapToPipelineStatus()` — o filtro precisa usar a mesma funcao.

**Correcao:**
- Exportar `mapToPipelineStatus` de `BankingPipeline.tsx` (mover de metodo local para funcao exportada no nivel do modulo)
- Importar em `TelevendasModule.tsx`
- Substituir linha 218:

```typescript
// ANTES:
const matchesBankStatus = !bankStatusFilter || (tv.status_bancario || "aguardando_digitacao") === bankStatusFilter;

// DEPOIS:
const matchesBankStatus = !bankStatusFilter || mapToPipelineStatus(tv) === bankStatusFilter;
```

---

### 3. Banner pulsante de alertas (novo componente)

Criar `src/modules/televendas/components/StalledAlertBanner.tsx`:
- Banner vermelho/laranja proeminente no topo do modulo (acima de DashboardCards)
- Animacao pulsante forte com `animate-pulse` + glow vermelho para criticos
- Exibe contagem de propostas criticas e em alerta
- Botao "Ver propostas" que ativa o filtro de prioridade correspondente
- So aparece quando existem propostas criticas ou em alerta

Integrar no `TelevendasModule.tsx` acima do `DashboardCards`.

---

### Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| `src/modules/televendas/TelevendasModule.tsx` | Corrigir query de datas (linha 160-164), corrigir filtro pipeline (linha 218), importar mapToPipelineStatus, adicionar StalledAlertBanner |
| `src/modules/televendas/components/BankingPipeline.tsx` | Exportar `mapToPipelineStatus` como funcao standalone |
| `src/modules/televendas/components/StalledAlertBanner.tsx` | Novo: banner pulsante com contagem de criticos/alertas |

