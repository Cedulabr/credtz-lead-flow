

## Evolucao Easyn Voicer — UI Wevoicer + Variaveis Expandidas + Exemplos

### Contexto

O usuario quer o Voicer com UX similar ao Wevoicer: editor centralizado com botao de variaveis que abre modal, AudioControls escondido em "Configuracoes Avancadas", botao de exemplos prontos com textos reais de vendas + audio, e vozes em portugues priorizadas.

### Mudancas

| Arquivo | Acao |
|---|---|
| `variableConverter.ts` | Expandir variaveis de emocao (30+) baseado no PDF do Wevoicer: tom suave, voz de papai noel, gargalhada, narrador de suspense, fala entusiasmada, tom conspiratório, etc. Manter as atuais + adicionar novas categorias (Tom/Emocao, Estilo/Personagem, Acoes/Efeitos, Pausas). A conversao para ElevenLabs agora passa as variaveis como texto contextual (ex: `{{tom suave}}` vira `[softly]`) ja que ElevenLabs multilingual v2 interpreta essas instrucoes |
| `VariableButtons.tsx` | Substituir por modal/dialog com categorias organizadas (Tons, Efeitos, Pausas, Personagens). Botao `{*} Variaveis de fala` abre o dialog. Dentro, categorias em abas ou secoes com scroll. Cada variavel clicavel insere no cursor. Texto explicativo no topo. Permitir digitacao livre de variaveis personalizadas |
| `TextEditor.tsx` | Adicionar botao `{*} Variaveis de fala` (verde, estilo Wevoicer) acima do textarea. Remover VariableButtons inline. Adicionar botao "Limpar texto". Manter contador de caracteres |
| `AudioControls.tsx` | Manter como esta, mas sera renderizado dentro de um Collapsible/Accordion "Configuracoes Avancadas" no StudioView |
| `StudioView.tsx` | Redesign completo inspirado no Wevoicer: layout 3 colunas no desktop (sidebar esquerda opcional, editor central, historico direita). Voz selector como dropdown compacto no topo do editor (como Wevoicer). AudioControls dentro de Collapsible "Configuracoes Avancadas". Botao "Gerar Fala" na parte inferior. Botao "Exemplos prontos" no canto inferior esquerdo |
| `ExamplesDialog.tsx` (novo) | Modal com exemplos prontos de textos de vendas com variaveis. Cada exemplo mostra: voz usada, modelo, texto completo com variaveis. Botao "Usar" copia texto e seleciona voz |
| `VariablesDialog.tsx` (novo) | Dialog com todas as variaveis organizadas por categoria, com descricao e exemplo. Campo de busca. Secao "Crie suas proprias variaveis" |
| `VoiceSelector.tsx` | Converter para dropdown/combobox compacto (Select com avatar da voz, nome e botao play). Filtro por idioma PT-BR priorizado |

### Variaveis Expandidas (baseado no PDF)

Categorias:
- **Tons/Emocoes**: tom suave, irritado, entusiasmado, tom triste, tom animado, tom misterioso, tom conspiratório, tom de urgência, empoderada, indignado, em panico
- **Estilos/Personagens**: voz de papai noel, cientista maluco, locucao profissional, narrador de suspense, voz de velhinho, locucao coloquial, locucao caricata
- **Acoes/Efeitos**: risada, gargalhada, suspiro, choro, sorrindo, rindo, respiracao ofegante, puxa o ar e solta, gritando
- **Pausas**: pausa curta, pausa longa, pausa 2 segundos, pausa 3 segundos, pausa 5 segundos
- **Modulacao**: enfase, sussurro, voz embriagada, voz sussurrando baixinho, locucao suave, fala entusiasmada, tom desconfiado

### Exemplos Prontos (4 exemplos de vendas)

Cada exemplo tera:
- Nome da voz ElevenLabs (Diana/Roger/Sarah)
- Texto completo com variaveis de fala (scripts de televendas reais)
- Botao "Usar este exemplo" que preenche editor + seleciona voz

Exemplo 1 - Portabilidade:
```
{{locucao amigavel, acolhedora}} Ola! Tudo bem?
{{locucao profissional e cordial}} Aqui e da CREDTZ, somos especializados credito consignado para o produto Portabilidade. {{sorrindo}}
{{tom de voz prestativo e ligeiramente urgente}} Eu estou te chamando rapidinho porque surgiram umas oportunidades na renovacao dos seus contratos...
{{enfase no MUITO, tom entusiasmado}} Que podem te ajudar MUITO agora.
{{tom levemente conspiratorio, exclusivo}} Inclusive, e algo que nem todo mundo esta conseguindo acessar...
{{tom amigavel, com um toque de urgencia}} Voce consegue falar comigo agora rapidinho?
```

### Layout Desktop (inspirado Wevoicer)

```text
+----------------------------------------------------------+
| [Voz: Diana v] [Modelo: Locutor v]    Saldo: 150 creditos|
+----------------------------------------------------------+
|                                                          |
| {*} Clique e experimente as variaveis de fala            |
|                                                          |
| [========= EDITOR DE TEXTO ==========]                   |
| {{locucao amigavel}} Ola! Tudo bem?                      |
| ...                                                      |
|                                                          |
|                                          604 / 5000      |
| [Limpar texto]          [Config Avancadas v]             |
|                                                          |
| [Exemplos prontos 🆕]      [🎙 Gerar Fala]              |
+----------------------------------------------------------+
| [Player - quando audio gerado]                           |
+----------------------------------------------------------+
```

### Edge Function TTS

Adicionar `language_code: "pt"` ao body da chamada ElevenLabs para melhorar pronuncia em portugues. Adicionar `speed` ao body (ja tem a variavel mas nao esta sendo enviada).

### Resumo das entregas

1. Expandir variaveis de emocao (12 → 30+) com categorias
2. Dialog de variaveis com busca e categorias
3. Dialog de exemplos prontos com textos de vendas
4. AudioControls dentro de Collapsible "Config Avancadas"
5. VoiceSelector como dropdown compacto
6. Layout redesenhado estilo Wevoicer (editor centralizado)
7. Fix: enviar `speed` e `language_code: "pt"` na API

