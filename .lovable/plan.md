

## Plano: Integracao WhatsApp via API Ticketz

### Visao Geral

Integrar envio de mensagens WhatsApp diretamente pelo aplicativo usando a API do Ticketz (chat.easyn.digital). Inclui: modulo de configuracao de token, botoes de envio nos modulos de leads, e envio de proposta via WhatsApp no Gerador de Propostas.

### Infraestrutura Existente

Ja existem tabelas `whatsapp_instances` e `whatsapp_messages` no banco, mas sem campo de token. Tambem ja existe `can_access_whatsapp` no perfil do usuario. Vamos reaproveitar essas tabelas.

---

### Parte 1: Banco de Dados - Adicionar campo token

**Migracao SQL:**
- Adicionar coluna `api_token` (text) na tabela `whatsapp_instances`
- Adicionar coluna `company_id` (uuid, FK companies) na tabela `whatsapp_instances`
- Adicionar coluna `direction` (text, default 'outgoing') na tabela `whatsapp_messages`
- Adicionar coluna `media_url` (text) na tabela `whatsapp_messages`
- Adicionar coluna `message_type` (text, default 'text') na tabela `whatsapp_messages`
- Atualizar RLS para permitir gestores gerenciarem tokens da empresa

### Parte 2: Edge Function - Proxy de envio

Criar edge function `send-whatsapp` que:
- Recebe: `{ token, number, body, mediaBase64?, mediaName? }`
- Faz POST para `https://chat.easyn.digital:443/backend/api/messages/send`
- Para texto: Content-Type `application/json`, body com number, body, saveOnTicket, linkPreview
- Para media: Content-Type `multipart/form-data`, FormData com number, medias (arquivo), saveOnTicket
- Registra na tabela `whatsapp_messages`
- Retorna sucesso/erro

### Parte 3: Modulo WhatsApp (Configuracao)

**Novo arquivo: `src/components/WhatsAppConfig.tsx`**

Interface com:
- Cadastro/edicao do token da API (campo "Token de Acesso")
- Status da conexao (teste de envio)
- Historico de mensagens enviadas
- Acessivel via navegacao (ja existe `can_access_whatsapp` no perfil)

**Adicionar ao `Navigation.tsx`:**
- Item "WhatsApp" com icone MessageCircle, permissionKey `can_access_whatsapp`

### Parte 4: Componente de Envio Reutilizavel

**Novo arquivo: `src/components/WhatsAppSendDialog.tsx`**

Dialog reutilizavel que:
- Recebe: numero do telefone, nome do cliente, mensagem pre-preenchida (opcional), arquivo PDF (opcional)
- Busca o token do usuario/empresa na tabela `whatsapp_instances`
- Permite editar a mensagem antes de enviar
- Mostra preview da mensagem
- Chama a edge function `send-whatsapp`
- Toast de sucesso/erro

### Parte 5: Integracao nos Modulos

#### 5A. Activate Leads (`ActivateLeads.tsx`)
- Adicionar botao WhatsApp verde ao lado das acoes do lead (na modal de detalhes ou na listagem)
- Ao clicar, abre `WhatsAppSendDialog` com telefone e nome pre-preenchidos
- Mensagem padrao: "Ola {nome}, tudo bem?"

#### 5B. Leads Premium (`LeadDetailDrawer.tsx`)
- O botao "WhatsApp" ja existe (linha 331-336) mas abre `wa.me` externo
- Substituir para abrir `WhatsAppSendDialog` enviando via API interna
- Manter opcao de fallback para wa.me caso nao tenha token configurado

#### 5C. Meus Clientes (`MyClientsKanban.tsx`)
- Adicionar botao WhatsApp na modal de detalhes do cliente
- Mesma logica: abre `WhatsAppSendDialog`

#### 5D. Gerador de Propostas (`ProposalGenerator.tsx`)
- Na tela de summary (apos gerar proposta), adicionar botao "Enviar via WhatsApp"
- Gera o PDF em memoria (blob) e envia como media via WhatsApp
- Mensagem acompanhando: "Ola {nome}, segue sua proposta de credito consignado."

#### 5E. Sales Wizard (`SalesWizard.tsx`)
- Apos o `SmsNotifyDialog`, adicionar opcao "Enviar proposta via WhatsApp"
- Novo dialog `WhatsAppNotifyDialog` similar ao `SmsNotifyDialog`

### Parte 6: Hook de WhatsApp

**Novo arquivo: `src/hooks/useWhatsApp.ts`**

Hook que:
- Busca o token do usuario/empresa
- Funcao `sendTextMessage(number, body)`
- Funcao `sendMediaMessage(number, file)`
- Gerencia estados de loading/erro
- Cache do token para evitar consultas repetidas

---

### Arquivos a Criar

| Arquivo | Descricao |
|---|---|
| `supabase/functions/send-whatsapp/index.ts` | Edge function proxy para API Ticketz |
| `src/components/WhatsAppConfig.tsx` | Modulo de configuracao de token |
| `src/components/WhatsAppSendDialog.tsx` | Dialog reutilizavel de envio |
| `src/hooks/useWhatsApp.ts` | Hook de envio de mensagens |

### Arquivos a Modificar

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Adicionar colunas na tabela whatsapp_instances e whatsapp_messages |
| `src/components/Navigation.tsx` | Adicionar item "WhatsApp" no menu |
| `src/pages/Index.tsx` | Renderizar WhatsAppConfig e WhatsAppSendDialog |
| `src/components/ActivateLeads.tsx` | Botao WhatsApp na acao do lead |
| `src/modules/leads-premium/components/LeadDetailDrawer.tsx` | Substituir wa.me por envio via API |
| `src/components/MyClientsKanban.tsx` | Botao WhatsApp na modal do cliente |
| `src/components/ProposalGenerator.tsx` | Botao "Enviar via WhatsApp" no summary |
| `src/modules/sales-wizard/SalesWizard.tsx` | Opcao WhatsApp apos gerar proposta |

### Detalhamento Tecnico da Edge Function

```text
Endpoint: POST /send-whatsapp
Body JSON:
{
  "token": "bearer_token",
  "number": "558599999999",
  "body": "mensagem",        // para texto
  "mediaBase64": "base64...", // para media (opcional)
  "mediaName": "proposta.pdf" // nome do arquivo (opcional)
}

Logica:
1. Se mediaBase64 presente -> multipart/form-data com arquivo
2. Se apenas body -> application/json com texto
3. Registra em whatsapp_messages
4. Retorna { success: true/false, messageId }
```

### Fluxo do Usuario

1. Usuario vai em "WhatsApp" no menu lateral
2. Cadastra seu token de acesso da API Ticketz
3. Ao navegar para Activate Leads, Leads Premium ou Meus Clientes, ve botao WhatsApp verde
4. Clica no botao -> abre dialog com mensagem editavel -> envia
5. No Gerador de Propostas, apos gerar PDF, pode enviar diretamente via WhatsApp

