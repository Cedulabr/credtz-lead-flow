

## Remarketing SMS - Correcoes e Evolucao Completa

### Problemas Identificados

1. **Status errado para Meus Clientes**: O trigger e o sync estao buscando `pipeline_stage IN ('proposta_enviada', 'proposta_digitada')` para remarketing, mas o status correto e `aguardando_retorno`.
2. **Apenas 1 campo de mensagem** para remarketing -- o usuario precisa de 5 mensagens diferentes (uma para cada dia de envio).
3. **Falta configuracao de horario e dias de envio** com opcoes de dias especificos, aleatorios ou intercalados.

---

### Plano de Implementacao

#### 1. Corrigir status de captura do Meus Clientes (SQL Migration)

Atualizar a funcao trigger `sms_remarketing_enqueue_propostas()`:
- Trocar `pipeline_stage IN ('proposta_enviada', 'proposta_digitada')` por `status = 'aguardando_retorno'`

Atualizar o sync manual no `RemarketingSmsView.tsx`:
- Trocar a query de propostas para buscar `status.eq.aguardando_retorno` ao inves de `pipeline_stage.in.(proposta_enviada,proposta_digitada)`

#### 2. Criar 5 campos de mensagem (SQL + UI)

Adicionar 5 settings novos no banco:
- `msg_remarketing_dia_1` ate `msg_remarketing_dia_5`

Cada mensagem sera usada no dia correspondente da sequencia. Se o `dias_envio_total` for maior que 5, o sistema cicla de volta (dia 6 usa msg do dia 1).

#### 3. Configuracao de agenda de envio (SQL + UI)

Adicionar settings para controle de dias:
- `remarketing_modo_dias`: `todos`, `aleatorio`, `intercalado`, `personalizado`
- `remarketing_dias_semana`: string com dias da semana selecionados (ex: `1,3,5` para seg/qua/sex)
- `remarketing_horario_envio`: horario especifico de envio (ex: `09:00`)

#### 4. Atualizar AutomationView.tsx

Substituir o card de "Remarketing Multi-Modulo" atual por uma versao expandida:
- 5 campos Textarea para as mensagens (Mensagem Dia 1, Dia 2... Dia 5)
- Indicacao clara de que `{{nome}}` puxa apenas o primeiro nome
- Seletor de modo de dias (Todos os dias / Aleatorio / Intercalado / Dias personalizados)
- Quando "Dias personalizados", mostrar checkboxes para seg a dom
- Campo de horario de envio (hora e minuto)

#### 5. Atualizar Edge Function `sms-automation-run`

Na SECTION 3 (Remarketing multi-module):
- Selecionar a mensagem correta baseada no `dias_enviados` (dia 1 = `msg_remarketing_dia_1`, etc.)
- Verificar o modo de dias antes de enviar:
  - `todos`: envia normalmente
  - `intercalado`: envia apenas em dias pares ou impares desde o enqueue
  - `aleatorio`: usa probabilidade de 50% para decidir envio no dia
  - `personalizado`: verifica se o dia da semana atual esta na lista

#### 6. Atualizar RemarketingSmsView.tsx

- Corrigir sync de Meus Clientes para usar `status = 'aguardando_retorno'`

---

### Arquivos a Editar/Criar

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Atualizar trigger `sms_remarketing_enqueue_propostas`, inserir 5 msg settings + settings de agenda |
| `src/modules/sms/views/AutomationView.tsx` | Expandir card Remarketing com 5 campos de msg, seletor de dias, horario |
| `src/modules/sms/views/RemarketingSmsView.tsx` | Corrigir sync de Meus Clientes para `aguardando_retorno` |
| `supabase/functions/sms-automation-run/index.ts` | Usar msg por dia, verificar modo de dias antes de enviar |

### Resultado Esperado

1. Clientes de Meus Clientes com status "aguardando_retorno" sao capturados automaticamente para remarketing
2. O gestor configura 5 mensagens diferentes, uma para cada dia da sequencia
3. Cada mensagem indica claramente que usa o primeiro nome (variavel `{{nome}}`)
4. O gestor escolhe o modo de envio: todos os dias, intercalado, aleatorio ou dias especificos da semana
5. O gestor configura horario exato de envio
6. A edge function respeita todas essas configuracoes ao processar a fila

