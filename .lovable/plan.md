# Telefonia Module — Backend Infrastructure (Step 1)

Create the backend foundation for the new "Telefonia" module that integrates with the **Nova Vida TI** SOAP/JSON WebService to query phone numbers and full profile data by CPF. This step is backend-only (DB schema + 2 Edge Functions). UI will come in subsequent prompts.

## Adjustments vs the original prompt

After inspecting the actual schema, two corrections are required:

1. **No `user_profiles` table** — the project uses `profiles` + `user_companies` (multi-tenant). RLS must use `user_companies` to resolve the caller's `company_id`, following the existing `tenant_isolation` pattern (memory: `database-join-constraints`, `gestor-oversight-scope-v2`).
2. **`leads` table has no `telefone`/`ddd` columns** — only `id`, `cpf`, `company_id`. Step 9 ("update leads.telefone/ddd") will be **skipped in this backend step**. The phones are still saved to `telefonia_numeros` and can be linked to a lead via `lead_id`. Updating leads with phones will be revisited when the UI prompt arrives (we'll either add columns or write to a related table then).

Everything else matches the spec.

## 1. Database migration

New tables (all with RLS, tenant-isolated by `company_id` resolved through `user_companies`):

- **`novavida_credentials`** — per-company API credentials (`usuario`, `senha`, `cliente`, `active`). Unique on `company_id`.
- **`novavida_token_cache`** — per-company token cache with `expires_at = now() + interval '23 hours 50 minutes'`. Unique on `company_id`.
- **`telefonia_consultas`** — every query (`cpf`, `metodo`, `resultado jsonb`, `status`, `error_message`, `credits_used`, `queried_by`, `queried_at`, optional `lead_id`).
- **`telefonia_numeros`** — normalized phones extracted from results (`ddd`, `numero`, `numero_completo`, `tipo`, `tem_whatsapp`, `procon`, `operadora`, `flhot`, `assinante`, `posicao`).

RLS policies (one per table, SELECT/INSERT/UPDATE/DELETE):

```sql
-- helper used by all four tables
using (company_id in (
  select company_id from public.user_companies
  where user_id = auth.uid() and is_active = true
))
```

Plus an **admin override** using the existing `has_role_safe(auth.uid(), 'admin')` helper so super-admins see/manage everything (matches existing project patterns).

Indexes: `(company_id, cpf, metodo, queried_at desc)` on `telefonia_consultas` for the 7-day cache lookup; `(consulta_id)` and `(company_id, cpf)` on `telefonia_numeros`.

`updated_at` trigger on `novavida_credentials`.

## 2. Edge Function: `novavida-get-token`

Path: `supabase/functions/novavida-get-token/index.ts`. Registered in `supabase/config.toml` with `verify_jwt = false` (token validated in code via the caller's JWT).

Flow:
1. Validate auth (read JWT, get `user.id`).
2. Resolve `company_id` from `user_companies` (or accept it in body for admin).
3. SELECT from `novavida_token_cache` where `company_id = ?` and `expires_at > now()`. If found → return `{ token }`.
4. Else SELECT credentials from `novavida_credentials` where `company_id = ? and active = true`. If missing → `{ error: 'credentials_not_configured' }`.
5. Base64-encode `usuario`, `senha`, `cliente` and POST a SOAP envelope to `https://wsnv.novavidati.com.br/WSLocalizador.asmx` with `SOAPAction: "http://tempuri.org/GerarToken"`.
6. Parse XML, extract `<GerarTokenResult>`.
7. UPSERT into `novavida_token_cache` with `expires_at = now() + interval '23 hours 50 minutes'`.
8. Return `{ token }`.

Errors returned with proper status codes and CORS headers (uses the standard `corsHeaders` block already used across the project).

## 3. Edge Function: `novavida-consulta`

Path: `supabase/functions/novavida-consulta/index.ts`. Registered with `verify_jwt = false`.

Input body: `{ company_id?, lead_id?, cpf, metodo }` where `metodo ∈ { 'NVBOOK_CEL_OBG', 'NVBOOK_CEL_OBG_WHATS', 'NVCHECK_JSON' }`.

Flow:
1. Auth + resolve `company_id` (same pattern as token function).
2. **Validate CPF** with regex (11 digits after stripping non-digits). Return 400 on invalid.
3. **7-day cache**: SELECT most recent `telefonia_consultas` row for `(company_id, cpf, metodo)` within last 7 days with `status='success'`. If found → return cached `resultado` immediately, do NOT call the API, do NOT consume credits.
4. Call `novavida-get-token` internally (service role) to get a valid token.
5. Build the request per method:
   - **NVBOOK_CEL_OBG** → `POST https://wsnv.novavidati.com.br/WSLocalizador.asmx/NVBOOK_CEL_OBG` with form-encoded `DOCUMENTO` + `TOKEN`.
   - **NVBOOK_CEL_OBG_WHATS** → `POST https://wsnv.novavidati.com.br/WSLocalizador.asmx/NvBookCelObWhats` with `DOCUMENTO` + `TOKEN`.
   - **NVCHECK_JSON** → `POST https://wsnv.novavidati.com.br/WSLocalizador.asmx/NVCHECKJson` with `Content-Type: application/json`, `Token: <token>` header, body `{ "nvcheck": { "Documento": cpf } }`.
6. Parse XML (custom lightweight parser, no external dep) or JSON depending on method.
7. Detect API error strings in the body and map to status:
   - `USUARIO, SENHA OU CLIENTE INCORRETO` → `auth_error`
   - `SEM ACESSO AO SISTEMA` → `no_access`
   - `QUANTIDADE CONFIGURADA ATINGIDA` → `quota_exceeded`
   - empty/no records → `not_found`
   - else → `success`
8. INSERT a row in `telefonia_consultas` with full `resultado` jsonb, `status`, `error_message`, `credits_used` (1 on success, 0 otherwise), `queried_by = user.id`.
9. **Extract & normalize phones** into `telefonia_numeros`:
   - **NVBOOK** methods → iterate `<CELULARES>/<CELULAR>` (`tipo='celular'`, fields `DDDCEL`, `CEL`, `PROCON`, `FLWHATSAPP`) and `<TELEFONES>/<TELEFONE>` (`tipo='fixo'`, `DDD`, `TELEFONE`, `PROCON`).
   - **NVCHECK** → iterate `TELEFONES[]` mapping `TIPO_TELEFONE`: `'C'→celular`, `'F'→fixo`, plus `OPERADORA`, `FLHOT`, `ASSINANTE`, `PROCON`, `POSICAO`.
   - For each: `numero_completo = ddd + numero`, `tem_whatsapp` from `FLWHATSAPP === 'S'` (NVBOOK) or `null` (NVCHECK). Bulk insert.
10. **Lead update step is skipped in this backend step** (see Adjustments). The `lead_id` is still stored on `telefonia_consultas` and `telefonia_numeros` so the future UI can link them.
11. Return the parsed result `{ status, consulta_id, resultado, telefones: [...] }`.

CORS, input validation with explicit checks, structured logs on errors. Uses `SUPABASE_SERVICE_ROLE_KEY` only inside the function (never exposed).

## 4. Config file

Append to `supabase/config.toml`:
```toml
[functions.novavida-get-token]
verify_jwt = false

[functions.novavida-consulta]
verify_jwt = false
```

## What this step delivers

- 4 new tables with full RLS isolation per company + admin override.
- 2 deployed Edge Functions ready to be called from the future Telefonia UI.
- Token caching (24h) and result caching (7 days) to minimize API cost.
- Audit trail of every query in `telefonia_consultas`.

## What's NOT in this step (coming in the next prompts)

- Telefonia UI module (`src/modules/telefonia/...`).
- Admin screen to register `novavida_credentials` per company.
- Linking phones back to `leads` (will require deciding whether to add `telefone`/`ddd` columns to `leads` or use a new join table).
- Routing/menu entry.
