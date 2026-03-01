

## Redesign Completo do Modulo Comunicacao SMS + Botoes de Envio Manual

### 1. Esclarecer o botao "Executar Agora"

O botao "Executar Agora" atual dispara a edge function `sms-automation-run` que processa **toda a fila** de automacao de uma vez -- e um envio manual fora do horario programado. Ele continuara existindo, mas sera complementado por **botoes de envio manual individuais por secao**.

### 2. Botoes de envio manual por secao

Cada card de automacao (Portabilidade, Propostas Pagas, Remarketing, Contato Futuro) recebera um botao proprio **"Disparar Agora"** que executa a edge function passando um parametro `section` para processar apenas aquela secao especifica. Isso exige uma pequena atualizacao na edge function para aceitar um filtro opcional.

**Edge Function (`sms-automation-run`):**
- Aceitar parametro opcional `section`: `"portabilidade"`, `"pago"`, `"remarketing"`, `"contato_futuro"` ou `undefined` (executa tudo)
- Quando `section` e informado, pular as outras secoes

### 3. Redesign visual completo do AutomationView

Transformar a tela atual em um painel premium com identidade visual forte:

**Header principal:**
- Gradiente de fundo com icone grande e titulo "Central de Automacoes"
- Cards de resumo animados no topo: Total de automacoes ativas, SMS enviados hoje, proximos envios

**Card: Portabilidade em Andamento**
- Borda lateral colorida (azul) para identificacao rapida
- Header com gradiente azul sutil, badge de status (Ativa/Inativa) com cor
- Botao "Disparar Agora" com icone de raio
- Campos mantidos, mas com melhor espacamento e tooltips

**Card: Propostas Pagas**
- Borda lateral verde
- Header com gradiente verde sutil
- Botao "Disparar Agora" dedicado

**Card: Remarketing Multi-Modulo**
- Borda lateral roxa/violeta, ocupando largura total
- Header com gradiente violeta, badge "5 mensagens"
- Accordion/Collapsible para os 5 campos de mensagem (evita scroll excessivo)
- Painel de agenda com visual de calendario interativo
- Botao "Disparar Agora" proprio

**Card: Contato Futuro**
- Borda lateral amber/laranja
- Header com gradiente amber
- Botao "Disparar Agora" proprio

**Proximos Envios:**
- Card com visual de timeline/lista com avatares de iniciais
- Filtro interativo inline (portabilidade / remarketing)

### 4. Redesign do SmsModule (tabs e header)

- Header com gradiente e icone maior
- Tabs redesenhadas com icones coloridos e contadores inline (badges)
- Animacao de transicao entre abas (framer-motion)

### 5. Melhorias nas demais views do modulo SMS

**RemarketingSmsView:**
- Summary cards com gradiente e icones coloridos
- Filtros como botoes/chips interativos ao inves de selects simples
- Tabela com linhas com borda lateral colorida por modulo
- Empty state com ilustracao

**TelevendasSmsView:**
- Mesmas melhorias visuais: cards com gradiente, filtros interativos, cores por status

**HistoryView, TemplatesView, ContactsView, CampaignsView:**
- Headers com cor e icone tematico
- Cards/listas com hover effects e transicoes suaves
- Empty states melhorados

---

### Arquivos a editar

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/sms-automation-run/index.ts` | Aceitar parametro `section` para envio manual por secao |
| `src/modules/sms/views/AutomationView.tsx` | Redesign completo: cores, gradientes, bordas laterais, botoes de envio manual por card, accordion para mensagens, painel de agenda visual |
| `src/modules/sms/SmsModule.tsx` | Header com gradiente, tabs com cores e badges |
| `src/modules/sms/views/RemarketingSmsView.tsx` | Cards com gradiente, filtros como chips, tabela com cores por modulo |
| `src/modules/sms/views/TelevendasSmsView.tsx` | Visual upgrade: cores, cards, filtros interativos |
| `src/modules/sms/views/HistoryView.tsx` | Header colorido, cards melhorados |
| `src/modules/sms/views/TemplatesView.tsx` | Visual upgrade com cores e hover effects |
| `src/modules/sms/views/ContactsView.tsx` | Visual upgrade com cores e empty states |
| `src/modules/sms/views/CampaignsView.tsx` | Visual upgrade com cores e cards |

### Resultado esperado

1. Cada secao de automacao tem seu proprio botao "Disparar Agora" para envio manual independente
2. Interface visualmente atraente com cores tematicas por secao
3. Filtros interativos e intuitivos em todas as abas
4. Animacoes suaves e feedback visual claro
5. Campos de mensagem organizados em accordion para evitar scroll
6. Indicacoes claras de como usar `{{nome}}` (primeiro nome) em cada campo

