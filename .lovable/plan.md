## Diagnóstico

### 1. Digitação Agibank — `televendas_status_check`
Em `src/pages/DigitacaoAgibank.tsx` (linha 472) o insert na tabela `televendas` envia `status: "pendente"`, mas o CHECK constraint atual (`televendas_status_check`) só aceita:
`solicitar_digitacao, bloqueado, em_andamento, pago_aguardando, cancelado_aguardando, devolvido, proposta_paga, proposta_cancelada, proposta_pendente, solicitar_exclusao, exclusao_aprovada, exclusao_rejeitada`.

O valor correto equivalente a "pendente" no workflow novo é `proposta_pendente` (de acordo com `LEGACY_STATUS_MAP` em `src/modules/televendas/types.ts`).

### 2. Meus Dados — "Erro ao salvar dados"
Em `src/components/MyData/PersonalDataForm.tsx` (linhas 110–121) o `catch` engole o erro real do Supabase e mostra apenas a mensagem genérica. Sem o erro real não dá para apontar a causa de cara — pode ser RLS, enum, etc. Hoje a UI esconde isso, então o primeiro passo é expor a mensagem real do Postgres para diagnóstico definitivo.

## Mudanças

1. **`src/pages/DigitacaoAgibank.tsx`**
   - Trocar `status: "pendente"` por `status: "proposta_pendente"` no insert em `televendas`.
   - Logar o erro completo no console e exibir `errTel.message` no toast para facilitar diagnóstico futuro.

2. **`src/components/MyData/PersonalDataForm.tsx`**
   - Atualizar o `catch` do `handleSubmit` para:
     - `console.error('Erro ao salvar dados pessoais:', error)`
     - `toast.error(error?.message || 'Erro ao salvar dados')`
   Assim a próxima tentativa mostra o motivo real (RLS, coluna, enum…) e podemos corrigir cirurgicamente.

3. **`src/components/MyData/index.tsx`**
   - No `handleSavePersonalData`, propagar/loggar o erro do Supabase (`console.error`) antes do `throw` para garantir rastro no console mesmo quando o form mostra o toast.

Nenhuma mudança de schema é necessária para o item 1 (basta usar o valor permitido). Para o item 2, após ver a mensagem real do erro do usuário, decidimos se precisa de migration (ex.: ajuste de RLS ou enum).

## Verificação

- Reproduzir envio de proposta na Digitação Agibank → deve salvar sem violar constraint e aparecer em Gestão de Televendas com status "Proposta Pendente".
- Salvar Meus Dados novamente → se ainda falhar, o toast trará a mensagem exata para a próxima correção.
