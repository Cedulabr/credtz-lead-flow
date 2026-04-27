## Módulo Telefonia — Frontend (Nova Vida TI)

Backend (tabelas + Edge Functions `novavida-get-token` e `novavida-consulta`) já está pronto. Esta etapa entrega a interface completa do módulo com 3 abas.

### 1. Sidebar + roteamento

- `src/components/Navigation.tsx`: adicionar item após "Leads Premium":
  ```ts
  { id: "telefonia", label: "Telefonia", icon: Phone, permissionKey: "can_access_telefonia" }
  ```
- `src/pages/Index.tsx`: registrar `telefonia: <LazyTelefoniaModule />` e entry em `TAB_PERMISSIONS`.
- `src/components/LazyComponents.tsx`: exportar `LazyTelefoniaModule` apontando para `src/modules/telefonia/TelefoniaModule.tsx`.
- A flag `can_access_telefonia` é nova; será exposta em UsersList/PERMISSION_MODULES como os outros módulos. Se a coluna não existir em `profiles`, criamos via migration (boolean default false; admins veem tudo).

### 2. Estrutura de arquivos

```
src/modules/telefonia/
  TelefoniaModule.tsx         # shell com Tabs (Consultar | Histórico | Configurações)
  hooks/
    useNovaVidaCredentials.ts # CRUD credenciais
    useTelefoniaQuery.ts      # invoca novavida-consulta + cache local
    useTelefoniaHistorico.ts  # lista paginada de telefonia_consultas
    useTelefoniaUsage.ts      # stats do mês
  components/
    ConsultarTab.tsx
    HistoricoTab.tsx
    ConfiguracoesTab.tsx
    SearchForm.tsx            # CPF mask + dropdown método
    ResultCard.tsx            # 4 seções colapsáveis
    DadosCadastraisSection.tsx
    TelefonesSection.tsx      # row card por número
    EnderecosSection.tsx
    PerfilCompletoSection.tsx # subtabs Crédito|Empresas|Pessoas|PEP|Contatos
    ScoreBadge.tsx
    HistoricoTable.tsx
    HistoricoDrawer.tsx       # ver resultado em cache
    CredentialsForm.tsx
    UsageStats.tsx
    LinkLeadButton.tsx
  utils/
    cpfMask.ts                # format/validate 11 dígitos
    phoneFormat.ts            # (DD) 9 NNNN-NNNN
    methodConfig.ts           # 3 métodos + helper text
```

### 3. Aba 1 — Consultar

- Card centralizado max-w-680.
- Form: input CPF mascarado, Select com 3 métodos, helper text dinâmico, botão azul `w-full md:w-auto` desabilitado se CPF inválido.
- Submit invoca `supabase.functions.invoke('novavida-consulta', { body: { cpf, metodo, lead_id? } })`.
- Loading: spinner dentro do botão ("Consultando…").
- Banner cache: se response trouxer `from_cache: true` mostrar info azul com data + link "Forçar nova consulta" que reenvia com `force_refresh: true`.
- ResultCard com 4 seções (Collapsible do shadcn):
  - **Dados Cadastrais** (aberto): grid de campos + ScoreBadge (verde<300, amarelo 300-600, vermelho>600) + alert vermelho se `FLOBITO=S`.
  - **Telefones** (aberto): contagem no topo; cada número como row com ícone (📱/☎️), badge WhatsApp (verde/cinza, somente WHATS/NVCHECK), badge Procon (vermelho), badge HOT (laranja, NVCHECK), botões Copiar (clipboard + toast) e Usar (Popover de confirmação se `leadContext` existir → `update leads set phone = ...`).
  - **Endereços** (fechado): cards com logradouro/bairro/cidade/CEP + badge "Área de risco" se `AREARISCO=S`.
  - **Perfil Completo** (fechado, só NVCHECK): Tabs internas Crédito | Empresas | Pessoas Ligadas | PEP | Contatos Ruins.
- Botão flutuante "Vincular ao lead [Nome]" se `leadContext` presente; persiste melhor telefone em `leads.phone` e referência `consulta_id` (nova coluna `last_telefonia_consulta_id` opcional, ver §6).
- Estados de erro mapeados conforme spec (not_found / quota_exceeded / auth_error / credentials_not_configured com botão para a aba Configurações).

### 4. Aba 2 — Histórico

- Filtros: DateRangePicker (De/Até), Select Método, Select Status, Input CPF.
- Query em `telefonia_consultas` filtrada por `company_id` (RLS já isola) com paginação 50.
- Tabela: Data/Hora | CPF | Nome | Método | Nº telefones | Status (badge) | Lead vinculado (chip clicável → muda activeTab para `leads` com filtro futuro) | Consultado por (resolvido via RPC `get_profiles_by_ids`) | botão "Ver resultado".
- "Ver resultado" abre `Sheet` lateral com o `ResultCard` em modo read-only consumindo o JSON `resultado`.
- Footer agregando: total de consultas, créditos consumidos (status ≠ cache), em cache.

### 5. Aba 3 — Configurações

- Visível apenas para admin/gestor (mesmo padrão de detecção de `Navigation.tsx` via `user_companies.company_role`).
- Form com Usuário, Senha (toggle 👁), Cliente. Salvar faz upsert em `novavida_credentials` por `company_id`.
- "Testar conexão" invoca `novavida-get-token` e mostra resultado verde/vermelho.
- Status do token: lê `novavida_token_cache` mais recente (`expires_at`) → verde se válido, cinza caso contrário.
- Painel "Uso do mês atual" via `useTelefoniaUsage` (count em `telefonia_consultas` no mês corrente; cache vs créditos consumidos via campo `from_cache`/`status`).

### 6. Pequenos ajustes de schema

- Adicionar `can_access_telefonia boolean default false` em `profiles` (migration).
- Garantir que `telefonia_consultas` tenha colunas necessárias: `from_cache boolean default false`, `status text` (success | not_found | error | cache), `nome_retornado text`, `total_telefones int`, `lead_id uuid null`. Verificar e completar via migration se faltarem.
- Atualização de lead usa `leads.phone` (coluna existente) — não criamos `telefone`/`ddd`.

### 7. Detalhes técnicos

- Validação com `zod` no SearchForm e CredentialsForm.
- Toasts via `sonner`.
- Reuso de componentes shadcn: Tabs, Card, Collapsible, Sheet, Popover, Select, Input, Button, Badge, Progress, Table, Alert.
- Mobile-first: form em coluna única, tabela do histórico vira lista de cards em <md.
- Memória aplicada: usar `get_profiles_by_ids` para nomes (RLS bypass), `has_role_safe` no backend já cobre policies; fetch em duas etapas (sem join direto user_companies↔profiles).

Pronto para implementar ao aprovar.