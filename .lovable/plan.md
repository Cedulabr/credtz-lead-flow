

## Relatorio CSV por Campanha (Disparos)

### O que sera feito

Na aba **Disparos** (CampaignsView), cada campanha com status `completed` ou `failed` recebera um botao **"Baixar Relatorio"** (icone Download). Ao clicar, o sistema:

1. Consulta todos os registros de `sms_history` vinculados aquele `campaign_id`
2. Gera um arquivo CSV detalhado com as colunas:
   - Nome do contato
   - Telefone
   - Status (Entregue / Enviado / Falhou / Pendente)
   - Mensagem de erro (se houver)
   - Provedor (Yup Chat / Twilio)
   - Data/hora do envio
3. O CSV sera organizado com os entregues primeiro, depois enviados, pendentes e por ultimo os que falharam -- facilitando a analise
4. Dispara o download automatico no navegador do usuario

### Detalhes Tecnicos

**Arquivo: `src/modules/sms/views/CampaignsView.tsx`**

- Adicionar funcao `handleDownloadReport(campaignId, campaignName)`:
  1. Busca `sms_history` com `campaign_id = X`, ordenado por status (delivered, sent, pending, failed)
  2. Monta CSV com separador `;` (padrao brasileiro para abrir no Excel)
  3. Colunas: `Nome;Telefone;Status;Erro;Provedor;Data Envio`
  4. Status traduzido: delivered=Entregue, sent=Enviado, failed=Falhou, pending=Pendente
  5. Gera download via `Blob` + `URL.createObjectURL`
  6. Nome do arquivo: `relatorio-{nome-campanha}-{data}.csv`

- Adicionar botao "Baixar Relatorio" (icone `Download`) ao lado dos botoes existentes de cada campanha, visivel para campanhas que ja foram disparadas (status `completed`, `failed`, ou `sending`)

- State `downloadingReportId` para loading indicator no botao

**Nenhuma alteracao de banco de dados necessaria** -- os dados ja existem em `sms_history` com a coluna `campaign_id`.

### Resultado Esperado

1. Gestor/Admin clica em "Baixar Relatorio" em qualquer campanha ja disparada
2. Recebe CSV limpo e organizado com todos os destinatarios
3. Pode filtrar no Excel por status para ver rapidamente o que foi entregue vs. o que falhou
4. Interface fica menos poluida pois os detalhes ficam no arquivo, nao na tela

