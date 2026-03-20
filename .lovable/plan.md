

## Fix: Envio de Áudio via WhatsApp API

### Diagnóstico

Analisei o fluxo completo de envio de áudio e identifiquei os seguintes problemas:

1. **Falha silenciosa no download**: Se o `downloadAsBase64()` falhar (bucket não público, arquivo não encontrado), o código retorna sem mostrar nenhum erro ao usuário (linha 106 do WhatsAppSendDialog)
2. **Blob vs File no Deno**: A API Ticketz espera um campo `medias` com um **arquivo**. No Deno, `FormData.append` com `Blob` pode não enviar corretamente os headers de Content-Disposition. Precisa usar `new File()` em vez de `new Blob()`
3. **Falta de log de debug**: Não há logs visíveis no edge function para envios de media, dificultando diagnóstico

### Mudanças

| Arquivo | Ação |
|---|---|
| `supabase/functions/send-whatsapp/index.ts` | Trocar `new Blob()` por `new File()` para garantir que o FormData envie o arquivo corretamente; adicionar logs de debug |
| `src/components/WhatsAppSendDialog.tsx` | Adicionar toast de erro quando `downloadAsBase64` falha; adicionar log de debug do tamanho do base64 |
| `src/modules/audios/hooks/useAudioFiles.ts` | Adicionar fallback para signed URL caso download direto falhe; melhorar tratamento de erro |

### Detalhes

**1. Edge Function — `File` em vez de `Blob`**

```typescript
// Antes (pode falhar em Deno):
const blob = new Blob([bytes], { type: detectedMime });
formData.append("medias", blob, mediaName);

// Depois (correto para Deno/Ticketz):
const file = new File([bytes], mediaName, { type: detectedMime });
formData.append("medias", file);
```

Adicionar logs: tamanho do arquivo, MIME type detectado, status da resposta.

**2. WhatsAppSendDialog — feedback de erro**

Quando `downloadAsBase64` retorna `null`, mostrar toast: "Erro ao baixar áudio. Verifique se o arquivo existe."

**3. Hook useAudioFiles — fallback com signed URL**

Se `download()` falhar, tentar com `createSignedUrl()` + `fetch()` como fallback.

