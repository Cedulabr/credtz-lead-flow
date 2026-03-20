

## Melhorias no Pagamento de Comissão

### Problemas Identificados

1. **Consultor "Sem nome"**: A query busca `profiles.name` mas muitos usuários têm o campo vazio. Precisa buscar `email` como fallback.
2. **Sem filtro de funcionário**: Não há select para filtrar por consultor específico.
3. **Sem filtro de mês**: Não há filtro por mês de pagamento/venda.
4. **"Lançar" executa direto**: Ao clicar em "Lançar", deveria abrir um dialog para o admin definir manualmente % ou valor fixo da comissão antes de confirmar.

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/components/admin/CommissionPayment.tsx` | Adicionar filtro de funcionário (Select), filtro de mês (Select), dialog de edição de comissão ao clicar "Lançar", fix do nome do consultor usando email como fallback |

### Detalhes

**1. Fix nome do consultor**

Na query de profiles, buscar também `email`. No fallback:
```typescript
user_name: profile?.name || profile?.email?.split('@')[0] || 'Sem nome',
```

**2. Filtro de funcionário**

Select com lista de consultores únicos extraídos das propostas carregadas. Filtra por `user_id`.

**3. Filtro de mês**

Select com meses disponíveis extraídos de `data_pagamento` ou `data_venda`. Formato "Mar/2026". Filtra propostas pelo mês selecionado.

**4. Dialog ao clicar "Lançar"**

Em vez de lançar direto, abre um Dialog com:
- Info da proposta (cliente, banco, operação, valores)
- Radio: "Percentual" ou "Valor Fixo"
- Input numérico para o valor (pré-preenchido com a regra se existir)
- Preview do valor calculado da comissão
- Botão "Confirmar Lançamento"

Ao confirmar, usa os valores editados pelo admin para inserir na tabela `commissions`.

O botão "Lançar Todas" continuará usando a regra automática (ou zero se sem regra) para processar em lote.

