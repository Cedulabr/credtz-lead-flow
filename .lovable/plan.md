
## Plano: Remover Validacao Incorreta de Token

### Problema

A edge function `send-whatsapp` possui uma validacao (linhas 53-65) que rejeita tokens que "parecem ser numeros de telefone". Porem, conforme a documentacao da Easyn/Ticketz, o token pode ser **qualquer string** configurada na conexao — nao precisa ser JWT nem alfanumerico longo. Um token como `71986007832` e perfeitamente valido se foi assim configurado na plataforma.

A mesma mensagem enganosa aparece no UI do `WhatsAppConfig.tsx` dizendo que o token "geralmente comeca com eyJ...".

### Correcoes

#### 1. Edge Function `send-whatsapp/index.ts`

- **Remover completamente** a validacao de formato do token (linhas 53-65)
- O token sera aceito como qualquer string nao-vazia
- Manter apenas a validacao `if (!apiToken)` que ja existe

#### 2. UI `WhatsAppConfig.tsx`

- Atualizar o placeholder do campo token para algo generico: `"Cole o token configurado na conexão Easyn"`
- Atualizar o texto de ajuda para: "Token cadastrado na conexao do chat Easyn. Acesse Conexoes > Editar > copie o token."
- Remover a referencia a "eyJ..." e "numero de telefone"

### Arquivos a Modificar

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/send-whatsapp/index.ts` | Remover validacao de formato do token (linhas 53-65) |
| `src/components/WhatsAppConfig.tsx` | Atualizar placeholder e texto de ajuda do campo token |
