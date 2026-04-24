## Reconstrução do fluxo de Importação e Atualização — Leads Premium

Vamos substituir completamente o `ImportBase.tsx` atual (com campo fixo "Governo BA") por um wizard dinâmico em 6 passos, e criar um novo fluxo "Atualizar Dados" com seleção de campos. Todo o processamento pesado vai para Edge Functions.

---

### 1. Banco de dados (migration)

**Tabela `import_logs`** — adicionar colunas faltantes:
- `convenio` (text), `subtipo` (text), `estado` (text)
- `tipo` (text: `'import'` | `'update'`)
- `fields_updated` (jsonb)
- `skipped_detail` (jsonb) — lista de linhas ignoradas com motivo

**Tabela `leads_database`** — chave de deduplicação:
- Índice único parcial: `(company_id, cpf, banco, parcela, parcelas_em_aberto)` onde os 4 últimos não são nulos. Permite mesmo CPF em bancos/contratos diferentes.
- Adicionar coluna `subtipo` (federal/estadual/municipal) e `estado` (UF) para filtros futuros.

**Edge Functions novas:**
- `import-leads` — recebe arquivo já parseado (JSON de linhas + mapeamento + convênio/subtipo/estado), insere em lote, aplica regra de duplicidade `CPF+Banco+Valor Parcela+Total Parcelas`, grava `import_logs` com `skipped_detail`.
- `update-leads-data` — recebe linhas + campos a atualizar + estratégia de múltiplos contratos (`all` / `latest` / `manual`), faz match por CPF normalizado, atualiza apenas as colunas marcadas, registra histórico de margem quando aplicável.

Ambas usam service role internamente, validam JWT do chamador e respeitam `company_id` do perfil.

---

### 2. Frontend — novo Wizard de Importação

**Novo componente:** `src/components/leads/ImportWizard.tsx` (substitui o modal atual em `ImportBase.tsx`).

Stepper dinâmico com renderização condicional:

```text
Step 1: Convênio (INSS / SIAPE / Servidor Público)
   │
   ├─ INSS ────────────────────────────────► Step 4
   ├─ SIAPE ───────────────────────────────► Step 4
   └─ Servidor Público ──► Step 2: Vínculo
                              ├─ Federal ──► Step 4
                              └─ Estadual/Municipal ──► Step 3: Estado ──► Step 4

Step 4: Upload de arquivo (.csv / .xlsx)
        + colunas esperadas (collapsible) + download de template
        + preview das primeiras 5 linhas

Step 5: Mapeamento de colunas (auto-match exato + destacar obrigatórios)

Step 6: Confirmação + barra de progresso + resumo final
```

**Cards de seleção:** componentes radio visuais (com ícone, título, descrição) reutilizando `Card` + estado selecionado destacado com `border-primary`.

**Estado selecionado UF:** `Command` + `Popover` (pattern shadcn combobox) com 27 estados.

**Templates .xlsx:** gerados client-side usando a skill XLSX (openpyxl não está disponível no browser, mas dá pra usar a lib `xlsx` já provavelmente instalada — verifico no `package.json` na implementação; se não, uso `sheetjs` via CDN ou geração CSV como fallback).

**Parser:** mantém a lógica atual de leitura via `FileReader` + `xlsx` para extrair headers e amostra; envia o array completo de linhas para a Edge Function.

---

### 3. Frontend — novo "Atualizar Dados"

**Novo componente:** `src/components/leads/UpdateDataWizard.tsx` (substitui o toggle "margin_only" atual).

```text
Step 1: Checkboxes multi-select (Telefone/DDD, Margem, Empréstimos,
        Parcelas, Dados cadastrais)
        + Toggle "Quando CPF tiver múltiplos contratos":
           ◉ Atualizar todos
           ○ Apenas o mais recente
           ○ Escolha manual

Step 2: Upload (mostra apenas colunas necessárias para os campos marcados)

Step 3: Mapeamento de colunas (apenas campos relevantes)

Step 4: Preview com:
        - CPFs encontrados (únicos / múltiplos contratos)
        - CPFs não encontrados
        - Aviso se >20% não encontrados
        - Botão "Confirmar Atualização"
```

CPF é sempre obrigatório como chave de match (normalizado removendo `.` e `-`).

---

### 4. Integração

- `LeadsBulkActions.tsx` ganha um botão "Atualizar Dados" que abre `UpdateDataWizard`.
- O botão "Importar Base" existente abre `ImportWizard` (modal full-screen em mobile).
- Após conclusão, exibir tela de sucesso com:
  - Métricas: contratos importados, ignorados, CPFs únicos novos, CPFs já existentes com novos contratos.
  - Link "Baixar relatório de ignorados (.xlsx)" se houver `skipped_detail`.

---

### 5. Resumo de arquivos

**Criar:**
- `supabase/functions/import-leads/index.ts`
- `supabase/functions/update-leads-data/index.ts`
- `src/components/leads/ImportWizard.tsx`
- `src/components/leads/UpdateDataWizard.tsx`
- `src/components/leads/wizard/StepConvenio.tsx`
- `src/components/leads/wizard/StepSubtipo.tsx`
- `src/components/leads/wizard/StepEstado.tsx`
- `src/components/leads/wizard/StepUpload.tsx`
- `src/components/leads/wizard/StepMapping.tsx`
- `src/components/leads/wizard/StepConfirm.tsx`
- `src/components/leads/wizard/columnsConfig.ts` (catálogo de campos por convênio + templates)
- `src/components/leads/wizard/xlsxTemplate.ts` (gerador de modelo .xlsx)
- Migration SQL com colunas novas em `import_logs`, `leads_database` e índice único parcial.

**Editar:**
- `src/components/ImportBase.tsx` — substituir UI de importação pelo novo `ImportWizard`; remover toggle "margin_only".
- `src/components/LeadsBulkActions.tsx` — adicionar botão "Atualizar Dados".
- `src/components/LeadsDatabase.tsx` — apenas integração se necessário.

**Manter:**
- `useLeadsPremium.ts`, `RequestLeadsWizard/*`, demais views.

---

### 6. Pontos de atenção

- Arquivos grandes: Edge Function processa em chunks de 500 linhas; frontend envia em batches sequenciais e atualiza progresso.
- Detecção de arquivo duplicado (`fileHash`) é mantida.
- Auto-scan de duplicatas existente (`auto_scan_duplicates_after_import`) continua funcionando porque não conflita com a nova regra (ele apenas detecta CPF+banco+parcela já implementado).
- RLS: políticas de `leads_database` já filtram por `company_id`; Edge Function usa o `company_id` do perfil do chamador.

Confirma para eu seguir com a implementação?