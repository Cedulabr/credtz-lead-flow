

## Correções: Documentos para Gestor + Filtros do Televendas

### Problema 1: Gestor não vê documentos da empresa

**Causa raiz**: Todos os 817 documentos na tabela `client_documents` têm `company_id = NULL`. As políticas RLS verificam `company_id`, mas como ele é NULL, o gestor nunca consegue acessar os documentos dos colaboradores da empresa.

**Solução em 3 partes**:

1. **Migration SQL**: Preencher o `company_id` dos documentos existentes com base no `uploaded_by` (buscar a empresa do usuário na tabela `user_companies`)
2. **Migration SQL**: Garantir que novos inserts sempre preencham `company_id` — criar um trigger `BEFORE INSERT` que preenche automaticamente o `company_id` a partir do `uploaded_by`
3. **Código frontend**: Atualizar os 4 pontos de insert de `client_documents` para incluir `company_id` (ClientDocuments.tsx, MyClientsList.tsx, TelevendasForm.tsx, DocumentUploadModal.tsx) — buscar o company_id do usuário logado via `user_companies`

### Problema 2: Filtros do Televendas — contagem incorreta

**Causa raiz**: O `activeFiltersCount` não inclui `filters.month`. Quando o usuário seleciona "Todos" no produto, o badge mostra menos filtros ativos do que deveria.

**Solução**: Adicionar `filters.month !== "all"` ao array de contagem de filtros ativos.

### Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| **Migration SQL** | UPDATE `client_documents` SET `company_id` via `user_companies`; Criar trigger `set_client_document_company_id` |
| `src/components/ClientDocuments.tsx` | Incluir `company_id` no insert |
| `src/components/MyClientsList.tsx` | Incluir `company_id` no insert |
| `src/components/TelevendasForm.tsx` | Incluir `company_id` no insert |
| `src/modules/sales-wizard/components/DocumentUploadModal.tsx` | Incluir `company_id` no insert |
| `src/modules/televendas/TelevendasModule.tsx` | Adicionar `filters.month !== "all"` ao `activeFiltersCount` |

### Detalhes técnicos

**Trigger SQL** (garante que novos docs sempre tenham company_id):
```sql
CREATE OR REPLACE FUNCTION set_client_document_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.uploaded_by IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM user_companies
    WHERE user_id = NEW.uploaded_by AND is_active = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Backfill dos documentos existentes**:
```sql
UPDATE client_documents cd
SET company_id = uc.company_id
FROM user_companies uc
WHERE cd.uploaded_by = uc.user_id
  AND uc.is_active = true
  AND cd.company_id IS NULL;
```

