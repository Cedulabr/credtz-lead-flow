

## Correção: Aba "Gestão" não aparece para Gestores

### Problema
Na linha 33 de `HourBank.tsx`, o `isGestor` é determinado assim:
```ts
const isGestor = isAdmin || (profile as any)?.company_role === 'gestor';
```
O objeto `profile` vem do `useAuth()` e contém dados da tabela `profiles`, que **não tem** o campo `company_role`. Esse campo está na tabela `user_companies`. Logo, `(profile as any)?.company_role` é sempre `undefined`, e gestores nunca veem a aba.

### Solução
Substituir a lógica manual pelo hook `useGestorCompany`, que já existe no projeto e faz a consulta correta à tabela `user_companies`. O mesmo hook já é usado no `HourBankCompanyOverview.tsx`.

### Alteração em `HourBank.tsx`
1. Importar `useGestorCompany` de `@/hooks/useGestorCompany`
2. Substituir a linha `const isGestor = isAdmin || (profile as any)?.company_role === 'gestor';` por:
   ```ts
   const { isGestor: gestorFlag, isAdmin: adminFlag } = useGestorCompany();
   const isGestor = isAdmin || gestorFlag || adminFlag;
   ```
3. Nenhuma outra alteração necessária — toda a lógica condicional já usa `isGestor`.

