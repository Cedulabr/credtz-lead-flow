
## Melhorias no Modulo Comunicacao SMS

### 1. Secao "Proximos Envios" com melhor layout, tags de origem e filtros

**Problema:** A secao "Proximos Envios -- Clientes a Notificar" precisa de melhor organizacao e identificacao de origem.

**Solucao no `AutomationView.tsx`:**
- Expandir a query de `fetchNextSends` para buscar tambem da tabela `sms_proposal_notifications` (propostas nao enviadas) e da `sms_remarketing_queue` (ativos)
- Adicionar uma tag/badge colorida para cada item indicando a origem: "Televendas" (azul), "Proposta" (teal), "Remarketing" (violeta), "Contato Futuro" (amber)
- Adicionar filtros por origem (chips similares ao remarketing) no topo da secao
- Exibir a secao em um Card mais destacado com contador por tipo
- Melhorar o layout de cada item mostrando: nome, telefone, origem, tipo operacao, progresso, data agendada

### 2. Corrigir sincronizacao de "Meus Clientes" com status "aguardando_retorno"

**Analise:** O codigo em `RemarketingSmsView.tsx` ja usa `.in("status", ["contato_futuro", "aguardando_retorno"])` e o trigger no banco ja trata esse status. O problema pode estar na coluna `"Nome do cliente"` (com espaco) que pode causar problemas no select, ou nos dados com telefone/whatsapp nulos.

**Solucao:**
- Adicionar logging mais detalhado na sincronizacao para mostrar quantos registros foram encontrados por modulo
- Testar e corrigir a query se necessario
- O trigger `sms_remarketing_enqueue_propostas` ja funciona para novos registros -- o sync eh para registros existentes

### 3. Finalizar automaticamente clientes ao mudar de status (Database Triggers)

**Problema:** Quando um cliente sai do status `aguardando_retorno`, `contato_futuro` ou `em_andamento`, ele precisa ser removido/finalizado automaticamente da fila SMS.

**Solucao -- Atualizar 3 triggers no banco:**

**a) `sms_remarketing_enqueue_propostas` (Meus Clientes):**
- Ampliar a lista de status finais para incluir TODOS os status que nao sao `aguardando_retorno` ou `contato_futuro`
- Logica: se o status mudou E o novo status NAO eh `aguardando_retorno` nem `contato_futuro`, finalizar a automacao

**b) `sms_remarketing_enqueue_leads` (Leads Premium):**
- Ja finaliza em `cliente_fechado, recusou_oferta, sem_interesse, nao_e_cliente`
- Adicionar logica: se saiu de `em_andamento` ou `contato_futuro` para QUALQUER outro status nao-ativo, finalizar

**c) `sms_remarketing_enqueue_activate_leads` (Activate Leads):**
- Ja finaliza em `fechado, sem_interesse, nao_e_cliente, fora_do_perfil`
- Adicionar logica similar para cobrir mudancas de status genericas

**d) Tambem cancelar notificacoes de proposta pendentes:** quando o televendas muda para status final (pago/cancelado), marcar as notificacoes pendentes como enviadas para nao gastar SMS

### 4. Cancelar sms_proposal_notifications em status finais

**Solucao:** Atualizar o trigger `sms_sync_televendas_status` para tambem marcar notificacoes pendentes como canceladas quando a proposta eh paga ou cancelada.

---

### Arquivos a modificar

| Arquivo | Alteracao |
|---|---|
| `src/modules/sms/views/AutomationView.tsx` | Refatorar secao "Proximos Envios" com tags de origem, filtros, busca unificada de 3 tabelas |
| `src/modules/sms/views/RemarketingSmsView.tsx` | Melhorar feedback de sync com contagem por modulo |
| Nova migracao SQL | Atualizar 3 triggers para finalizar automacao ao mudar status + cancelar proposal notifications |

### Detalhes tecnicos da migracao SQL

```text
1. sms_remarketing_enqueue_propostas:
   - Manter enqueue para aguardando_retorno e contato_futuro
   - ELSE: se status != aguardando_retorno AND status != contato_futuro -> finalizar

2. sms_remarketing_enqueue_leads:
   - Manter enqueue para em_andamento e contato_futuro  
   - ELSE: finalizar (cobre TODOS os outros status)

3. sms_remarketing_enqueue_activate_leads:
   - Manter enqueue para em_andamento e contato_futuro
   - ELSE: finalizar

4. sms_sync_televendas_status (update):
   - Quando status final: tambem UPDATE sms_proposal_notifications SET sent=true WHERE televendas_id=NEW.id AND sent=false

5. Novo trigger propostas -> cancelar proposal_notifications:
   - Quando proposta muda para status final, cancelar notificacoes pendentes
```

### Resultado Esperado

1. Secao "Proximos Envios" reorganizada com tags coloridas (Televendas/Proposta/Remarketing), filtros por tipo e melhor layout
2. Sincronizacao de Meus Clientes funcionando corretamente com feedback detalhado
3. Clientes finalizados automaticamente na fila SMS quando saem de status ativos em QUALQUER modulo
4. Notificacoes de proposta canceladas automaticamente quando proposta eh paga ou cancelada
