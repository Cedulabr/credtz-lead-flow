

## Migração WhatsApp: Ticketz → Evolution API

### Resumo

Substituir completamente a camada de envio Ticketz pela Evolution API (`evocloud.werkonnect.com`), usando uma API Key global armazenada como secret no Supabase. O campo `api_token` na tabela `whatsapp_instances` passa a armazenar o **nome da instância na Evolution** (instance name/ID), não mais um token Bearer.

### Arquitetura nova

```text
Frontend → seleciona instância → Edge Function "send-whatsapp"
                                       ↓
                              Evolution API (apikey global)
                              POST /message/sendText/{instanceName}
```

### O que muda

**1. Secret global da Evolution**
- Adicionar secret `EVOLUTION_API_KEY` no Supabase Edge Functions
- Adicionar secret `EVOLUTION_API_URL` = `https://evocloud.werkonnect.com` (ou hardcoded)

**2. Tabela `whatsapp_instances` — mudança semântica**
- O campo `api_token` deixa de ser o Bearer token do Ticketz e passa a armazenar o **nome/ID da instância na Evolution** (ex: `instancia_01`)
- Renomear label no formulário de "Token API" para "Nome da Instância (Evolution)"
- Todos os tokens existentes ficam inválidos — usuários precisam recadastrar

**3. Edge Function `send-whatsapp/index.ts` — reescrever**
- Remover toda referência ao Ticketz
- Ler `EVOLUTION_API_KEY` do env
- Endpoint texto: `POST {EVOLUTION_API_URL}/message/sendText/{instanceName}`
- Endpoint mídia: `POST {EVOLUTION_API_URL}/message/sendMedia/{instanceName}`
- Headers: `apikey: {EVOLUTION_API_KEY}`, `Content-Type: application/json`
- Body texto: `{ "number": "5571999999999", "text": "mensagem" }`
- Body mídia: `{ "number": "...", "mediatype": "document", "media": "base64...", "fileName": "arquivo.pdf" }`
- Test mode: `GET {EVOLUTION_API_URL}/instance/connectionState/{instanceName}` para verificar se está connected
- Manter log no `whatsapp_messages`

**4. Edge Function `autolead-worker/index.ts` — reescrever**
- Mesma lógica: buscar instância → usar `api_token` como instanceName → chamar Evolution
- Texto: `/message/sendText/{instanceName}`
- Áudio: `/message/sendMedia/{instanceName}` com `mediatype: "audio"`

**5. Edge Function `process-whatsapp-schedule/index.ts` — reescrever**
- Mesma adaptação: trocar Ticketz por Evolution API

**6. Frontend `useWhatsApp.ts`**
- O hook já envia `apiToken` para a Edge Function — manter o mesmo campo, que agora carrega o instanceName
- Sem mudanças estruturais necessárias (a lógica fica na Edge Function)

**7. Frontend `WhatsAppConfig.tsx`**
- Trocar label "Token API" → "Nome da Instância (Evolution)"
- Trocar referência "API Ticketz" → "Evolution API"
- No teste de conexão, a Edge Function agora verifica `connectionState` em vez de enviar mensagem dummy
- Adicionar indicador de status da instância (connected/disconnected) via Evolution API

**8. Frontend `WhatsAppNotifyDialog.tsx` e outros modais**
- Sem mudanças — já usam `useWhatsApp` que delega para a Edge Function

### Arquivos a modificar

| Arquivo | Ação |
|---|---|
| `supabase/functions/send-whatsapp/index.ts` | Reescrever: Ticketz → Evolution |
| `supabase/functions/autolead-worker/index.ts` | Reescrever: Ticketz → Evolution |
| `supabase/functions/process-whatsapp-schedule/index.ts` | Reescrever: Ticketz → Evolution |
| `src/components/WhatsAppConfig.tsx` | Atualizar labels e teste de conexão |
| Secret `EVOLUTION_API_KEY` | Adicionar via ferramenta de secrets |
| Secret `EVOLUTION_API_URL` | Adicionar via ferramenta de secrets |

### Detalhes técnicos

**Formato Evolution API — Texto:**
```
POST https://evocloud.werkonnect.com/message/sendText/{instanceName}
Headers: { "apikey": "GLOBAL_KEY", "Content-Type": "application/json" }
Body: { "number": "5571999999999", "text": "Olá" }
```

**Formato Evolution API — Mídia:**
```
POST https://evocloud.werkonnect.com/message/sendMedia/{instanceName}
Headers: { "apikey": "GLOBAL_KEY", "Content-Type": "application/json" }
Body: { "number": "...", "mediatype": "document|audio|image", "media": "base64data", "fileName": "file.pdf" }
```

**Verificar status da instância:**
```
GET https://evocloud.werkonnect.com/instance/connectionState/{instanceName}
Headers: { "apikey": "GLOBAL_KEY" }
Response: { "instance": { "state": "open" } }  // "open" = conectado
```

### Fluxo de migração

1. Adicionar secrets `EVOLUTION_API_KEY` e `EVOLUTION_API_URL`
2. Reescrever as 3 Edge Functions
3. Atualizar WhatsAppConfig (labels + teste)
4. Deploy das Edge Functions
5. Usuários recadastram instâncias com o nome da Evolution

