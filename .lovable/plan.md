
## Diagnóstico do módulo Telefonia

Após reler os 3 PDFs (NVBOOK_CEL_OBG, NVBOOK_CEL_OBG_WHATS, NVCHECK) e auditar o código atual:

**O que já funciona bem**
- Edge function `novavida-get-token` gera token via SOAP (BASE64 nas credenciais) corretamente.
- `novavida-consulta` chama os 3 métodos, faz parse XML/JSON, normaliza telefones e grava cache de 7 dias.
- Token é cacheado por ~23h50 em `novavida_token_cache` e reutilizado.
- UI com 3 abas (Consultar / Histórico / Configurações), modal no lead, resultado em seções colapsáveis.

**O que está faltando / precisa melhorar**

1. **Token NÃO se renova sozinho.** Hoje só é gerado sob demanda (na 1ª consulta após expirar). Se ninguém consulta de manhã, a 1ª consulta do dia perde 1-2s gerando token. Você quer renovação automática diária — não existe cron.
2. **Inserir manualmente o token gerado de 24h** (o que você colou) também não é suportado pela UI hoje — só geração automática.
3. **Configurações** mostra "Token válido até X" mas não tem botão "Renovar token agora" nem permite colar token manual.
4. **UI da aba Consultar** está funcional mas pouco apresentável: sem hero, sem indicador visual de qual método escolher, sem skeletons durante loading, sem destaque para WhatsApp/HOT.
5. **ResultCard** todas as seções colapsáveis sem hierarquia visual; sem ações rápidas (copiar telefone, abrir WhatsApp Web, ligar).
6. **Histórico** sem agrupamento por dia, sem busca rápida por nome retornado, sem indicador visual cache vs novo.
7. **Configurações** sem painel de "Saúde da integração" (último teste, status do token, taxa de sucesso, próximas renovações).

---

## Plano de execução

### 1. Renovação automática diária do token (cron)

Criar job `pg_cron` que roda **todo dia às 03:00 BRT** para todas as empresas com credenciais ativas:

- Nova edge function `novavida-refresh-tokens` (sem auth, chamada apenas pelo cron):
  - Busca todas as `novavida_credentials WHERE active=true`.
  - Para cada uma, força nova chamada SOAP `GerarToken` e atualiza `novavida_token_cache`.
  - Loga sucesso/falha em `system_activity_logs` (action `novavida_token_refresh`).
- Cron via `pg_cron` + `pg_net`:
  ```sql
  select cron.schedule(
    'novavida-token-refresh-daily',
    '0 6 * * *',  -- 03:00 BRT = 06:00 UTC
    $$ select net.http_post(
        url:='https://qwgsplcqyongfsqdjrme.supabase.co/functions/v1/novavida-refresh-tokens',
        headers:='{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
        body:='{}'::jsonb
    ) $$
  );
  ```

### 2. Inserir token manual + botão "Renovar agora"

Em `ConfiguracoesTab.tsx`, adicionar **card "Token de acesso"**:

```text
┌─ 🔑 Token de acesso (24h) ────────────────────────┐
│ Status: ✅ Válido até 27/04 15:20  (5h restantes) │
│                                                    │
│ [🔄 Renovar agora]  [📋 Colar token manual]      │
│                                                    │
│ Última renovação: hoje 03:00 (automática)         │
│ Próxima renovação: amanhã 03:00                   │
└────────────────────────────────────────────────────┘
```

- "Renovar agora" → chama `novavida-get-token` (já existe) com flag `force=true` para ignorar cache.
- "Colar token manual" → abre dialog onde admin cola string do token (útil quando você gera manualmente). Salva em `novavida_token_cache` com `expires_at = now() + 24h`.

Ajuste em `novavida-get-token` para aceitar `{ force_refresh: true }` e `{ manual_token: "..." }`.

### 3. Melhorias visuais — aba Consultar

- **Hero compacto** com badge "Powered by Nova Vida TI" + contador de consultas restantes do mês.
- **Cards visuais para escolher o método** (3 cards lado a lado em vez de Select):
  ```
  ┌─ Celular + WhatsApp ─┐  ┌─ Celular ──────┐  ┌─ Perfil 360º ──┐
  │ 📱 NVBOOK_CEL_WHATS │  │ 📞 NVBOOK_CEL  │  │ 🎯 NVCHECK     │
  │ 1 crédito           │  │ 1 crédito      │  │ 1 crédito       │
  │ Recomendado         │  │                │  │ Mais completo   │
  └─────────────────────┘  └────────────────┘  └─────────────────┘
  ```
- **Skeleton animado** no lugar do botão "Buscando..." enquanto carrega.
- Validação visual do CPF em tempo real (✓ verde quando válido).

### 4. Melhorias no ResultCard

- **Header destacado** com nome retornado em fonte grande + score badge + idade + cidade/UF.
- **Seção Telefones**: cada telefone vira card com:
  - Número formatado grande `(11) 98765-4321`
  - Badges coloridos: 🟢 WhatsApp / 🔴 Procon / 🔥 HOT / Operadora
  - Ações inline: `[📋 Copiar]` `[💬 WhatsApp]` `[📞 Ligar]` `[➜ Usar no lead]`
  - Telefones com WhatsApp aparecem **primeiro** com destaque verde.
- **Endereços** em cards horizontais (scroll snap) em vez de lista.
- **Perfil completo**: usar `Tabs` interno (Cadastrais / Score / Sociedades / PEP / Óbito) em vez de uma única seção comprida.

### 5. Melhorias no Histórico

- Agrupar por dia ("Hoje", "Ontem", "Esta semana").
- Filtros rápidos (chips): `Tudo | Sucesso | Cache | Erro | Não encontrado`.
- Busca por nome retornado / CPF.
- Coluna "Telefones" mostrando contador + ícone WhatsApp se algum tem.
- Ação "Reconsultar" direto da linha (force_refresh).

### 6. Melhorias em Configurações

Adicionar card **"Saúde da integração"**:
- ✅ Credenciais configuradas
- ✅ Último teste de conexão: há 2h (sucesso)
- ✅ Token válido (5h restantes)
- 📊 Taxa de sucesso últimos 30 dias: 96%
- 🔄 Renovação automática: ativa (próxima: amanhã 03:00)

---

## Detalhes técnicos

**Arquivos a criar:**
- `supabase/functions/novavida-refresh-tokens/index.ts` (cron worker)
- `supabase/migrations/<ts>_novavida_cron_token_refresh.sql` (apenas extension `pg_cron`/`pg_net`; o `cron.schedule` será inserido via insert tool por conter ANON_KEY)
- `src/modules/telefonia/components/MethodPicker.tsx` (cards de método)
- `src/modules/telefonia/components/PhoneCard.tsx` (card de telefone com ações)
- `src/modules/telefonia/components/TokenManagementCard.tsx` (renovar/colar manual)
- `src/modules/telefonia/components/IntegrationHealthCard.tsx`

**Arquivos a editar:**
- `supabase/functions/novavida-get-token/index.ts` — aceitar `force_refresh` e `manual_token`.
- `src/modules/telefonia/components/ConsultarTab.tsx` — novo layout com hero + MethodPicker + skeleton.
- `src/modules/telefonia/components/ResultCard.tsx` — header destacado, tabs no perfil completo.
- `src/modules/telefonia/components/TelefonesSection.tsx` — usar `PhoneCard`, ordenar WhatsApp primeiro.
- `src/modules/telefonia/components/HistoricoTab.tsx` — agrupamento por dia, chips de filtro, reconsultar.
- `src/modules/telefonia/components/ConfiguracoesTab.tsx` — `TokenManagementCard` + `IntegrationHealthCard`.
- `src/modules/telefonia/hooks/useNovaVidaCredentials.ts` — `forceRefresh()` e `setManualToken()`.

**Sem mudanças de schema** — `novavida_token_cache` já tem todas as colunas necessárias.

---

## Sobre o token que você colou

Posso aproveitá-lo já: ao implementar o "Colar token manual", você abre Configurações → Token de acesso → cola a string → salva. A partir daí o sistema usa esse token até 27/04 15:20 (24h) e às 03:00 do próximo dia o cron renova automaticamente.

Quer que eu siga com tudo isso?
