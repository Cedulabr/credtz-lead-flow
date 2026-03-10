

## Correção: Consulta Base OFF - 4 problemas identificados

### Causa Raiz (confirmada via teste do edge function)

A resposta da API tem estrutura com **objetos aninhados** que o frontend tenta renderizar diretamente como texto:

```json
{
  "endereco": { "bairro": "...", "municipio": "...", "uf": "...", ... },  // ← OBJETO, não string
  "contatos": { "telefones": [...], "emails": [...] },                    // ← telefones estão aqui, não em beneficios
  "beneficios": [{
    "rmc": { "banco": "276", "valor": "120.69" },                        // ← OBJETO
    "rcc": { "banco": "276", "valor": "120.69" },                        // ← OBJETO
    "pagamento": { "banco_pagamento": "69", "agencia_pagamento": "1" },  // ← OBJETO
    ...
  }]
}
```

### 4 Correções

**1. Remover SummaryCards** da `ConsultaView.tsx` — os cards "Total Clientes / Ativos / Simulados / Vencendo" não são necessários.

**2. Corrigir React Error #31** — o campo `endereco` é um objeto e o `InfoRow` tenta renderizá-lo como texto. No `useOptimizedSearch.ts`, achatar o objeto `endereco` em campos individuais (`bairro`, `municipio`, `uf`, `cep`, `logr_nome`, etc.).

**3. Corrigir telefones e emails** — estão em `contatos.telefones` e `contatos.emails` (não diretamente em `beneficios`). Extrair de `row.contatos` antes do flatten.

**4. Corrigir RMC/RCC e dados bancários** — `rmc`, `rcc` e `pagamento` são objetos aninhados dentro de `beneficios[0]`. Mapear para campos flat:
- `rmc.banco` → `banco_rmc`, `rmc.valor` → `valor_rmc`
- `rcc.banco` → `banco_rcc`, `rcc.valor` → `valor_rcc`
- `pagamento.banco_pagamento` → `banco_pagto`, etc.

### Arquivos a Modificar

| Arquivo | Ação |
|---|---|
| `src/modules/baseoff/views/ConsultaView.tsx` | Remover SummaryCards |
| `src/modules/baseoff/hooks/useOptimizedSearch.ts` | Achatar `endereco`, `contatos`, `rmc`, `rcc`, `pagamento` em campos flat |

### Lógica de achatamento (useOptimizedSearch.ts)

```typescript
// Após flatten de beneficios[0]:
const flat = { ...row, ...beneficio };

// 1. Endereco: extrair campos se for objeto
const enderecoObj = typeof flat.endereco === 'object' && flat.endereco ? flat.endereco : null;

// 2. Contatos: extrair de row.contatos (não de beneficio)
const contatos = row.contatos || {};
const tels = (contatos.telefones || flat.telefones || []).filter(Boolean);
const emails = contatos.emails || [];

// 3. RMC/RCC: extrair de objetos aninhados
const rmcObj = flat.rmc && typeof flat.rmc === 'object' ? flat.rmc : null;
const rccObj = flat.rcc && typeof flat.rcc === 'object' ? flat.rcc : null;

// 4. Pagamento: extrair dados bancários
const pagObj = flat.pagamento && typeof flat.pagamento === 'object' ? flat.pagamento : null;

return {
  ...flat,
  // Endereço flat
  endereco: enderecoObj?.endereco || (typeof flat.endereco === 'string' ? flat.endereco : null),
  bairro: flat.bairro || enderecoObj?.bairro || null,
  municipio: flat.municipio || enderecoObj?.municipio || null,
  uf: flat.uf || enderecoObj?.uf || null,
  cep: flat.cep || enderecoObj?.cep || null,
  logr_tipo_1: enderecoObj?.logr_tipo || null,
  logr_nome_1: enderecoObj?.logr_nome || null,
  logr_numero_1: enderecoObj?.logr_numero || null,
  logr_complemento_1: enderecoObj?.logr_complemento || null,
  bairro_1: enderecoObj?.bairro_alt || null,
  cidade_1: enderecoObj?.cidade_alt || null,
  uf_1: enderecoObj?.uf_alt || null,
  cep_1: enderecoObj?.cep_alt || null,
  // Telefones
  tel_cel_1: tels[0] || null,
  tel_cel_2: tels[1] || null,
  tel_cel_3: tels[2] || null,
  tel_fixo_1: tels[3] || null,
  telefones: tels,
  // Emails
  email_1: emails[0] || flat.email_1 || null,
  // RMC/RCC
  banco_rmc: rmcObj?.banco || flat.banco_rmc || null,
  valor_rmc: parseFloat(rmcObj?.valor || flat.valor_rmc) || 0,
  banco_rcc: rccObj?.banco || flat.banco_rcc || null,
  valor_rcc: parseFloat(rccObj?.valor || flat.valor_rcc) || 0,
  // Pagamento
  banco_pagto: pagObj?.banco_pagamento || flat.banco_pagto || null,
  agencia_pagto: pagObj?.agencia_pagamento || flat.agencia_pagto || null,
  conta_corrente: pagObj?.conta_corrente || flat.conta_corrente || null,
  meio_pagto: pagObj?.meio_pagamento || flat.meio_pagto || null,
  orgao_pagador: pagObj?.orgao_pagador || flat.orgao_pagador || null,
  // ... contratos e demais campos existentes
};
```

Nenhuma alteração no edge function do Supabase.

