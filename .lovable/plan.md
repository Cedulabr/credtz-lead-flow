## Plano — Atualização de margem, varredura e apagar importação em lote (Leads Premium)

Hoje, ao reimportar a base de Governo, a função `import_leads_governo` já evita duplicar pela chave (CPF + matrícula + banco + ADE) e atualiza margem. O que falta:

1. **Registrar quando a margem foi atualizada** e mostrar essa data na UI.
2. **Modo "Atualizar margens"**: na reimportação, atualizar APENAS margem, situação e parcelas pagas — nunca criar lead novo nem alterar telefone/banco/ADE.
3. **Botão de varredura de duplicatas** na aba "Gerenciar Base".
4. **Apagar importação em lote** (por data ou por log de importação), também na aba "Gerenciar Base".
5. Aceitar as colunas exatas que o usuário citou: `CPF, Servidor, Matrícula, Tipo, Margem Livre, Margem Total, Banco, Situação, ADE, Total de Parcela, Parcelas Pagas, Valor Parcela, Deferimento, Último Desconto, Última Parcela, Convênio`.

---

### 1. Banco de dados (migração)

**Tabela `leads_database`** — adicionar colunas:
- `margem_atualizada_em timestamptz` — data/hora da última atualização da margem.
- `margem_anterior numeric` — valor anterior para histórico simples.
- `import_log_id uuid` — vincula cada lead ao log de importação que o criou (para apagar em lote).

**Tabela nova `leads_margem_history`** (opcional, mas barato): `id, lead_id, margem_disponivel, margem_total, fonte (import_log_id), criado_em`. Permite ver o histórico de quando margem mudou.

**Função `import_leads_governo`** — aceitar parâmetro extra `p_mode text` (`'full'` padrão ou `'margin_only'`) e `p_import_log_id uuid`:
- `full`: comportamento atual (insere novos + atualiza existentes), mas agora grava `margem_atualizada_em = now()` apenas quando o valor de margem mudou e insere linha em `leads_margem_history`.
- `margin_only`: NUNCA insere novos. Para cada CPF+matrícula+banco+ADE existente, atualiza somente `margem_disponivel`, `margem_total`, `situacao`, `parcelas_pagas`, `parcelas_em_aberto`, `ultimo_desconto`, `ultima_parcela`, `margem_atualizada_em`. Retorna contadores `updated`, `not_found`.

**Aceitar novos nomes de coluna**: a função continua recebendo JSON; o mapeamento de nomes é feito no front (parser CSV). Aceita `Margem Livre` como alias de `Margem Disponível`, `Total de Parcela` como alias de `Prestações`.

**Função nova `delete_leads_by_import_log(p_log_id uuid)`** — apaga em lote os leads vinculados àquele log (apenas admin, via SECURITY DEFINER + checagem de role). Apaga também entradas relacionadas em `leads_distribution`, `leads_blacklist` para liberar a base.

**Função nova `delete_leads_by_date(p_date date, p_origem text default null)`** — apaga leads importados naquele dia (`created_at::date = p_date`), opcionalmente filtrando por `origem_base` (ex.: `governo_ba`).

**Função nova `scan_duplicates_leads_database()`** — retorna grupos de duplicatas (mesmo CPF + matrícula + banco + ADE, ou mesmo CPF + telefone) com `keep_id` (o mais antigo) e `remove_ids[]`. Função companion `merge_duplicates_leads_database(group jsonb)` faz a remoção. Reutiliza padrão já existente em outros módulos (mem://features/automated-duplicate-scanning-v2).

---

### 2. Frontend — `src/components/ImportBase.tsx`

**Novo seletor "Modo de importação"** quando `baseFormat === 'governo'`:
- ⬤ **Importação completa** — insere novos e atualiza tudo (atual).
- ⬤ **Atualizar apenas margem** — não cria novos leads, só atualiza margem/situação/parcelas pagas dos que já existem. Banner explicativo: "Use esta opção para refrescar a base do Governo BA sem mexer nos contatos já cadastrados."

**Parser `parseGovernoCSV`** — adicionar aliases:
- "Margem Livre" → `margem_disponivel`
- "Tipo" (sozinho) → `tipo_servico_servidor`
- "Banco" (sozinho) → fallback de `Consignatária`
- "Total de Parcela" → `parcelas_em_aberto` (prazo original)
- "Convênio" (coluna na planilha) → sobrescreve o convênio padrão "GOVERNO BA" linha a linha (caso o arquivo misture convênios, usa o valor da linha; senão "GOVERNO BA").

Passar `p_mode` e `p_import_log_id` na chamada da RPC. Após importação, mostrar contadores adequados ("X leads tiveram margem atualizada hoje").

---

### 3. Frontend — `src/components/LeadsDatabase.tsx` (aba Gerenciar Base)

**Nova coluna na tabela**: "Margem atualizada em" exibindo `margem_atualizada_em` formatado em pt-BR. Para Governo BA, também coluna "Margem disponível" com badge verde se atualizada nos últimos 7 dias.

**Novos filtros**:
- Filtro existente "Data de importação" — manter.
- Novo filtro "Origem" (`governo_ba`, `inss`, `siape`, `clt`, etc.) baseado em `origem_base` / `convenio`.

**Novo bloco de ações em lote** (apenas admin), no topo da aba:

```
[ 🔄 Varredura de duplicatas ]   [ 🗑️ Apagar importação… ]
```

- **Varredura de duplicatas** → abre modal que chama `scan_duplicates_leads_database`, mostra lista de grupos (CPF, nome, qtde duplicatas, qual será mantido), com botões "Mesclar todos" e "Mesclar selecionados". Após confirmação, chama `merge_duplicates_leads_database` e atualiza a tabela.
- **Apagar importação** → abre modal com:
  - Aba "Por log de importação": lista os últimos imports de `import_logs` (módulo `leads_database`) com data, arquivo, qtde de leads importados; botão "Apagar tudo deste lote".
  - Aba "Por data": date picker; mostra contagem prevista (`SELECT count WHERE created_at::date = X`); botão "Apagar tudo desta data".
  - Confirmação dupla obrigatória com texto "APAGAR" digitado.

---

### 4. Detalhes técnicos importantes

- Toda alteração de margem grava timestamp **somente quando o valor muda** (evita poluir o campo a cada reimport idêntico).
- Modo "Atualizar apenas margem" continua respeitando RLS: só admin executa imports.
- Apagar em lote nunca apaga histórico (`leads_history`, `propostas`) — apenas `leads_database` + reservas ativas em `leads_distribution` + entradas órfãs em `leads_blacklist`. Avisar o usuário antes.
- A varredura de duplicatas não toca leads que já foram trabalhados (têm registros em `leads_history` ou `propostas`); para esses, mostra alerta "Lead com histórico — revisar manualmente".

---

### Resumo do que o usuário verá

- Pode reimportar a planilha e escolher "Atualizar apenas margem" — Maria Lúcia continua única, mas agora aparece "Margem atualizada em 28/04/2026 14:32".
- Botão "Varredura de duplicatas" na aba Gerenciar Base.
- Botão "Apagar importação…" para remover lotes inteiros por data ou por arquivo importado.
- Parser aceita as colunas exatas listadas (CPF, Servidor, Matrícula, Tipo, Margem Livre, Margem Total, Banco, Situação, ADE, Total de Parcela, Parcelas Pagas, Valor Parcela, Deferimento, Último Desconto, Última Parcela, Convênio).
