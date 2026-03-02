

## Plano: Corrigir Erros WhatsApp (Edge Function, Teste API, e Botoes nos Modulos)

### Problemas Identificados

**1. Edge Function retorna erro non-2xx**
- Os headers CORS da edge function estao incompletos (faltam headers do Supabase client)
- O Ticketz retorna `ERR_INTERNAL_ERROR` -- provavelmente o numero esta sendo enviado sem o formato correto ou o token tem problema
- A edge function precisa de melhor tratamento de erros e logging

**2. Botao "Testar API" da erro de conexao**
- O `WhatsAppConfig.tsx` chama a API Ticketz **diretamente do navegador** (linha 162), o que causa erro de CORS pois o navegador bloqueia chamadas cross-origin
- A solucao e rotear o teste atraves da edge function `send-whatsapp`

**3. Leads Premium e Meus Clientes**
- Ambos JA possuem o botao "API WhatsApp", porem estao posicionados dentro de modais de detalhe, dificultando o acesso
- Leads Premium: botao esta dentro do `LeadDetailDrawer` (so aparece ao clicar no lead)
- Meus Clientes: botao esta dentro do modal de detalhes (so aparece ao abrir o cliente)
- Ambos funcionam corretamente na estrutura, mas podem nao estar visiveis o suficiente

---

### Correcoes Planejadas

#### Parte 1: Edge Function `send-whatsapp`

**Arquivo:** `supabase/functions/send-whatsapp/index.ts`

- Atualizar CORS headers para incluir todos os headers necessarios do Supabase client
- Adicionar modo "test" que valida o token sem enviar mensagem real (para o botao testar)
- Melhorar logging para diagnosticar erros do Ticketz
- Garantir que o numero esta no formato correto (com codigo do pais)

#### Parte 2: Botao Testar API no WhatsAppConfig

**Arquivo:** `src/components/WhatsAppConfig.tsx`

- Substituir a chamada direta ao Ticketz (`fetch("https://chat.easyn.digital...")`) por uma chamada via edge function `send-whatsapp`
- Usar `supabase.functions.invoke("send-whatsapp", { body: { apiToken, number: "5500000000000", message: "Teste", testMode: true } })`
- Isso evita o erro de CORS no navegador

#### Parte 3: Visibilidade dos Botoes nos Modulos

**Leads Premium** (`src/modules/leads-premium/views/LeadsListView.tsx` ou componente de lista):
- Verificar se o botao WhatsApp aparece na listagem de leads (nao apenas no drawer de detalhes)
- Adicionar botao WhatsApp na linha/card do lead para acesso rapido, similar ao ActivateLeads

**Meus Clientes** (`src/components/MyClientsKanban.tsx`):
- O botao ja existe dentro do modal de detalhes, verificar se esta visivel o suficiente
- Garantir que o botao "API WhatsApp" esta com destaque visual (cor verde) para ser facilmente encontrado

---

### Detalhamento Tecnico

**Edge Function - CORS fix:**
```text
corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, 
    x-supabase-client-platform, x-supabase-client-platform-version, 
    x-supabase-client-runtime, x-supabase-client-runtime-version"
}
```

**Edge Function - Test mode:**
```text
Se body.testMode === true:
  - Faz uma chamada simples ao Ticketz para validar o token
  - Retorna { success: true, testMode: true } se token valido
  - Nao registra na tabela whatsapp_messages
```

**WhatsAppConfig - handleTest fix:**
```text
Antes: fetch direto ao Ticketz (CORS bloqueado)
Depois: supabase.functions.invoke("send-whatsapp", { body: { apiToken, testMode: true } })
```

### Arquivos a Modificar

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/send-whatsapp/index.ts` | Fix CORS headers, adicionar testMode, melhorar logging |
| `src/components/WhatsAppConfig.tsx` | Rotear teste via edge function em vez de chamada direta |
| `src/modules/leads-premium/views/LeadsListView.tsx` | Verificar/adicionar botao WhatsApp visivel na lista |
| `src/components/MyClientsKanban.tsx` | Garantir visibilidade do botao API WhatsApp |

