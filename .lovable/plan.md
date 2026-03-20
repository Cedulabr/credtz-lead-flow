

## Registrar Número WhatsApp Usado no Histórico do Lead ✅

### Implementação

Adicionado callback `onSent` ao `WhatsAppSendDialog` que retorna `{ instanceName, instancePhone, sentVia }` após envio bem-sucedido (API ou link wa.me).

| Arquivo | Ação |
|---|---|
| `src/components/WhatsAppSendDialog.tsx` | Nova prop `onSent` + export `WhatsAppSentInfo` type |
| `src/modules/leads-premium/components/LeadDetailDrawer.tsx` | Registra no JSONB `history` do lead |
| `src/modules/leads-premium/components/LeadListItem.tsx` | Registra no JSONB `history` do lead |
| `src/components/ActivateLeads.tsx` | Registra em `activate_leads_history` |
| `src/components/MyClientsList.tsx` | Registra em `client_interactions` |
| `src/components/MyClientsKanban.tsx` | Registra em `pipeline_history` |

## Módulo "Áudios" + Integração WhatsApp com Envio de Áudio ✅

### Implementação

Criado módulo Áudios para upload/gerenciamento de arquivos de áudio e integrado opção "Enviar áudio?" no WhatsAppSendDialog.

| Arquivo | Ação |
|---|---|
| Migration SQL | Tabela `audio_files` + bucket `audio-files` + RLS |
| `src/modules/audios/AudiosModule.tsx` | Módulo com listagem, upload, player, exclusão |
| `src/modules/audios/hooks/useAudioFiles.ts` | Hook CRUD + download base64 |
| `src/modules/audios/types.ts` | Tipos |
| `src/modules/audios/index.ts` | Barrel export |
| `src/components/WhatsAppSendDialog.tsx` | Switch "Enviar áudio?" + seletor + player preview |
| `src/components/LazyComponents.tsx` | Lazy import AudiosModule |
| `src/components/Navigation.tsx` | Item "Áudios" com ícone Mic |
| `src/pages/Index.tsx` | Tab `audios` com permissão |
| `supabase/functions/send-whatsapp/index.ts` | MIME type dinâmico por extensão |
