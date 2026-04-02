

## Adicionar coluna Telefone na listagem do Activate Leads

### Problema

A tabela de listagem do Activate Leads em `src/components/ActivateLeads.tsx` tem as colunas: Nome, CPF, Simulacao, WhatsApp, Acoes — mas nao tem a coluna **Telefone**.

### Solucao

**Arquivo**: `src/components/ActivateLeads.tsx`

1. **Header da tabela** (linha ~1868): Adicionar `<TableHead>📞 Telefone</TableHead>` entre Nome e CPF

2. **Celula de cada linha** (entre a celula Nome ~linha 1940 e a celula CPF ~linha 1941): Adicionar uma `<TableCell>` que mostra o telefone formatado `(XX) XXXXX-XXXX`

3. **Ajustar `colSpan`** do estado vazio (linha 1877): incrementar de 6/5 para 7/6

Mudanca simples e cirurgica — 3 pontos de edicao no mesmo arquivo.

