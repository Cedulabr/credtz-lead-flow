
# Plano: Corrigir Visibilidade de Alertas Financeiros por Empresa

## Problema Identificado

Atualmente, todos os usuários estão vendo o alerta **"Atenção! 1 conta(s) vencida(s)"** no Dashboard, mesmo que a transação financeira não seja deles ou de sua empresa. Isso é um problema de **privacidade e segurança**.

### Causa Raiz

A política de RLS (Row Level Security) atual na tabela `financial_transactions` está **muito permissiva**:

```sql
-- Política atual: Colaboradores podem VER todas as transações da empresa
CREATE POLICY "Colaboradores can view financial transactions in their company"
ON financial_transactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_companies uc
  WHERE uc.company_id = financial_transactions.company_id
  AND uc.user_id = auth.uid()
  AND uc.is_active = true
))
```

Isso significa que **qualquer colaborador** de uma empresa pode ver **todas** as transações financeiras dessa empresa.

---

## Regras de Acesso Desejadas

| Perfil | Acesso às Transações Financeiras |
|--------|----------------------------------|
| **Admin** | Todas as transações de todas as empresas |
| **Gestor** | Todas as transações da sua empresa |
| **Colaborador** | Apenas transações que ele próprio criou |

---

## Solução Proposta

### 1. Atualizar Política de RLS para Colaboradores

Modificar a política de SELECT para colaboradores, adicionando a condição de que o colaborador só pode ver transações que ele mesmo criou (`created_by = auth.uid()`):

```sql
-- DROP da política atual
DROP POLICY IF EXISTS "Colaboradores can view financial transactions in their company" 
ON financial_transactions;

-- Nova política para colaboradores: só podem ver transações que criaram
CREATE POLICY "Colaboradores can view own financial transactions"
ON financial_transactions FOR SELECT
USING (
  -- Colaborador só vê suas próprias transações
  created_by = auth.uid()
  -- OU é admin (já coberto por outra policy, mas reforçamos)
  OR has_role(auth.uid(), 'admin'::app_role)
  -- OU é gestor da empresa da transação
  OR EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.company_role = 'gestor'
    AND uc.is_active = true
  )
);
```

### 2. Verificar Políticas de INSERT/UPDATE/DELETE

Garantir que colaboradores só possam:
- **INSERT**: Criar transações para sua empresa (já existe policy de gestor)
- **UPDATE/DELETE**: Apenas suas próprias transações ou se for gestor

Atualmente, só gestores e admins podem modificar. Precisamos adicionar uma política para colaboradores criarem suas próprias transações (se aplicável ao fluxo de negócio).

---

## Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/` | Migração para atualizar RLS policies |

---

## Migração SQL Proposta

```sql
-- 1. Remover política permissiva atual
DROP POLICY IF EXISTS "Colaboradores can view financial transactions in their company" 
ON public.financial_transactions;

-- 2. Criar nova política restritiva para SELECT
-- Colaboradores: só suas próprias transações
-- Gestores: todas da empresa
-- Admins: todas (já coberto pela policy existente)
CREATE POLICY "Users can view financial transactions"
ON public.financial_transactions FOR SELECT
TO authenticated
USING (
  -- Admin pode ver tudo (já existe policy separada, mas incluímos por segurança)
  has_role(auth.uid(), 'admin'::app_role)
  -- Gestor pode ver tudo da sua empresa
  OR EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.company_role = 'gestor'
    AND uc.is_active = true
  )
  -- Colaborador só pode ver transações que criou
  OR (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = financial_transactions.company_id
      AND uc.user_id = auth.uid()
      AND uc.is_active = true
    )
  )
);

-- 3. Adicionar política para colaboradores criarem transações (opcional)
-- Se colaboradores devem poder criar despesas para sua empresa
CREATE POLICY "Colaboradores can create own financial transactions"
ON public.financial_transactions FOR INSERT
TO authenticated
WITH CHECK (
  -- Deve pertencer à empresa da transação
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.is_active = true
  )
  -- E o created_by deve ser o próprio usuário
  AND created_by = auth.uid()
);

-- 4. Adicionar política para colaboradores editarem/excluírem suas próprias transações
CREATE POLICY "Colaboradores can manage own financial transactions"
ON public.financial_transactions FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.is_active = true
  )
)
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.is_active = true
  )
);

CREATE POLICY "Colaboradores can delete own financial transactions"
ON public.financial_transactions FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.is_active = true
  )
);
```

---

## Comportamento Esperado Após a Correção

### Para Colaboradores Comuns
- **Dashboard**: Só mostra alertas de contas que eles próprios cadastraram
- **Conta Corrente**: Só exibe transações próprias
- Não conseguem ver transações de outros usuários da mesma empresa

### Para Gestores
- **Dashboard**: Mostra alertas de todas as contas da empresa
- **Conta Corrente**: Acesso completo a todas as transações da empresa
- Podem editar/excluir qualquer transação da empresa

### Para Admins
- Acesso total a todas as transações de todas as empresas

---

## Verificação e Teste

Após a migração, será necessário testar:
1. Login como colaborador comum → Não deve ver contas de outros
2. Login como gestor → Deve ver todas as contas da empresa
3. Login como admin → Deve ver todas as contas de todas empresas
4. Verificar que a edição/exclusão segue as mesmas regras

---

## Resumo de Entregas

1. Migração SQL para atualizar políticas RLS na tabela `financial_transactions`
2. Separação clara de permissões: Colaborador (só suas), Gestor (empresa), Admin (tudo)
3. Manutenção da funcionalidade existente para gestores e admins
4. Correção do alerta no Dashboard para mostrar apenas transações permitidas
