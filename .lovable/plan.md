
# Plano: Melhorias no Módulo Gestão de Televendas

## Problemas Identificados

1. **Data de cadastro não registrada**: O sistema possui apenas "data_venda" (data da venda), mas não exibe claramente a data de cadastro da proposta (`created_at` existe mas não está visível nos campos do formulário/detalhe).

2. **Botão Editar não funciona**: O `handleEdit` atual apenas mostra um toast sem funcionalidade real:
   ```typescript
   const handleEdit = (tv: Televenda) => toast({ title: "Editar", description: tv.nome });
   ```

3. **Filtro por banco não existe**: Os filtros atuais incluem período, status, usuário e produto, mas não há filtro por banco.

---

## Solução Proposta

### 1. Exibir Data de Cadastro

**Alterações:**
- **DetailModal.tsx**: Adicionar campo "Data de Cadastro" na seção "DADOS DA OPERAÇÃO", mostrando o `created_at` formatado
- **PropostasView.tsx**: Exibir data de cadastro junto com data de venda nos cards

### 2. Implementar Funcionalidade de Edição

**Novo componente:** `EditProposalModal.tsx`
- Modal com formulário pré-preenchido com dados da proposta
- Campos editáveis: nome, telefone, banco, parcela, troco, saldo_devedor, tipo_operacao, observacao, data_venda
- Apenas gestores/admin podem editar propostas de outros usuários
- Operadores podem editar apenas suas próprias propostas (e apenas enquanto não estão em status final)

**Alterações no TelevendasModule.tsx:**
- Adicionar estado para controlar modal de edição
- Implementar função `handleEditSubmit` para salvar alterações no banco
- Passar props necessárias para o modal

### 3. Adicionar Filtro por Banco

**Alterações:**

- **types.ts**: Adicionar campo `bank` no tipo `TelevendasFilters`
- **FiltersDrawer.tsx**: Adicionar seção de filtro por banco (usando bancos únicos das propostas existentes ou da tabela `televendas_banks`)
- **TelevendasModule.tsx**: 
  - Adicionar `bank: "all"` no estado inicial de filtros
  - Adicionar lógica de filtragem por banco no `filteredTelevendas`
  - Atualizar contagem de filtros ativos

---

## Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/modules/televendas/types.ts` | Adicionar `bank` ao `TelevendasFilters` |
| `src/modules/televendas/TelevendasModule.tsx` | Estado de edição, filtro por banco, funções de edição |
| `src/modules/televendas/components/FiltersDrawer.tsx` | UI do filtro por banco |
| `src/modules/televendas/components/DetailModal.tsx` | Exibir data de cadastro |
| `src/modules/televendas/views/PropostasView.tsx` | Mostrar data de cadastro nos cards |
| `src/modules/televendas/components/EditProposalModal.tsx` | **NOVO** - Modal de edição |

---

## Detalhes Técnicos

### Novo Tipo de Filtro

```typescript
export interface TelevendasFilters {
  search: string;
  status: string;
  userId: string;
  period: string;
  month: string;
  product: string;
  bank: string;  // NOVO
}
```

### Filtro por Banco (FiltersDrawer)

```typescript
// Extrair bancos únicos das propostas
const uniqueBanks = useMemo(() => {
  const banksSet = new Set(televendas.map(tv => tv.banco).filter(Boolean));
  return Array.from(banksSet).sort();
}, [televendas]);
```

### Modal de Edição

O modal reutilizará a estrutura de formulário similar ao `TelevendasForm.tsx`:
- Campos organizados em seções (Cliente, Operação, Valores)
- Validação com Zod
- Formatação de CPF, telefone e valores monetários
- Botão salvar com loading state
- Registrar histórico de alterações (opcional)

### Data de Cadastro no DetailModal

```typescript
<InfoRow 
  icon={Clock} 
  label="Data de Cadastro" 
  value={formatDateTime(televenda.created_at)}
/>
```

---

## Fluxo de Edição

1. Usuário clica em "Editar" no menu de ações
2. Modal abre com dados da proposta pré-preenchidos
3. Usuário faz alterações
4. Ao salvar:
   - Validação dos campos
   - UPDATE na tabela `televendas`
   - Atualização do `updated_at`
   - Feedback com toast
   - Refresh da lista
   - Fechamento do modal

---

## Permissões de Edição

| Usuário | Pode Editar |
|---------|-------------|
| Admin | Todas as propostas |
| Gestor | Propostas da sua empresa |
| Colaborador | Apenas próprias propostas (status não-final) |

---

## Resumo de Entregas

1. Exibição da data de cadastro no modal de detalhes e nos cards
2. Modal funcional de edição de propostas
3. Filtro por banco no drawer de filtros
4. Integração completa com o módulo existente
