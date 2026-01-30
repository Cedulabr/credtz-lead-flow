
# Plano: Filtro Padrão para Mês Atual no Dashboard de Televendas

## Problema Identificado
O dashboard de Gestão de Televendas está mostrando dados de **todos os meses** porque o filtro inicial está configurado como `period: "all"` e `month: "all"`. Isso faz com que a consulta ao banco de dados não aplique nenhum filtro de data.

## Solução
Alterar o valor inicial do filtro `month` para o **mês atual** em vez de `"all"`.

---

## Alterações Necessárias

### Arquivo: `src/modules/televendas/TelevendasModule.tsx`

**Mudança 1: Criar função para obter o mês atual**

Adicionar uma função helper que retorna o mês atual no formato `YYYY-MM`:

```typescript
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
```

**Mudança 2: Atualizar o estado inicial dos filtros**

Alterar de:
```typescript
const [filters, setFilters] = useState<FiltersType>({
  search: "",
  status: "all",
  userId: "all",
  period: "all",
  month: "all",     // ← mostra todos os meses
  product: "all",
});
```

Para:
```typescript
const [filters, setFilters] = useState<FiltersType>({
  search: "",
  status: "all",
  userId: "all",
  period: "all",
  month: getCurrentMonth(),  // ← mês atual por padrão
  product: "all",
});
```

---

## Comportamento Esperado Após a Mudança

| Antes | Depois |
|-------|--------|
| Dashboard carrega dados de todos os meses | Dashboard carrega dados apenas do mês atual |
| Usuário precisa selecionar o mês manualmente | Mês atual já vem selecionado |
| Filtro "Mês Específico" mostra "Todos os meses" | Filtro mostra o mês atual (ex: "Janeiro 2026") |

O usuário ainda poderá:
- Selecionar outro mês no filtro "Mês Específico"
- Usar o filtro "Período Rápido" (Hoje, Ontem, 7 dias, 30 dias)
- Selecionar "Todos os meses" se quiser ver dados históricos completos

---

## Resumo Técnico
- **Arquivos modificados**: 1 (`TelevendasModule.tsx`)
- **Linhas alteradas**: ~3 linhas
- **Risco**: Baixo - apenas altera o valor padrão inicial
- **Impacto**: O dashboard agora mostrará apenas os dados do mês corrente ao carregar
