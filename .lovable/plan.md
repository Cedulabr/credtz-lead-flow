

## Fix AutoLead — "Nenhum lead disponível" com 182k leads disponíveis

### Diagnóstico

Dois problemas encontrados:

**1. Case mismatch no convênio (causa principal)**

O wizard define `TIPOS_LEAD` com IDs em minúsculas (`'inss'`, `'servidor'`, etc.), mas o banco de dados armazena em maiúsculas (`'INSS'`, `'SIAPE'`). Quando o usuário seleciona "INSS", o código passa `convenio_filter: 'inss'` para a RPC, que faz `ld.convenio = 'inss'` — sem match.

- Banco: `INSS`, `SIAPE`
- Código: `inss`, `servidor`, `fgts`, etc.

**2. Ambiguidade de overloads (risco secundário)**

Existem 3 overloads da função `request_leads_with_credits` (4, 5 e 6 parâmetros), todos com defaults. A overload de 5 parâmetros usa `profiles.credits` que **não existe mais** no banco. Limpar overloads antigos evita erros futuros.

### Mudanças

| Componente | Ação |
|---|---|
| `src/modules/autolead/hooks/useAutoLead.ts` | Converter `convenio_filter` para maiúsculas: `.toUpperCase()` |
| Migration SQL | Dropar as 2 overloads antigas (4 e 5 params) que usam `profiles.credits` inexistente, manter apenas a de 6 params |

### Detalhes

**1. Fix case — useAutoLead.ts**

```typescript
convenio_filter: wizardData.tipoLead === "todos" 
  ? null 
  : (wizardData.tipoLead?.toUpperCase() ?? null),
```

**2. Migration — limpar overloads quebradas**

```sql
-- Drop 4-param overload (uses profiles.credits which doesn't exist)
DROP FUNCTION IF EXISTS public.request_leads_with_credits(text, text, text, integer);

-- Drop 5-param overload (uses profiles.credits which doesn't exist)  
DROP FUNCTION IF EXISTS public.request_leads_with_credits(text, text, text, integer, text[]);
```

Isso deixa apenas a overload de 6 parâmetros que usa corretamente a tabela `user_credits`.

### Resultado

Com essas duas correções, ao selecionar "INSS" no wizard, o filtro passará `'INSS'` (maiúscula) para a RPC, que encontrará os 179.986 leads disponíveis. A ambiguidade de overloads também será eliminada permanentemente.

