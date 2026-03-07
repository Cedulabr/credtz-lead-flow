

## Plano: Corrigir filtros de Empresa/Colaborador no Historico e garantir PDF funcional

### Problema identificado

Os filtros de **Empresa** e **Colaborador** na aba Historico nao funcionam porque a query na linha 70 de `MyHistory.tsx` usa um JOIN direto entre `user_companies` e `profiles` via `profiles:user_id(...)`, que falha com erro 400:

```
"Could not find a relationship between 'user_companies' and 'user_id' in the schema cache"
```

Isso faz com que `companyUsers` fique sempre vazio, os selects nao mostram colaboradores, e o botao "Gerar PDF" so aparece quando um colaborador esta selecionado (condicao `showPdf = !showAllUsers`).

### Alteracoes

**Arquivo: `src/components/TimeClock/MyHistory.tsx`**

1. **Corrigir query de usuarios** (linhas 65-87): Substituir o JOIN `profiles:user_id(...)` pelo padrao de busca em duas etapas:
   - Etapa 1: buscar `user_id` de `user_companies` com filtro de empresa
   - Etapa 2: buscar `id, name, email` de `profiles` usando `.in('id', userIds)`

2. **Mostrar botao PDF sempre que houver um usuario selecionado OU quando for o proprio usuario**: Atualmente o PDF so aparece quando `showAllUsers` e false. Manter essa logica mas garantir que funcione apos a correcao dos filtros.

3. **Corrigir `loadSchedules`** (linhas 102-131): Mesma dependencia de `companyUsers` que pode estar vazio - garantir que a funcao e chamada apos os usuarios serem carregados.

Apenas 1 arquivo modificado. Nenhuma migracao SQL necessaria.

