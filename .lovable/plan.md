

# Plano: Cron Job SMS + Melhorias no Modulo SMS

## Resumo

Configurar cron job automatico para a automacao SMS, adicionar botao para puxar propostas em andamento no Televendas SMS, restringir automacao "Em Andamento" apenas para Portabilidade, mostrar clientes que serao notificados, adicionar botao "Atualizar Status" nos Disparos, e garantir que o Historico mostra resultados dos envios.

---

## 1. Cron Job via pg_cron + pg_net

Ambas extensoes ja estao habilitadas. Criar cron job que executa a cada hora chamando a edge function `sms-automation-run`:

```text
cron.schedule('sms-automation-hourly', '0 * * * *', ...)
  -> net.http_post(sms-automation-run)
```

Sera inserido via SQL direto (insert tool), nao via migracao, pois contem dados especificos do projeto (URL + anon key).

---

## 2. Botao "Puxar Propostas" no Televendas SMS

Adicionar botao na view `TelevendasSmsView.tsx` que busca propostas do televendas com status `em_andamento`, `aguardando`, `digitado`, `solicitar_digitacao` e insere na `sms_televendas_queue` (evitando duplicatas via `ON CONFLICT`).

Isso permite popular a fila manualmente para propostas que ja existiam antes do trigger ser criado.

---

## 3. Automacao "Em Andamento" apenas para Portabilidade

### 3.1 Edge Function `sms-automation-run`

Adicionar filtro `tipo_operacao ILIKE '%portabilidade%'` na query de propostas em andamento. Propostas de outros tipos serao ignoradas pela automacao de dias consecutivos.

### 3.2 View de Automacao

Atualizar titulo do card para "Automacao - Portabilidade em Andamento" e adicionar nota explicativa.

---

## 4. Visualizar Clientes que Serao Notificados

Na aba Automacao (`AutomationView.tsx`), adicionar uma secao "Proximos Envios" que mostra os clientes da fila que atendem aos criterios:
- `automacao_ativa = true`
- `automacao_status = 'ativo'`
- `tipo_operacao` contem 'portabilidade'
- `dias_enviados < dias_envio_total`

Exibir lista com nome, telefone, dias enviados/total e ultimo envio.

---

## 5. Botao "Atualizar Status" nos Disparos

Na `CampaignsView.tsx`, adicionar botao "Atualizar Status" para campanhas com status `sending` ou `completed`. O botao recarrega os dados da campanha e do historico para refletir o estado real.

Tambem adicionar contador de entregues vs falhos visivel no card da campanha.

---

## 6. Historico mostrando resultados

O `HistoryView.tsx` ja recebe e exibe os registros de `sms_history`. Verificar que:
- Os filtros de tipo (manual/automatico) funcionam
- Os registros das automacoes (send_type = 'automatico') aparecem
- Os registros dos disparos em massa (campaign_id preenchido) aparecem

Adicionar filtro por data (hoje/ultimos 7 dias) para facilitar a visualizacao dos resultados do dia.

---

## Detalhes Tecnicos

### Arquivos a modificar:
1. **SQL Insert** (cron job) -- via insert tool, nao migracao
2. `supabase/functions/sms-automation-run/index.ts` -- filtro portabilidade
3. `src/modules/sms/views/TelevendasSmsView.tsx` -- botao puxar propostas
4. `src/modules/sms/views/AutomationView.tsx` -- titulo + lista proximos envios
5. `src/modules/sms/views/CampaignsView.tsx` -- botao atualizar status
6. `src/modules/sms/views/HistoryView.tsx` -- filtro por data

### Ordem de execucao:
1. Criar cron job SQL
2. Atualizar edge function com filtro portabilidade + deploy
3. Atualizar views do frontend (todas em paralelo)
