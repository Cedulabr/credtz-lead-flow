

## Levantamento Completo: Módulo de Televendas — Diagnóstico e Otimizações

### Estado Atual

O módulo está bem estruturado com 17 componentes, 2 hooks, 3 views e utilitários. As features principais estão interligadas:
- **Sales Wizard** → insere em `televendas` → aparece no **TelevendasModule**
- **Status comercial** ↔ **Status bancário** sincronizados nos finais (pago/cancelado)
- **Pipeline** ↔ **Filtros** ↔ **Cards** tudo conectado via `mapToPipelineStatus`
- **Aprovações em lote** → atualiza status + histórico + SMS sync (trigger `sms_sync_televendas_status`)
- **Prioridade operacional** → calculada client-side + DB (`update_televendas_prioridade`) + notificações (`notify_critical_televendas`)

### Problemas Encontrados

**1. Código morto — `TelevendasManagement.tsx` (1.407 linhas)**
O arquivo antigo `src/components/TelevendasManagement.tsx` não é importado por nenhum componente. São 1.407 linhas de código legado que devem ser removidas.

**2. Recálculo redundante de prioridade (3x no mesmo render)**
`StalledAlertBanner`, `BankingPipeline` e `DashboardCards` — cada um recalcula independentemente a contagem de propostas críticas/alerta iterando todos os televendas. São 3 loops separados sobre os mesmos dados.

**3. `bankCalculationModel` e `bankCommissionRate` não são usados**
O hook `useCommissionRules` é chamado no TelevendasModule, mas seus valores (`bankCalculationModel`, `bankCommissionRate`) nunca são passados efetivamente para DashboardCards nem ProductionBar. Os props existem nas interfaces mas não são repassados.

**4. `handleQuickStatusChange` duplica lógica de `confirmStatusChange`**
A função de mudança rápida de status (linhas 404-441) replica a lógica de atualização sem sincronizar `status_bancario` nem registrar datas de pagamento/cancelamento. Propostas alteradas por esta via ficam dessincronizadas.

**5. Bulk operations sequenciais (N+1)**
`handleBulkApproveCancellation` faz `for...of` com await individual para cada proposta. 10 cancelamentos = 20 requests sequenciais (update + history).

**6. `fetchTelevendas` enriquece com profiles em 2 queries separadas**
Primeiro busca todos os televendas, depois faz uma segunda query para profiles. Poderia usar um único select com join ou view.

**7. `businessDays.ts` não usa feriados**
O cálculo de dias úteis para previsão de saldo ignora feriados nacionais, mesmo existindo `brazilianHolidays.ts` no TimeClock.

### Plano de Otimizações

#### 1. Remover código morto
- Deletar `src/components/TelevendasManagement.tsx`

#### 2. Centralizar cálculo de prioridades (`useTelevendasStats`)
Criar um hook `useTelevendasStats` que calcula uma única vez:
- Contagem por status pipeline
- Contagem de prioridades (crítico/alerta/normal)
- Stats de produção (total bruto pago, ranking)
- Retorna tudo memoizado

`DashboardCards`, `BankingPipeline`, `StalledAlertBanner` e `ProductionBar` passam a consumir do mesmo objeto de stats via props.

#### 3. Conectar commission rules ao cálculo financeiro
Passar `bankCalculationModel` efetivamente para `DashboardCards` e `ProductionBar`. Na produção, quando o modelo for `'valor_bruto'`, usar `parcela` ao invés de `saldo_devedor` para o cálculo do Total Bruto Pago.

#### 4. Unificar lógica de status change
Eliminar `handleQuickStatusChange` e usar `confirmStatusChange` com reason opcional. Garantir que toda mudança de status sincronize `status_bancario` para finais e registre datas.

#### 5. Batch operations com Promise.all
Substituir o `for...of` sequencial por `Promise.all` com chunks de 5, reduzindo tempo de aprovação em lote em ~80%.

#### 6. Integrar feriados no cálculo de previsão de saldo
Importar `getBrazilianHolidays` de `brazilianHolidays.ts` (já existe) e usar no `addBusinessDays` para pular feriados nacionais.

#### 7. Smart insights na visão de Clientes
Adicionar indicadores inteligentes na `ClientesView`:
- **Recorrência**: badge "Cliente recorrente" quando tem 3+ propostas
- **Ticket médio**: mostrar valor médio por proposta
- **Taxa de conversão**: % de propostas pagas vs total

### Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `src/components/TelevendasManagement.tsx` | **Deletar** |
| `src/modules/televendas/TelevendasModule.tsx` | Centralizar stats, unificar status change, batch otimizado |
| `src/modules/televendas/components/DashboardCards.tsx` | Receber stats pré-calculados + usar commission model |
| `src/modules/televendas/components/BankingPipeline.tsx` | Receber stats pré-calculados |
| `src/modules/televendas/components/ProductionBar.tsx` | Receber stats + usar commission model |
| `src/modules/televendas/components/StalledAlertBanner.tsx` | Receber counts pré-calculados |
| `src/modules/televendas/views/ClientesView.tsx` | Adicionar insights (recorrência, ticket médio, conversão) |
| `src/modules/televendas/utils/businessDays.ts` | Integrar feriados nacionais |

