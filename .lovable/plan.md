

## Easyn Voicer — Fix Exemplos Prontos + Botao IA para Variaveis

### Problemas Identificados

1. **Audio dos exemplos nao toca**: A edge function `voicer-generate-example` parece nao estar deployada (zero logs). O bucket `voicer-audios` pode nao ser publico, causando erro ao acessar a URL. Alem disso, o `supabase.functions.invoke()` pode estar falhando silenciosamente.

2. **Variaveis lidas como texto literal**: Na geracao normal (`elevenlabs-tts`), o texto ja chega convertido do cliente (`useAudioGeneration.ts` linha 25 faz `convertVariables(text)`). Mas na edge function `voicer-generate-example`, a conversao esta implementada — o problema e que a funcao provavelmente nao esta deployada ou o bucket nao e publico.

3. **Falta botao IA para adicionar variaveis ao texto**: O usuario quer um botao (como nas imagens do Wevoicer — icone de "sparkles") que pega o texto puro e usa IA para inserir variaveis de fala automaticamente.

### Solucao

| Arquivo | Acao |
|---|---|
| `supabase/functions/voicer-generate-example/index.ts` | Melhorar: adicionar mais logs de debug, tratar erro de bucket inexistente. Remover `<break>` tags SSML que ElevenLabs nao suporta em texto puro — converter pausas para `...` ou remover |
| `ExamplesDialog.tsx` | Fix: adicionar cache-busting na URL, melhor tratamento de erros, mostrar detalhes do erro |
| `supabase/functions/voicer-enhance-text/index.ts` (novo) | Edge function que usa Lovable AI para pegar texto puro e adicionar variaveis de fala `{{...}}` |
| `TextEditor.tsx` | Adicionar botao "sparkles" (✨) que chama a IA para enriquecer o texto com variaveis |

### Detalhes Tecnicos

**Fix pausas na conversao**: ElevenLabs texto puro nao suporta `<break time="0.5s"/>`. Converter pausas para reticencias ou texto descritivo:
```typescript
"{{pausa curta}}": "...",
"{{pausa longa}}": "......",
"{{pausa 2 segundos}}": "........",
```

**Edge Function `voicer-enhance-text`**: Usa Lovable AI (LOVABLE_API_KEY ja disponivel) com prompt que conhece todas as variaveis disponiveis e insere no texto do usuario:
```
System: Voce e um especialista em locucao de vendas. Dado um texto, adicione variaveis de fala {{...}} para tornar a locucao mais natural e expressiva. Variaveis disponiveis: {{tom animado}}, {{locucao amigavel}}, {{pausa curta}}, etc. Retorne APENAS o texto modificado.
```

**Botao no TextEditor**: Icone sparkles (✨) ao lado do botao de variaveis. Ao clicar, envia o texto atual para a edge function e substitui pelo texto enriquecido. Loading state com spinner.

**Fix do audio dos exemplos**: Garantir que o bucket `voicer-audios` seja publico (pode precisar de migration para politica de storage). Adicionar timestamp na URL para evitar cache. Usar `fetch()` direto em vez de `supabase.functions.invoke()` se necessario para melhor controle de erro.

