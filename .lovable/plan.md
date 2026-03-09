
## Diagnóstico

**Causa raiz do erro RLS:**
A tabela `time_clock_schedules` tem a política:
```
(has_role(auth.uid(), 'admin') OR is_company_gestor(auth.uid(), company_id))
```

A função `is_company_gestor` compara `company_id` da linha com o gestor. Porém o código em `ScheduleManager.tsx` nunca envia o `company_id` no INSERT — o campo fica `NULL`, a função retorna `false`, e o Supabase bloqueia a operação.

**Melhoria solicitada:**
O usuário quer tornar mais fácil cadastrar jornada para a empresa toda (sem precisar selecionar colaborador por colaborador).

---

## Plano de Correção e Melhoria

### 1. Corrigir o `ScheduleManager.tsx`
- Buscar o `company_id` do gestor logado via `user_companies` (já feito no `index.tsx`, mas não repassado ao componente)
- Incluir `company_id` no payload do INSERT/UPDATE
- Adicionar prop `companyId` ao componente ou buscá-lo internamente

### 2. Melhorar a UX — Jornada da Empresa
Adicionar opção **"Aplicar para todos os colaboradores"** ao criar uma nova jornada, que:
- Marca um checkbox "Jornada padrão da empresa (todos os colaboradores)"
- Ao salvar, itera pelos usuários da empresa e cria/atualiza a jornada para cada um em lote (upsert por `user_id`)
- Mantém a opção de selecionar um colaborador específico individualmente
- Exibe badge "Padrão" nas jornadas criadas desta forma

### 3. Repassar `companyId` do `index.tsx` para o `ScheduleManager`
O `index.tsx` já busca o `company_id` do usuário no `checkUserRole()`. Basta passar como prop ao componente `<ScheduleManager companyId={companyId} />`.

### 4. Filtrar colaboradores por empresa
Atualmente `loadData` busca **todos** os perfis ativos — trocar para buscar apenas os da empresa via `user_companies`.

---

## Arquivos a modificar
- `src/components/TimeClock/index.tsx` — passar `companyId` como prop
- `src/components/TimeClock/ScheduleManager.tsx` — receber prop, incluir `company_id` no insert, adicionar opção "aplicar para toda a empresa", filtrar colaboradores por empresa
