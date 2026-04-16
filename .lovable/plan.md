

## Fluxo especial para Agibank Easyn no Televendas

### Resumo
Duas regras especiais quando o banco selecionado contém "AGIBANK":

1. **Portabilidade + Agibank = Bloqueio**: Se o produto é "Portabilidade" e o usuário seleciona Agibank como banco proponente, travar o wizard com mensagem "Adquira o módulo PortFlow" e botão para voltar.

2. **Outros produtos + Agibank = Documentação obrigatória**: Ao finalizar venda com Agibank (não-portabilidade), pular o `InitialStatusDialog`, auto-definir status como `solicitar_digitacao`, e abrir `DocumentUploadModal` com RG e Extrato **obrigatórios** (sem botão "Pular").

### Alterações

**1. `PortabilidadeStep.tsx` — Bloqueio Portabilidade + Agibank**
- Quando `banco_proponente` contém "AGIBANK", exibir overlay/card de bloqueio: ícone 🔒, mensagem "Para portabilidade Agibank, adquira o módulo PortFlow", botão "Voltar e escolher outro banco" que limpa `banco_proponente`
- Invalidar o step (`onValidChange(false)`) enquanto Agibank estiver selecionado

**2. `ValuesStep.tsx` — Bloqueio Portabilidade + Agibank (no select)**
- Na ValuesStep (para Refinanciamento), quando banco contém "AGIBANK" e `tipo_operacao === "Portabilidade"`, mesmo bloqueio (segurança extra, embora Portabilidade use PortabilidadeStep)

**3. `SalesWizard.tsx` — Fluxo Agibank sem status dialog**
- No `handleComplete`: verificar se o banco selecionado contém "AGIBANK"
  - Se sim: pular `setShowStatusDialog(true)`, chamar diretamente `handleStatusSelected("solicitar_digitacao")` passando flag `isAgibank = true`
- Passar prop `requiredMode` ao `DocumentUploadModal` quando Agibank, tornando RG e Extrato obrigatórios

**4. `DocumentUploadModal.tsx` — Modo obrigatório**
- Nova prop `requiredMode?: boolean` (default false)
- Quando `requiredMode = true`:
  - Texto muda de "opcionais" para "obrigatórios"
  - Botão "Pular" fica oculto
  - Botão "Enviar" fica desabilitado até que RG (frente) e Extrato estejam selecionados
  - Labels mostram asterisco vermelho de obrigatoriedade

### Fluxo resultante

```text
Agibank + NÃO-Portabilidade:
  Cliente → Produto → Valores (banco=Agibank) → Confirmar
  → [Pula status dialog, auto "solicitar_digitacao"]
  → [DocumentUpload OBRIGATÓRIO: RG + Extrato]
  → Sucesso

Agibank + Portabilidade:
  Cliente → Produto(Portabilidade) → PortabilidadeStep
  → Seleciona Agibank como proponente
  → 🔒 BLOQUEIO: "Adquira o módulo PortFlow"
  → Botão "Voltar" limpa seleção
```

