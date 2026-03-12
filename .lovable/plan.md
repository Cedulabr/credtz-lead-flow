

## Correção: Documentos "Meus Dados" — Bucket not found (404)

### Causa Raiz

O bucket `user-documents` existe mas é **privado** (`public: false`). O código usa `getPublicUrl()` que gera URLs com `/object/public/...` — essas URLs retornam 404 em buckets privados.

Além disso, falta a **policy de INSERT** no storage, impedindo uploads.

### Correções

**1. Migration SQL — Adicionar policy de INSERT no storage**

```sql
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
```

**2. `src/components/MyData/DocumentsManager.tsx` — Usar signed URLs**

No upload (linha 83-86): remover `getPublicUrl()` e salvar apenas o **file path** (ex: `userId/rg_v1_123.pdf`) no campo `file_url` do banco.

Na visualização/download (linhas 287 e 296-299): criar uma função helper que gera signed URL sob demanda:

```typescript
const getSignedUrl = async (fileUrl: string): Promise<string | null> => {
  // Extract path from legacy full URLs or use path directly
  const filePath = fileUrl.includes('/storage/v1/')
    ? fileUrl.split('/user-documents/')[1]
    : fileUrl;
  
  if (!filePath) return null;
  
  const { data, error } = await supabase.storage
    .from('user-documents')
    .createSignedUrl(filePath, 3600); // 1 hour
  
  if (error) {
    console.error('Error creating signed URL:', error);
    toast.error('Erro ao acessar documento');
    return null;
  }
  return data.signedUrl;
};

// Visualizar
const handleView = async (doc: UserDocument) => {
  const url = await getSignedUrl(doc.file_url);
  if (url) window.open(url, '_blank');
};

// Baixar
const handleDownload = async (doc: UserDocument) => {
  const url = await getSignedUrl(doc.file_url);
  if (url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.file_name;
    link.click();
  }
};
```

Substituir os `onClick` dos botões Eye e Download para usar essas funções.

Na exclusão (linha 111-113): extrair o path da mesma forma para funcionar com URLs legadas e paths novos.

### Arquivos a Modificar

| Arquivo | Ação |
|---|---|
| Migration SQL | Adicionar INSERT policy no storage `user-documents` |
| `src/components/MyData/DocumentsManager.tsx` | Salvar path em vez de public URL; usar `createSignedUrl` para view/download |

### Compatibilidade com dados existentes

Os 5 registros atuais têm URLs completas (`https://...supabase.co/storage/v1/object/public/user-documents/...`). A função `getSignedUrl` extrai o path após `/user-documents/` para manter compatibilidade. Novos uploads salvarão apenas o path relativo.

