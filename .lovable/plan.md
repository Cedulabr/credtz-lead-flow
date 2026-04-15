

## Correção do "Verificar Status" + Sincronização Automática com Evolution API

### Problema raiz identificado

O `EVOLUTION_API_URL` está salvo como `evocloud.werkonnect.com` **sem o protocolo `https://`**. Isso causa `TypeError: Invalid URL` em todas as chamadas `fetch()` da Edge Function — por isso o EasynFlow mostra "conectado" mas o CRM sempre retorna "desconectado".

### Alterações

**1. Edge Function `send-whatsapp/index.ts` — corrigir URL**
- Normalizar o `EVOLUTION_API_URL` adicionando `https://` caso não tenha protocolo:
```typescript
let evoUrl = Deno.env.get("EVOLUTION_API_URL") || "https://evocloud.werkonnect.com";
if (!evoUrl.startsWith("http")) evoUrl = "https://" + evoUrl;
```
- Aplicar a mesma correção em `autolead-worker` e `process-whatsapp-schedule`

**2. Nova Edge Function `sync-whatsapp-instances/index.ts`**
- Consulta `GET {EVOLUTION_API_URL}/instance/fetchInstances` com a API Key global
- Para cada instância retornada pela Evolution API:
  - Verifica se já existe no banco por `instance_name`
  - Se existe: atualiza `instance_status` (open → connected, caso contrário → disconnected)
  - Se não existe: insere novo registro
- Retorna resumo: quantas atualizadas, quantas novas, quantas desconectadas

**3. Frontend `WhatsAppConfig.tsx` — botão "Sincronizar com EasynFlow"**
- Adicionar botão com ícone `RefreshCw` ao lado do botão "Nova Instância"
- Ao clicar, chama a Edge Function `sync-whatsapp-instances`
- Exibe toast com resultado e recarrega a lista
- Loading state enquanto sincroniza

**4. Redeploy das 3 Edge Functions existentes** com a correção de URL

### Resultado esperado
- "Verificar Status" passa a funcionar corretamente (URL válida)
- Botão "Sincronizar" importa/atualiza status de todas as instâncias da Evolution de uma vez

