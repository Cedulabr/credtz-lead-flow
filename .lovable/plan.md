

## AutoLead — Fix RPC + Adicionar Envio de Áudio

### Problemas

1. **Erro RPC**: A chamada `request_leads_with_credits` em `useAutoLead.ts` (linha 199-208) passa apenas 5 parâmetros, causando ambiguidade com as duas sobrecargas no banco. Precisa adicionar `tag_filter`.

2. **Sem opção de áudio**: O wizard não permite escolher um áudio do módulo Áudios para enviar junto (ou em vez de) a mensagem de texto. O worker envia apenas texto via API Ticketz.

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/modules/autolead/hooks/useAutoLead.ts` | Adicionar `tag_filter` na chamada RPC (linha ~199-208) |
| `src/modules/autolead/types.ts` | Adicionar `audioFileId?: string` e `audioTitle?: string` ao `WizardData` |
| `src/modules/autolead/components/AutoLeadWizard.tsx` | No step 2 (Mensagem WA), adicionar seção para selecionar áudio do módulo Áudios; buscar `audio_files` disponíveis; permitir escolher "Texto + Áudio" ou "Apenas Texto" |
| `src/modules/autolead/hooks/useAutoLead.ts` | Salvar `audio_file_id` no job e nas messages |
| Migration SQL | Adicionar coluna `audio_file_id uuid nullable` na tabela `autolead_jobs` e `autolead_messages` |
| `supabase/functions/autolead-worker/index.ts` | Quando `audio_file_id` presente, buscar o áudio no Storage, enviar via rota de mídia da API Ticketz (multipart/form-data com campo `medias`) após a mensagem de texto |

### Detalhes

**1. Fix RPC — uma linha**

```typescript
// useAutoLead.ts, linha ~199
const { data: leads, error: leadsError } = await (supabase as any).rpc(
  "request_leads_with_credits",
  {
    leads_requested: wizardData.quantidade,
    ddd_filter: wizardData.ddds.length > 0 ? wizardData.ddds : null,
    convenio_filter: wizardData.tipoLead === "todos" ? null : wizardData.tipoLead,
    banco_filter: null,
    produto_filter: null,
    tag_filter: wizardData.tags.length > 0 ? wizardData.tags : null,  // FIX
  }
);
```

**2. WizardData — novos campos**

```typescript
export interface WizardData {
  // ...campos existentes
  audioFileId?: string;    // ID do áudio selecionado
  audioTitle?: string;     // título para display
}
```

**3. Wizard Step 2 — seleção de áudio**

Abaixo dos templates de mensagem WhatsApp, adicionar seção "🎵 Enviar Áudio":
- Switch "Incluir áudio na mensagem"
- Lista de áudios disponíveis do `audio_files` (filtrado por company_id)
- Card selecionável com título e player de preview
- Info: "O áudio será enviado logo após a mensagem de texto"

**4. Migration — colunas para áudio**

```sql
ALTER TABLE public.autolead_jobs ADD COLUMN IF NOT EXISTS audio_file_id uuid;
ALTER TABLE public.autolead_messages ADD COLUMN IF NOT EXISTS audio_file_id uuid;
```

**5. useAutoLead.ts — salvar audio no job/messages**

Ao criar job, salvar `audio_file_id: wizardData.audioFileId || null`. Ao gerar messages, incluir `audio_file_id` em cada mensagem.

**6. autolead-worker — enviar áudio via Ticketz**

Quando a mensagem tem `audio_file_id`:
1. Buscar `file_path` da tabela `audio_files`
2. Baixar o arquivo do Supabase Storage
3. Enviar primeiro a mensagem de texto (como já faz)
4. Enviar o áudio via rota de mídia da API Ticketz usando `multipart/form-data` com o campo `medias`

```typescript
// Após envio do texto com sucesso
if (msg.audio_file_id) {
  const { data: audioFile } = await supabase
    .from("audio_files").select("file_path, mime_type").eq("id", msg.audio_file_id).maybeSingle();
  
  if (audioFile) {
    const { data: fileData } = await supabase.storage.from("audio-files").download(audioFile.file_path);
    if (fileData) {
      const formData = new FormData();
      formData.append("number", phone);
      formData.append("body", "");
      formData.append("medias", new File([fileData], "audio.ogg", { type: audioFile.mime_type || "audio/ogg" }));
      
      await fetch(TICKETZ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${instance.api_token}` },
        body: formData,
      });
    }
  }
}
```

### Fluxo

```text
Wizard Step 2: Usuário escolhe template + seleciona áudio
        ↓
Job criado com audio_file_id
        ↓
Messages geradas com audio_file_id
        ↓
Worker: envia texto → envia áudio (se configurado)
        ↓
Lead recebe mensagem de texto + áudio de voz
```

