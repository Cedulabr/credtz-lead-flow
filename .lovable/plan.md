

## Finalizacao do Modulo Comunicacao SMS

### 1. Melhorar contraste dos toggles Ativar/Desativar

**Problema:** Os switches de ativar/desativar automacao sao discretos demais e dificeis de identificar visualmente.

**Solucao:** Substituir o `Switch` padrao por um toggle mais visivel com fundo colorido quando ativo (verde) e vermelho/cinza quando inativo, com label textual "Ativa/Inativa" junto ao switch. Adicionar uma barra de status mais evidente no topo de cada card.

**Arquivo:** `src/modules/sms/views/AutomationView.tsx`
- Criar componente `AutomationToggle` que renderiza o Switch dentro de um container com fundo colorido (`bg-green-500/15` quando ativo, `bg-red-500/10` quando inativo)
- Label muda de cor: verde "Ativada" / vermelho "Desativada"
- O `StatusBadge` no header do card tambem ganha mais contraste (fundo solido verde/vermelho ao inves de translucido)

---

### 2. Garantir que todas as automacoes usem primeiro nome

**Problema:** Precisa que TODOS os disparos usem apenas o primeiro nome do cliente.

**Solucao:** Ja esta implementado no edge function (`getFirstName`), mas vamos garantir consistencia verificando que:
- A funcao `getFirstName` ja extrai `fullName.split(" ")[0]`
- Todas as 5 secoes do `sms-automation-run` ja usam `getFirstName`
- Adicionar dica visual em TODAS as secoes de automacao sobre `{{nome}}` = primeiro nome

**Arquivo:** `src/modules/sms/views/AutomationView.tsx`
- Adicionar nota sobre primeiro nome nas secoes que ainda nao tem (Propostas Pagas ja tem, verificar Portabilidade)

Nenhuma alteracao no edge function necessaria — ja extrai primeiro nome em todas as secoes.

---

### 3. Disparo manual com selecao de cliente

**Problema:** O botao "Disparar Agora" envia para todos sem opcao de escolher clientes especificos.

**Solucao:** Ao clicar em "Disparar Agora", abrir um Dialog com 3 opcoes:
1. **Disparar para todos** — comportamento atual
2. **Selecionar quantidade** — dispara para os N primeiros da fila
3. **Buscar cliente especifico** — campo de busca por nome/telefone para selecionar um ou mais clientes

**Arquivo:** `src/modules/sms/views/AutomationView.tsx`
- Criar componente `ManualDispatchDialog` com:
  - RadioGroup para escolher modo: "Todos", "Quantidade", "Cliente especifico"
  - Input numerico para quantidade (quando modo = "Quantidade")
  - Input de busca + lista de resultados (quando modo = "Cliente especifico") consultando a fila da secao correspondente (`sms_televendas_queue` ou `sms_remarketing_queue`)
  - Checkboxes para multi-selecao de clientes
  - Botao "Confirmar Disparo" que executa o envio
- Para o disparo seletivo: invocar `send-sms` individualmente para cada cliente selecionado, similar ao `handleManualSend` do RemarketingSmsView
- O `SectionTriggerButton` agora abre o dialog ao inves de disparar diretamente

---

### 4. Sincronizacao de "Meus Clientes" com status "aguardando_retorno"

**Problema:** Ao selecionar "Meus Clientes" e clicar em sincronizar no Remarketing, nao esta puxando os clientes com status `aguardando_retorno`.

**Analise:** O codigo em `RemarketingSmsView.tsx` (linha 108) ja inclui `aguardando_retorno` no filtro `.or("status.eq.contato_futuro,status.eq.aguardando_retorno")`. O trigger no banco tambem ja trata esse status.

**Possiveis causas e correcoes:**
- A tabela `propostas` pode ter a coluna `telefone` e `whatsapp` ambas null para alguns registros — o codigo verifica `if (!nome || !tel) return []` e pula esses
- Verificar se o `company_id` esta preenchido nos registros de propostas
- O filtro `.or()` pode nao estar funcionando corretamente com a coluna `"Nome do cliente"` (coluna com espaco)

**Correcao no `RemarketingSmsView.tsx`:**
- Melhorar o log de sincronizacao para mostrar quantos registros foram encontrados por modulo
- Adicionar tratamento para caso `telefone` e `whatsapp` estejam ambos vazios (mostrar aviso)
- Garantir que o `.or()` esta sendo aplicado corretamente verificando o formato da query

---

### Arquivos a modificar

| Arquivo | Alteracao |
|---|---|
| `src/modules/sms/views/AutomationView.tsx` | Toggle com mais contraste, Dialog de disparo manual seletivo, notas de primeiro nome |
| `src/modules/sms/views/RemarketingSmsView.tsx` | Fix na sincronizacao de Meus Clientes, melhorar feedback de sync |

### Resultado Esperado

1. Toggles de ativar/desativar com cores fortes (verde/vermelho) facilmente identificaveis
2. Todas as automacoes mostram dica de que `{{nome}}` = primeiro nome
3. "Disparar Agora" abre modal com opcoes: todos, quantidade, ou busca de cliente especifico
4. Sincronizacao do Remarketing puxa corretamente clientes com status `aguardando_retorno` de Meus Clientes

