
# Plano: Permitir Edição Limitada para Colaboradores no Módulo Televendas

## Objetivo

Permitir que colaboradores editem campos específicos (banco, parcela, troco, saldo_devedor) de suas próprias propostas, mantendo um histórico completo das alterações para auditoria.

---

## Análise do Cenário Atual

| Aspecto | Situação Atual |
|---------|----------------|
| Permissão de edição | Apenas admin e gestor podem editar (`canEdit` linha 406) |
| Modal de edição | Permite editar todos os campos (nome, CPF, telefone, etc.) |
| Histórico de edições | Não existe - apenas histórico de status |
| Indicação visual | Não há indicação de que proposta foi editada |

---

## Alterações Necessárias

### 1. Banco de Dados - Nova Tabela de Histórico de Edições

Criar tabela `televendas_edit_history` para registrar todas as edições:

```sql
CREATE TABLE televendas_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  televendas_id UUID NOT NULL REFERENCES televendas(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES profiles(id),
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  original_data JSONB NOT NULL, -- Dados antes da edição
  new_data JSONB NOT NULL,      -- Dados após a edição
  fields_changed TEXT[] NOT NULL -- Lista de campos alterados
);
```

E adicionar coluna na tabela `televendas`:

```sql
ALTER TABLE televendas ADD COLUMN edit_count INTEGER DEFAULT 0;
```

### 2. Arquivo: `src/modules/televendas/types.ts`

Adicionar interface para o histórico de edições:

```typescript
export interface EditHistoryItem {
  id: string;
  televendas_id: string;
  edited_by: string;
  edited_at: string;
  original_data: {
    banco?: string;
    parcela?: number;
    troco?: number | null;
    saldo_devedor?: number | null;
  };
  new_data: {
    banco?: string;
    parcela?: number;
    troco?: number | null;
    saldo_devedor?: number | null;
  };
  fields_changed: string[];
  edited_by_name?: string;
}
```

Atualizar interface Televenda:

```typescript
export interface Televenda {
  // ... campos existentes ...
  edit_count?: number;
}
```

### 3. Novo Componente: `src/modules/televendas/components/CollaboratorEditModal.tsx`

Modal simplificado para colaboradores com apenas os 4 campos permitidos:
- Banco (select)
- Parcela (input numérico)
- Troco (input numérico)
- Saldo Devedor (input numérico)

O modal deve:
- Mostrar os valores atuais
- Salvar histórico antes de atualizar
- Incrementar o contador de edições

### 4. Arquivo: `src/modules/televendas/TelevendasModule.tsx`

**Modificar permissão de edição:**
```typescript
// ANTES:
const canEdit = (tv: Televenda) => isAdmin || (isGestor && userCompanyIds.includes(tv.company_id || ""));

// DEPOIS:
const canEdit = (tv: Televenda) => isAdmin || (isGestor && userCompanyIds.includes(tv.company_id || ""));
const canEditLimited = (tv: Televenda) => tv.user_id === user?.id && !isGestorOrAdmin;
```

**Adicionar handler para edição limitada:**
```typescript
const handleLimitedEdit = (tv: Televenda) => {
  setEditingTelevenda(tv);
  setLimitedEditModalOpen(true);
};

const handleLimitedEditSave = async (id: string, data: Partial<Televenda>, originalData: object) => {
  // 1. Salvar histórico de edição
  await supabase.from("televendas_edit_history").insert({
    televendas_id: id,
    edited_by: user?.id,
    original_data: originalData,
    new_data: data,
    fields_changed: Object.keys(data),
  });

  // 2. Atualizar proposta + incrementar contador
  await supabase.from("televendas")
    .update({ ...data, edit_count: (originalData.edit_count || 0) + 1 })
    .eq("id", id);

  // 3. Adicionar observação automática
  const obsText = `[EDITADO em ${new Date().toLocaleDateString('pt-BR')}] `;
  // Concatenar com observação existente
};
```

**Usar modal correto baseado no perfil:**
```typescript
// No ActionMenu ou ao clicar em editar:
if (canEdit(tv)) {
  handleEdit(tv); // Modal completo (admin/gestor)
} else if (canEditLimited(tv)) {
  handleLimitedEdit(tv); // Modal simplificado (colaborador)
}
```

### 5. Arquivo: `src/modules/televendas/components/DetailModal.tsx`

Adicionar seção "Histórico de Edições" abaixo do histórico de status:

```typescript
// Buscar histórico de edições
const fetchEditHistory = async () => {
  const { data } = await supabase
    .from("televendas_edit_history")
    .select("*")
    .eq("televendas_id", televenda.id)
    .order("edited_at", { ascending: false });
  // ...
};

// Renderizar seção
<div>
  <h3>HISTÓRICO DE EDIÇÕES</h3>
  {editHistory.map((edit) => (
    <div key={edit.id}>
      <p>Editado por {edit.edited_by_name} em {formatDate(edit.edited_at)}</p>
      <div>
        <span>Antes:</span> Banco: {edit.original_data.banco}, Parcela: {edit.original_data.parcela}
        <span>Depois:</span> Banco: {edit.new_data.banco}, Parcela: {edit.new_data.parcela}
      </div>
    </div>
  ))}
</div>
```

### 6. Indicação Visual de Proposta Editada

Nos cards de proposta (PropostasView), mostrar badge quando `edit_count > 0`:

```typescript
{tv.edit_count && tv.edit_count > 0 && (
  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
    ✏️ Editado ({tv.edit_count}x)
  </Badge>
)}
```

### 7. Arquivo: `src/modules/televendas/components/ActionMenu.tsx`

Atualizar para mostrar opção de edição para colaboradores:

```typescript
interface ActionMenuProps {
  // ... props existentes ...
  canEditLimited: boolean;
  onLimitedEdit: (tv: Televenda) => void;
}

// No menu:
{canEdit && (
  <DropdownMenuItem onClick={() => onEdit(televenda)}>
    <Edit /> Editar (Completo)
  </DropdownMenuItem>
)}
{canEditLimited && (
  <DropdownMenuItem onClick={() => onLimitedEdit(televenda)}>
    <Edit /> Editar Dados
  </DropdownMenuItem>
)}
```

---

## Fluxo de Edição para Colaboradores

```
COLABORADOR                                    SISTEMA
    │                                              │
    ├─► Clica em "Editar Dados"                   │
    │                                              │
    │   ┌─────────────────────────────┐           │
    │   │ Modal Edição Limitada       │           │
    │   │                             │           │
    │   │ Banco: [Select ▼]           │           │
    │   │ Parcela: [R$ 500,00]        │           │
    │   │ Troco: [R$ 1.200,00]        │           │
    │   │ Saldo: [R$ 8.000,00]        │           │
    │   │                             │           │
    │   │ [Cancelar] [Salvar]         │           │
    │   └─────────────────────────────┘           │
    │                                              │
    ├─► Clica "Salvar" ────────────────────────────► Salva histórico original
    │                                              │ Atualiza proposta
    │                                              │ Incrementa edit_count
    │                                              │
    │◄─────────────────────────────────────────────┤ Toast: "Proposta atualizada"
    │                                              │
    │   Proposta agora mostra badge "✏️ Editado"  │
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Tabela `televendas_edit_history` + coluna `edit_count` |
| `src/modules/televendas/types.ts` | Modificar | Adicionar `EditHistoryItem` e `edit_count` |
| `src/modules/televendas/components/CollaboratorEditModal.tsx` | Criar | Modal simplificado para colaboradores |
| `src/modules/televendas/TelevendasModule.tsx` | Modificar | Adicionar `canEditLimited`, handlers e modal |
| `src/modules/televendas/components/ActionMenu.tsx` | Modificar | Adicionar opção de edição limitada |
| `src/modules/televendas/views/PropostasView.tsx` | Modificar | Mostrar badge de edição |
| `src/modules/televendas/components/DetailModal.tsx` | Modificar | Mostrar histórico de edições |

---

## Regras de Negócio

1. **Quem pode editar o quê:**
   - Admin/Gestor: Todos os campos (modal existente)
   - Colaborador: Apenas banco, parcela, troco, saldo_devedor (novo modal)

2. **Rastreabilidade:**
   - Toda edição gera registro em `televendas_edit_history`
   - Dados originais são preservados no histórico
   - Contador de edições (`edit_count`) visível na proposta

3. **Visibilidade:**
   - Badge "Editado" aparece em propostas modificadas
   - Histórico completo visível no modal de detalhes
   - Gestores podem ver quem editou e quando

---

## Benefícios

- Colaboradores economizam tempo ao ajustar propostas negadas pelo banco
- Gestores mantêm visibilidade total das alterações
- Histórico completo para auditoria e segurança
- Interface intuitiva e separada por perfil
