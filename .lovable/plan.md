

## Fix: Áudios — Visibilidade para Todos + Isolamento por Empresa

### Diagnóstico

**Problema 1 — Áudio não aparece para não-admin**: O toggle "Enviar áudio?" no WhatsAppSendDialog só aparece quando `audios.length > 0`. O upload salva `company_id` usando `(profile as any)?.company_id`, mas o campo `company_id` **não existe na tabela `profiles`** — está na tabela `user_companies`. Resultado: `company_id` é salvo como `null`. A RLS permite ver áudios onde `user_id = auth.uid()` OU `company_id IN get_user_company_ids()`. Com `company_id = null`, só o próprio uploader vê seus áudios. Outros usuários da empresa não veem nada → toggle não aparece.

**Problema 2 — Sem isolamento por empresa**: Como `company_id` é sempre `null`, não há isolamento. Se corrigirmos salvando o `company_id` real, a RLS existente já faz o isolamento correto.

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/modules/audios/hooks/useAudioFiles.ts` | No `uploadAudio`, buscar `company_id` de `user_companies` em vez de `profile.company_id`; no `fetchAudios` e `deleteAudio`, permitir gestor deletar áudios da empresa |
| `src/modules/audios/AudiosModule.tsx` | Mostrar quem enviou o áudio (nome do usuário) para contexto em empresas |
| Migration SQL | Atualizar RLS de DELETE para permitir gestor deletar áudios da empresa; adicionar UPDATE policy |

### Detalhes

**1. useAudioFiles — company_id correto no upload**

```typescript
// Buscar company_id real de user_companies
const { data: ucData } = await supabase
  .from('user_companies')
  .select('company_id')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .limit(1)
  .maybeSingle();

const companyId = ucData?.company_id || null;
```

**2. RLS — gestor pode deletar áudios da empresa**

```sql
DROP POLICY IF EXISTS "Users delete own audios" ON public.audio_files;
CREATE POLICY "Users delete own or company audios" ON public.audio_files
  FOR DELETE TO authenticated USING (
    user_id = auth.uid()
    OR public.is_global_admin(auth.uid())
    OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  );
```

**3. Fix áudios existentes** — Migration para atualizar áudios com `company_id = null` usando o `user_companies` do uploader.

