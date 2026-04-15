

## Atualizar módulo WhatsApp para usar `instance_name` como identificador Evolution

### Problema
As instâncias do EasynFlow já estão cadastradas na tabela `whatsapp_instances` com o campo `instance_name` contendo o nome/ID da instância Evolution. Porém, o código atual exige `api_token` (que está NULL em todas) para funcionar. A API key é global (já configurada como secret `EVOLUTION_API_KEY`).

### Solução
Eliminar a dependência de `api_token` e usar `instance_name` como identificador da instância na Evolution API.

### Alterações

**1. `src/hooks/useWhatsApp.ts`**
- Mudar `hasToken` para considerar instância válida quando tem `instance_name` (não mais `api_token`)
- Em `sendTextMessage` e `sendMediaMessage`: enviar `instanceName: inst.instance_name` em vez de `apiToken: inst.api_token`
- Remover `getTokenForInstance` — não é mais necessário buscar token individual

**2. `supabase/functions/send-whatsapp/index.ts`**
- Aceitar campo `instanceName` diretamente no body (além do legado `apiToken` para retrocompatibilidade)
- Priorizar `instanceName` sobre `apiToken`

**3. `src/components/WhatsAppConfig.tsx`**
- Remover campo "Nome da Instância (Evolution)" (`formToken` / `api_token`) do formulário — já não é necessário, pois `instance_name` é o identificador
- O campo `instance_name` existente já serve como o ID Evolution
- Ajustar `handleTest` para enviar `instanceName: inst.instance_name` em vez de `apiToken: inst.api_token`
- Remover validação que exige `formToken`
- Na tabela de instâncias, mostrar status baseado em `instance_status` do banco

**4. `supabase/functions/autolead-worker/index.ts`**
- Usar `instance_name` diretamente ao chamar a Evolution API (em vez de `api_token`)

**5. `supabase/functions/process-whatsapp-schedule/index.ts`**
- Mesma adaptação: usar `instance_name` como instanceName na chamada Evolution

### Resumo técnico
- O campo `api_token` se torna obsoleto — `instance_name` é o identificador Evolution
- A API key global `EVOLUTION_API_KEY` (já configurada) autentica todas as chamadas
- Nenhuma migração de banco necessária — os dados já estão corretos

