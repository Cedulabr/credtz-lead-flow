
## Remarketing SMS Multi-Modulo + Contato Futuro Agendado

### Resumo

Expandir o modulo Comunicacao SMS para capturar automaticamente clientes dos modulos **Leads Premium**, **Activate Leads** e **Meus Clientes** (propostas), alem do Televendas existente. Dois fluxos distintos:

1. **Remarketing (em andamento)**: Clientes com status "em_andamento" recebem sequencia de SMS automaticos (igual ao Televendas hoje)
2. **Contato Futuro**: Clientes marcados como "contato_futuro" recebem 1 SMS com oferta no dia agendado

Tambem corrigir o uso do nome completo -- substituir por apenas o primeiro nome em todos os envios.

---

### 1. Nova tabela: `sms_remarketing_queue`

Tabela separada da `sms_televendas_queue` para nao misturar com o fluxo existente de portabilidade do Televendas. A FK de `televendas_id` impede reutilizar a tabela para outros modulos.

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| source_module | text NOT NULL | 'leads_premium', 'activate_leads', 'meus_clientes' |
| source_id | text NOT NULL | ID do registro original |
| cliente_nome | text NOT NULL | Nome completo do cliente |
| cliente_telefone | text NOT NULL | Telefone |
| status_original | text | Status no modulo de origem |
| queue_type | text NOT NULL | 'remarketing' ou 'contato_futuro' |
| scheduled_date | date | Data agendada (para contato_futuro) |
| automacao_status | text DEFAULT 'ativo' | ativo/pausado/finalizado |
| automacao_ativa | boolean DEFAULT true | |
| dias_envio_total | integer DEFAULT 5 | |
| dias_enviados | integer DEFAULT 0 | |
| ultimo_envio_at | timestamptz | |
| company_id | uuid FK | |
| user_id | uuid NOT NULL | |
| created_at, updated_at | timestamptz | |

**UNIQUE constraint**: (source_module, source_id, queue_type) -- evita duplicatas.

### 2. Nova aba no SMS Module: "Remarketing"

Criar `src/modules/sms/views/RemarketingSmsView.tsx` -- aba separada no modulo SMS para o gestor acompanhar:

- **Filtros**: Modulo de origem (Premium/Activate/Clientes) + Tipo (Remarketing/Contato Futuro) + Status (ativo/pausado/finalizado)
- **Tabela**: Cliente, Telefone, Modulo, Tipo, Status Automacao, Progresso, Data Agendada, Ultimo Envio, Acoes
- **Badge de agrupamento por telefone** (igual ao Televendas)
- **Botao "Sincronizar"** como fallback para importar registros antigos

### 3. Triggers para auto-enqueue

Tres triggers no banco de dados, um para cada tabela:

**a) Trigger em `leads` (Leads Premium)**:
- INSERT/UPDATE: Se `status = 'em_andamento'` -> enfileirar como remarketing
- INSERT/UPDATE: Se `status = 'contato_futuro'` e `future_contact_date IS NOT NULL` -> enfileirar como contato_futuro com scheduled_date
- Se status muda para final (cliente_fechado, recusou_oferta, sem_interesse, nao_e_cliente) -> finalizar na fila

**b) Trigger em `activate_leads`**:
- INSERT/UPDATE: Se `status = 'em_andamento'` -> remarketing
- INSERT/UPDATE: Se `status = 'contato_futuro'` e `data_proxima_operacao IS NOT NULL` -> contato_futuro
- Status final (fechado, sem_interesse, nao_e_cliente, fora_do_perfil) -> finalizar

**c) Trigger em `propostas` (Meus Clientes)**:
- INSERT/UPDATE: Se `status = 'contato_futuro'` e `future_contact_date IS NOT NULL` -> contato_futuro
- Pipeline `proposta_enviada` ou `proposta_digitada` -> remarketing (oferta em andamento)
- Status final -> finalizar

### 4. Atualizar Edge Function `sms-automation-run`

Adicionar nova secao apos o processamento do Televendas:

**Remarketing**: Processar `sms_remarketing_queue` onde `queue_type = 'remarketing'`, mesma logica de deduplicacao por telefone, usando template configuravel `msg_remarketing`.

**Contato Futuro**: Processar `sms_remarketing_queue` onde `queue_type = 'contato_futuro'` e `scheduled_date <= hoje`, enviar 1 SMS e finalizar.

### 5. Corrigir nome: usar apenas primeiro nome

Em **todos os pontos** de envio (edge function `sms-automation-run`, envio manual em `TelevendasSmsView`, e o novo fluxo), aplicar:

```text
primeiroNome = nomeCompleto.split(' ')[0]
```

Antes de substituir `{{nome}}` no template.

### 6. Configuracoes de Automacao (AutomationView)

Adicionar 2 novos cards na tela de automacao:
- **Remarketing Multi-Modulo**: ativado/desativado, dias de envio, mensagem template `msg_remarketing`
- **Contato Futuro**: ativado/desativado, mensagem template `msg_contato_futuro`

Inserir settings iniciais na migracao.

### 7. Atualizar SmsModule (tabs)

Adicionar nova tab "Remarketing" com icone dedicado. Atualizar o tipo `SmsTab` para incluir `"remarketing"`. Grid de tabs passa de 6 para 7 colunas.

---

### Arquivos a editar/criar

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Criar tabela `sms_remarketing_queue`, 3 triggers (leads, activate_leads, propostas), inserir settings iniciais |
| `src/modules/sms/views/RemarketingSmsView.tsx` | **Novo** - Tela de acompanhamento remarketing + contato futuro |
| `src/modules/sms/SmsModule.tsx` | Adicionar tab "Remarketing" e importar novo componente |
| `src/modules/sms/types.ts` | Adicionar 'remarketing' ao tipo SmsTab |
| `supabase/functions/sms-automation-run/index.ts` | Adicionar processamento de remarketing e contato_futuro + correcao primeiro nome |
| `src/modules/sms/views/TelevendasSmsView.tsx` | Corrigir uso do primeiro nome no envio manual |
| `src/modules/sms/views/AutomationView.tsx` | Adicionar cards de configuracao remarketing e contato futuro |
