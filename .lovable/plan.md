

## Módulo "Áudios" + Integração WhatsApp com Envio de Áudio

### Resumo

Criar um módulo "Áudios" para upload e gerenciamento de arquivos de áudio, e integrar uma opção "Enviar áudio?" no `WhatsAppSendDialog` que permite selecionar um áudio salvo antes do envio via API WhatsApp. O áudio será armazenado no Supabase Storage e os metadados em uma tabela `audio_files`.

### Mudanças

| Componente | Ação |
|---|---|
| Migration SQL | Criar tabela `audio_files` (id, user_id, company_id, title, file_path, duration, created_at); criar bucket `audio-files` com RLS |
| `src/modules/audios/AudiosModule.tsx` | Módulo principal com listagem, upload, player inline, exclusão |
| `src/modules/audios/hooks/useAudioFiles.ts` | Hook para CRUD de áudios (fetch, upload, delete) |
| `src/modules/audios/types.ts` | Tipos do módulo |
| `src/modules/audios/index.ts` | Barrel export |
| `src/components/WhatsAppSendDialog.tsx` | Adicionar switch "Enviar áudio?" + seletor de áudios salvos + player preview; enviar áudio como media via API |
| `src/components/LazyComponents.tsx` | Registrar lazy import do AudiosModule |
| `src/components/Navigation.tsx` | Adicionar item "Áudios" com ícone `Mic` |
| `src/pages/Index.tsx` | Adicionar tab `audios` com permissão e componente |
| `supabase/functions/send-whatsapp/index.ts` | Ajustar Content-Type do blob para `audio/mpeg` quando mediaName terminar em `.mp3`/`.ogg`/`.wav` |

### Detalhes Técnicos

**1. Tabela `audio_files`**

```sql
CREATE TABLE public.audio_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text DEFAULT 'audio/mpeg',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;

-- Users can see own + company audios
CREATE POLICY "Users see own and company audios" ON public.audio_files
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    OR public.is_global_admin(auth.uid())
  );

CREATE POLICY "Users insert own audios" ON public.audio_files
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own audios" ON public.audio_files
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR public.is_global_admin(auth.uid())
  );
```

Storage bucket `audio-files` (público para playback simples) com policies para upload/delete.

**2. Módulo Áudios (`AudiosModule.tsx`)**

- Header com titulo "Áudios" e botão "Novo Áudio"
- Dialog de upload: campo título + file input (accept audio/*)
- Lista de áudios em cards com: título, player `<audio>` nativo com controls, botão deletar
- Usa signed URLs para reprodução

**3. WhatsAppSendDialog — opção de áudio**

- Novo switch "Enviar áudio?" abaixo do campo mensagem
- Quando ativado, carrega lista de `audio_files` do usuário
- Select para escolher o áudio + player preview inline
- Ao enviar, baixa o áudio do Storage, converte para base64, e envia via `sendMediaMessage` com o nome do arquivo

**4. Edge Function — MIME type correto**

No `send-whatsapp/index.ts`, ao criar o Blob para media, detectar extensão do arquivo para usar o MIME type correto (audio/mpeg, audio/ogg, etc.) em vez de hardcoded `application/pdf`.

### Fluxo

```text
Módulo Áudios:
  Upload → Storage bucket → Metadados em audio_files → Player inline

WhatsApp Dialog:
  Switch "Enviar áudio?" → Carrega audio_files → Seleciona → Preview player
  → Enviar → Baixa signed URL → Base64 → sendMediaMessage → API Ticketz
```

