

## Evolucao do Modulo SMS - Auto-Enqueue de Portabilidade

### Situacao Atual

Ja existe um trigger `trg_sms_auto_enqueue_televendas` que dispara apos cada INSERT na tabela `televendas` e chama a funcao `sms_auto_enqueue_televendas()`. Porem, essa funcao enfileira **todas** as propostas indiscriminadamente, enquanto a automacao de envio (edge function `sms-automation-run`) so processa propostas de **Portabilidade**. Isso gera registros inuteis na fila para propostas que nunca serao notificadas.

Alem disso, o botao "Puxar Propostas" importa propostas de todos os tipos, sem filtrar por portabilidade.

### Plano de Implementacao

#### 1. Atualizar trigger para filtrar apenas Portabilidade (Migracao SQL)

Reescrever a funcao `sms_auto_enqueue_televendas()` para que so insira na fila quando `NEW.tipo_operacao ILIKE '%portabilidade%'`. Propostas de outros tipos serao ignoradas automaticamente.

```text
CREATE OR REPLACE FUNCTION sms_auto_enqueue_televendas()
  - IF NEW.tipo_operacao ILIKE '%portabilidade%' THEN
    - INSERT INTO sms_televendas_queue ... ON CONFLICT DO NOTHING
  - END IF
```

Isso garante que toda proposta de portabilidade cadastrada no Televendas apareca automaticamente na fila SMS.

#### 2. Atualizar "Puxar Propostas" para filtrar Portabilidade (TelevendasSmsView.tsx)

O botao continuara existindo como fallback para importar propostas antigas, mas a query sera filtrada:
- Adicionar `.ilike('tipo_operacao', '%portabilidade%')` na busca de propostas

#### 3. Agrupar a visao por telefone (TelevendasSmsView.tsx)

Melhorar a visualizacao para que o gestor/admin entenda que um cliente com multiplas propostas recebe apenas 1 SMS:
- Adicionar uma indicacao visual mais clara quando o mesmo telefone tem multiplas propostas (ex: "13 propostas - 1 SMS")
- Manter a tabela individual mas com badge de agrupamento destacado

### Arquivos a Editar

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Reescrever funcao `sms_auto_enqueue_televendas()` com filtro de portabilidade |
| `src/modules/sms/views/TelevendasSmsView.tsx` | Filtrar "Puxar Propostas" para portabilidade; melhorar indicacao visual de agrupamento por telefone |

### Resultado Esperado

1. Toda proposta de portabilidade cadastrada no Televendas aparece automaticamente na fila SMS (sem clicar em nada)
2. Propostas de outros tipos nao poluem a fila
3. O gestor/admin ve claramente que clientes com multiplas propostas recebem apenas 1 SMS
4. O botao "Puxar Propostas" permanece como fallback para propostas antigas, ja filtrado para portabilidade

