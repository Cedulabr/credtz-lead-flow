

## Exemplos Prontos com Audio Demo — Gerar e Reproduzir

### Objetivo

Adicionar botao Play em cada exemplo do dialog "Exemplos Prontos" para que o usuario possa ouvir o audio modelo antes de usar. Os audios serao gerados sob demanda via ElevenLabs TTS (consumindo creditos da API) e cacheados no Supabase Storage para nao regenerar toda vez.

### Arquitetura

1. **Edge Function `voicer-generate-example`** (nova): gera o audio do exemplo usando ElevenLabs TTS sem exigir autenticacao de usuario (usa apenas a API key do ElevenLabs). Salva no bucket `voicer-audios` em `examples/{voiceId}-{hash}.mp3`. Retorna a URL publica. Se o arquivo ja existir no storage, retorna a URL diretamente sem chamar a ElevenLabs novamente.

2. **ExamplesDialog.tsx**: Adicionar botao Play circular ao lado do avatar do personagem (como na imagem Wevoicer). Ao clicar, chama a edge function para obter/gerar o audio e toca inline com um mini player. Estado de loading com spinner durante geracao.

### Mudancas

| Arquivo | Acao |
|---|---|
| `supabase/functions/voicer-generate-example/index.ts` | Nova edge function: recebe `text`, `voiceId`, `exampleKey`. Verifica se ja existe em `voicer-audios/examples/{exampleKey}.mp3`. Se sim, retorna URL publica. Se nao, chama ElevenLabs TTS, faz upload, retorna URL |
| `src/modules/voicer/components/ExamplesDialog.tsx` | Adicionar botao Play por exemplo com mini player inline. Gerar hash unico por exemplo (baseado no voiceId + titulo). Chamar edge function ao clicar Play. Cachear URL no estado local |

### Edge Function — voicer-generate-example

- Nao requer auth do usuario (os exemplos sao publicos/demonstrativos)
- Usa `ELEVENLABS_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY`
- Converte variaveis de fala antes de enviar para ElevenLabs (mesma logica do `convertVariables`)
- Salva como `examples/{exampleKey}.mp3` no bucket
- Cache: verifica existencia do arquivo antes de gerar

### ExamplesDialog — Layout atualizado

Cada card tera:
```text
+--------------------------------------------+
| [Play] [Emoji]  Titulo                [Usar]|
|                 Personagem — Role           |
|                 [Televendas] [Voz: Sarah]   |
+--------------------------------------------+
| {{locucao amigavel}} Ola! Tudo bem?...      |
+--------------------------------------------+
```

O botao Play sera um circulo com icone Play/Pause e spinner durante loading. Audio toca inline (HTML Audio element). Apenas um audio toca por vez (pausa o anterior ao clicar outro).

### Conversao de variaveis na Edge Function

A edge function precisara converter as variaveis de fala (ex: `{{tom suave}}` -> `[softly]`) antes de enviar para ElevenLabs. Implementar um mapa simplificado inline na edge function com as mesmas conversoes do `variableConverter.ts`.

### Deploy

Criar e deployar a edge function `voicer-generate-example`. Atualizar `config.toml` se necessario.

