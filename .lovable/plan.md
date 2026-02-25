

## Melhorias no Modulo Comunicacao SMS

### Problemas Identificados

1. **Sem controle de horario**: O cron job roda a cada hora (`0 * * * *`), sem respeitar horarios comerciais configurados
2. **Sem sinalizacao de falha por credito**: Clientes que nao receberam SMS por falta de credito na API nao tem indicador visual
3. **Historico nao visivel corretamente**: O `useSmsData` busca `sms_history` sem filtrar por empresa -- todos veem tudo
4. **Televendas SMS sem filtro de empresa**: `TelevendasSmsView` busca `sms_televendas_queue` sem filtrar por `company_id`, expondo clientes de outras empresas
5. **Automacao sem filtro de empresa**: `AutomationView` busca proximos envios sem filtro de empresa
6. **`sms-automation-run` nao grava `company_id`** no `sms_history`, quebrando a visibilidade por empresa

---

### Plano de Implementacao

#### 1. Configuracao de Horarios de Envio (Database + UI)

**Banco de dados**: Inserir novas settings na tabela `sms_automation_settings`:
- `automacao_horario_inicio` (default `"08"`) -- hora de inicio (0-23)
- `automacao_horario_fim` (default `"20"`) -- hora fim (0-23)

**Edge Function `sms-automation-run`**: Adicionar verificacao de horario no inicio da execucao. Se a hora atual (fuso Brasilia, UTC-3) estiver fora do intervalo configurado, retornar imediatamente sem processar.

**UI `AutomationView.tsx`**: Adicionar dois campos de input (hora inicio e hora fim) no card de configuracoes.

#### 2. Sinalizacao de Falha por Credito Insuficiente

**Edge Function `sms-automation-run`**: Quando o envio falhar com erro relacionado a credito/saldo insuficiente da API (Twilio ou Yup Chat), gravar `error_message` com prefixo padronizado como `"CREDITO_INSUFICIENTE: ..."` e status `"failed"`.

**Edge Function `send-sms`**: Mesmo tratamento para envios manuais.

**UI `TelevendasSmsView.tsx`**: Na coluna da tabela, adicionar uma coluna "Status Envio" que consulta o ultimo registro de `sms_history` para aquele `televendas_id`. Mostrar badges:
- Verde: Enviado com sucesso
- Vermelho: Falhou
- Amarelo com icone de moeda: Falha por credito insuficiente
- Cinza: Nunca enviado

**UI `HistoryView.tsx`**: Adicionar badge especial quando `error_message` contem `"CREDITO_INSUFICIENTE"`.

#### 3. Historico Visivel por Empresa

**`useSmsData.ts`**: Modificar `fetchHistory` para utilizar o `company_id` do usuario logado. Para admins, buscar todos. Para gestores/colaboradores, filtrar pelo `company_id` do usuario via `user_companies`.

**Edge Function `sms-automation-run`**: Ao inserir em `sms_history`, incluir o `company_id` do item da fila (`representative.company_id` e `item.company_id`). Isso corrige o problema de historico sem empresa.

#### 4. Isolamento por Empresa no Televendas SMS e Automacao

**`TelevendasSmsView.tsx`**:
- Obter o `company_id` do usuario logado via hook `useAuth` e tabela `user_companies`
- Filtrar a query de `sms_televendas_queue` adicionando `.eq("company_id", userCompanyId)` para gestores/colaboradores
- Admins continuam vendo tudo

**`AutomationView.tsx`**:
- Mesmo padrao: filtrar "Proximos Envios" por `company_id` do usuario
- Admins veem todos

**Observacao**: As politicas RLS ja implementadas ja fazem essa restricao no banco (`Gestor company access` e `Colaborador own access`), porem o frontend precisa explicitamente passar o filtro para evitar erros silenciosos de query vazia.

---

### Resumo Tecnico dos Arquivos a Editar

| Arquivo | Alteracao |
|---|---|
| **Database migration** | Inserir 2 novas settings de horario |
| `supabase/functions/sms-automation-run/index.ts` | Verificacao de horario, gravar `company_id` no historico, detectar erro de credito |
| `src/modules/sms/views/AutomationView.tsx` | Campos de horario inicio/fim, filtro por empresa |
| `src/modules/sms/views/TelevendasSmsView.tsx` | Filtro por empresa, coluna de status do ultimo envio |
| `src/modules/sms/views/HistoryView.tsx` | Badge de credito insuficiente |
| `src/modules/sms/hooks/useSmsData.ts` | Filtro de historico por empresa |

### Fluxo de Seguranca

- Gestores so veem dados da propria empresa
- Colaboradores so veem seus proprios registros na fila
- Admins veem tudo
- As RLS policies existentes ja suportam isso -- as mudancas sao no frontend para alinhar as queries

