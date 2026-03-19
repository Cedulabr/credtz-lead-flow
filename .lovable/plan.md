

## SMS — Botão "Atualizar Status" separado do Relatório

### Problema

Os envios SMS levam até 20 minutos para a operadora atualizar o status real (entregue/falhou). Hoje o status só é verificado ao clicar "Relatório", o que força o usuário a baixar o CSV para saber se atualizou. O usuário precisa de um botão separado para **atualizar os status** antes de baixar o relatório.

### Mudança

| Arquivo | Ação |
|---|---|
| `src/modules/sms/views/CampaignsView.tsx` | Adicionar botão "Atualizar Status" ao lado do botão "Relatório" nos cards de campanha; separar a lógica de check-status do download |

### Detalhes

**1. Novo botão "Atualizar Status"**

Ao lado do botão "Relatório", adicionar um botão com ícone `RefreshCw` que:
- Chama `sms-check-status` com o `campaign_id`
- Mostra spinner durante a verificação
- Exibe toast com resumo: "X atualizadas: Y entregues, Z falhas"
- Atualiza os contadores inline no card (sent_count, failed_count) chamando `onRefresh()`

**2. Botão "Relatório" simplificado**

O `handleDownloadReport` continuará chamando `sms-check-status` antes de gerar o CSV (para garantir dados frescos), mas agora o usuário também pode atualizar manualmente antes de baixar.

**3. Estado de loading separado**

Novo state `checkingStatusId` para controlar o spinner do botão "Atualizar Status" independente do `downloadingReportId`.

**4. Visibilidade**

Ambos os botões aparecerão para campanhas com status `completed`, `failed` ou `sending`.

