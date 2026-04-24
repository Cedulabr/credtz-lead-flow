

## Ajustes na importação de leads (Leads Premium)

### 1. Seletor de convênio na tela de importação
Em vez de exigir uma coluna "Convênio" no CSV, o usuário escolhe o convênio **uma única vez** na própria tela antes de importar. Esse valor é aplicado a todos os leads do arquivo.

**Em `src/components/ImportBase.tsx`:**
- Adicionar um `<Select>` obrigatório **"Convênio destes leads"** logo acima do seletor de formato (Padrão / Governo BA), com opções:
  - INSS
  - SIAPE
  - Servidor Público (Governo BA)
  - FGTS
  - Bolsa Família
  - CLT
  - Outro
- Estado local `selectedConvenio: string`. Botão "Importar" fica desabilitado enquanto não houver convênio selecionado.
- No parser (tanto no formato Padrão quanto Governo), **ignorar** qualquer coluna "Convênio" do CSV e aplicar `convenio: selectedConvenio` em todos os registros antes de enviar para `import_leads_from_csv` / `import_leads_governo`.
- Quando o formato for **"Governo BA"**, travar o convênio em "Servidor Público" automaticamente (o select fica desabilitado e pré-selecionado), pois o formato já é específico.
- Atualizar o `downloadTemplate` para **remover** a coluna "Convênio" dos exemplos (Padrão e Governo) e adicionar uma nota no topo do CSV: `# Convênio será definido no momento da importação`.

### 2. Padronização de CPF com zeros à esquerda
CPFs com menos de 11 dígitos (comum quando o Excel remove zeros à esquerda — ex.: `1234567890` deveria ser `01234567890`) serão automaticamente normalizados.

**Em `src/components/ImportBase.tsx` (função de parse, ambos formatos):**
- Função utilitária `normalizeCPF(raw: string): string | null`:
  ```ts
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits || digits.length > 11) return null; // inválido
  return digits.padStart(11, '0');
  ```
- Aplicar a `normalizeCPF` em cada linha **antes** de validar/empacotar o lead. Se retornar `null`, a linha vai para o relatório de erros com motivo "CPF inválido".
- O mesmo tratamento já existe em `process-import/index.ts` (`cleanCPF` faz `padStart(11, '0')`), então o backend permanece compatível. Não há mudança necessária na Edge Function nem nas RPCs.

### 3. Feedback visual
- Logo abaixo do select de convênio, exibir um aviso curto:
  > "Todos os leads deste arquivo serão importados como **{convênio escolhido}**. CPFs com menos de 11 dígitos serão completados com zeros à esquerda automaticamente."

### Arquivos editados
- `src/components/ImportBase.tsx` — novo seletor de convênio, normalização de CPF nos dois parsers, template CSV sem coluna "Convênio".

### Resultado
- Importação fica mais simples: o usuário escolhe o convênio uma vez no select; não precisa editar a planilha para incluir a coluna.
- CPFs vindos do Excel com zeros suprimidos (ex.: `8765432101` → `08765432101`) são corrigidos automaticamente, evitando duplicatas e leads inválidos.

