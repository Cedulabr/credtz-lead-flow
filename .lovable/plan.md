

## Adicionar Filtro de Empresa no Módulo Gestão de Televendas

### O que sera feito

Adicionar um filtro de **Empresa** no drawer de filtros, visivel apenas para admin e gestor. Quando selecionada uma empresa, filtra as propostas pelo `company_id`. Tambem inclui pequenas melhorias de eficiencia identificadas na varredura.

### Arquivos a modificar

**1. `src/modules/televendas/types.ts`**
- Adicionar campo `companyId: string` ao tipo `TelevendasFilters`

**2. `src/modules/televendas/TelevendasModule.tsx`**
- Adicionar state `companies` e fetch da tabela `companies` (admin carrega todas; gestor filtra pelas suas `userCompanyIds`)
- Inicializar `companyId: "all"` no state de filtros
- Aplicar filtro `company_id` na query do `fetchTelevendas` quando `companyId !== "all"`
- Passar `companies` ao `FiltersDrawer`
- Incluir `companyId` no calculo de `activeFiltersCount`
- Ao selecionar empresa, filtrar automaticamente a lista de usuarios para mostrar apenas os da empresa selecionada

**3. `src/modules/televendas/components/FiltersDrawer.tsx`**
- Receber prop `companies: { id: string; name: string }[]`
- Adicionar select de Empresa (com icone Building2) antes do filtro de Usuario, visivel apenas para gestor/admin

### Melhorias de eficiencia identificadas

1. **Filtro de usuario encadeado com empresa**: ao selecionar uma empresa, o dropdown de usuarios mostra apenas os colaboradores daquela empresa (evita lista enorme de usuarios irrelevantes)
2. **Contagem de filtros ativos**: incluir `companyId` no badge de filtros ativos
3. **Limpar filtros**: incluir `companyId: "all"` no `clearFilters`

### Detalhes tecnicos

- Admin ve todas as empresas ativas; gestor ve apenas as empresas onde e gestor
- O filtro aplica `query.eq("company_id", companyId)` no fetch do Supabase (server-side)
- Para filtrar usuarios por empresa, faz query em `user_companies` quando empresa selecionada e filtra o array `users` pelo resultado

