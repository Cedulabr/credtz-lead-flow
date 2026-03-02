

## Plano: Mostrar mensagem "numero pode nao ter WhatsApp" nos 3 modulos

### Problema raiz
O `supabase.functions.invoke()` lanca um `FunctionsHttpError` quando recebe status 502. O hook `useWhatsApp.ts` captura esse erro generico ("Edge Function returned a non-2xx status code") sem extrair o body JSON que contem a mensagem detalhada do edge function.

### Solucao

#### 1. Corrigir `src/hooks/useWhatsApp.ts` - Extrair mensagem de erro do body

Nas funcoes `sendTextMessage` e `sendMediaMessage`, quando o `supabase.functions.invoke` retorna erro, o objeto `error` e do tipo `FunctionsHttpError` que tem um metodo `context.json()` ou o `data` pode conter a resposta. Na verdade, quando o status nao e 2xx, o SDK coloca o erro em `error` mas o `data` ainda pode ter o body.

A correcao: usar `error.context?.json()` para extrair o body da resposta de erro, ou alternativamente mudar a abordagem - fazer o edge function sempre retornar 200 com `success: false` no body, para que o SDK nao lance excecao.

**Abordagem escolhida**: Modificar a edge function para retornar status **200** com `{ success: false, error: "..." }` em vez de 502. Isso permite que o `data` no hook contenha a mensagem de erro completa sem precisar lidar com excecoes do SDK.

#### 2. Modificar `supabase/functions/send-whatsapp/index.ts`

Mudar o status de resposta de 502 para **200** quando o erro vem do Ticketz, mantendo `success: false` no body. A mensagem de erro sera:

```
"Este numero pode nao ter WhatsApp ativo. Verifique o numero e tente novamente."
```

Para erros de Ticketz (`ERR_INTERNAL_ERROR`), a mensagem principal sera clara e direta focando no numero invalido, ja que o usuario confirmou que a API esta conectada e funcionando.

#### 3. Garantir exibicao via toast em todos os modulos

Como todos os modulos (Activate Leads, Leads Premium, Meus Clientes) usam o mesmo hook `useWhatsApp.ts` e o mesmo `WhatsAppSendDialog`, a correcao no hook + edge function sera automaticamente refletida em todos.

### Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/send-whatsapp/index.ts` | Retornar status 200 com success:false + mensagem clara sobre WhatsApp inativo |
| `src/hooks/useWhatsApp.ts` | Nenhuma mudanca necessaria (ja trata `data.success === false`) |

### Detalhes tecnicos

**Edge function** - bloco de erro (linhas 200-215):
```typescript
if (!success) {
  let errorDetail: string;
  if (responseData?.error === "ERR_INTERNAL_ERROR") {
    errorDetail = `Este número (${normalizedNumber}) pode não ter WhatsApp ativo. Verifique o número e tente novamente.`;
  } else {
    errorDetail = responseData?.error || "Falha ao enviar mensagem";
  }
  return new Response(
    JSON.stringify({ success: false, error: errorDetail, details: responseData, sentTo: normalizedNumber }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

Isso resolve o problema porque:
1. Status 200 evita que o SDK lance excecao
2. `success: false` no body e capturado pelo hook na linha 104-105
3. A mensagem de erro e exibida via `toast.error()` na linha 109
4. Funciona identicamente em todos os 3 modulos pois usam o mesmo hook
