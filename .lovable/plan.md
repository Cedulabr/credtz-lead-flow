## Objetivo

Hoje, no wizard de importação de Leads Premium (`src/components/leads/ImportWizard.tsx`), os campos obrigatórios de cada convênio (INSS, SIAPE, Servidor Público) estão **fixos no código** em `src/components/leads/wizard/columnsConfig.ts`. Isso impede importar listas que não têm todos os dados (ex.: listagem de INSS só com nome, telefone e tag).

A solução: permitir que **admin e gestor** definam, via painel de configurações, quais campos são obrigatórios para cada convênio. Adicionar também o campo "Tag" ao wizard.

## O que será entregue

1. **Configuração flexível por convênio (admin/gestor)**
   - Nova tela em `Admin → Leads Premium → Campos de Importação`.
   - Para cada convênio (INSS, SIAPE, Servidor Público) o gestor vê todos os campos disponíveis e marca quais devem ser **obrigatórios** na importação.
   - Botão "Restaurar padrão" para voltar à configuração original.
   - Botão "Salvar" persiste no banco e passa a valer imediatamente para todos os usuários da empresa.

2. **Suporte a Tag na importação**
   - Adicionar campo `tag` no catálogo de campos (group: cadastro), opcional por padrão, mapeável no passo de mapeamento.
   - Auto-mapeamento reconhece colunas "tag", "etiqueta", "categoria".
   - O valor da tag é gravado em `leads_database.tags` (array existente).

3. **Wizard de importação respeita configuração**
   - O passo "Mapeamento" passa a ler os campos obrigatórios da configuração da empresa (cai no padrão se não houver).
   - Validação `canProceed` usa a lista dinâmica.
   - Indicador visual (✅/⬜ e asterisco vermelho) reflete os campos obrigatórios configurados.

## Mudanças técnicas

### Banco de dados
Nova tabela `leads_import_field_config`:
- `id uuid pk`
- `company_id uuid` (isolamento multi-tenant — cada empresa tem sua própria config)
- `convenio text` (`INSS` | `SIAPE` | `SERVIDOR_PUBLICO`)
- `field_key text` (chave do campo, ex.: `cpf`, `name`, `phone`)
- `is_required boolean`
- `updated_by uuid`, `updated_at timestamptz`
- Unique `(company_id, convenio, field_key)`
- RLS: SELECT para todos os autenticados da company; INSERT/UPDATE/DELETE só para `admin` e `gestor` (via `has_role_safe`).

### Frontend
- `src/components/leads/wizard/columnsConfig.ts`
  - Adicionar campo `tag` (opcional) no catálogo dos 3 convênios e no auto-mapeamento.
  - Renomear `FIELDS_BY_CONVENIO` para `DEFAULT_FIELDS_BY_CONVENIO` (mantém defaults).
- Novo hook `src/components/leads/wizard/useImportFieldConfig.ts`
  - Carrega overrides da tabela `leads_import_field_config` para a empresa do usuário.
  - Retorna `getFields(convenio)` aplicando os overrides sobre o default.
- `src/components/leads/ImportWizard.tsx`
  - Trocar `const fields = FIELDS_BY_CONVENIO[convenio]` por `getFields(convenio)` do hook.
- Nova tela `src/components/admin/LeadsImportFieldsConfig.tsx`
  - Tabs por convênio (INSS, SIAPE, Servidor Público).
  - Lista todos os campos com switch "Obrigatório".
  - Botões "Restaurar padrão" e "Salvar".
- Registrar rota/menu no painel Admin existente (acesso: admin + gestor).

### Lógica de gravação da Tag
No `submit()` do wizard, quando o campo `tag` está mapeado, incluir o valor no payload enviado para a edge function de importação. A edge function existente já trata `tags`; verificaremos e ajustaremos se necessário para concatenar a tag importada ao array.

## Fluxo do usuário (gestor INSS só com nome/telefone/tag)

1. Gestor entra em `Admin → Campos de Importação → INSS`.
2. Desmarca "Obrigatório" de: CPF, Margem Livre, Margem Total, Banco.
3. Mantém marcado: Nome, Telefone, Tag.
4. Salva.
5. Vai em Leads Premium → Importar → INSS → faz upload do CSV.
6. No mapeamento, só Nome, Telefone e Tag aparecem com asterisco vermelho.
7. Importação prossegue normalmente.

## Fora de escopo
- Não muda regras de deduplicação nem a edge function de processamento (além do ajuste de tag, se preciso).
- Atualização em massa (`UpdateWizard`) continua usando os grupos atuais.
