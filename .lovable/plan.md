

## Módulo Digitação — Standalone Mobile-First

### Objetivo

Criar um módulo independente chamado "Digitação" no menu de navegação, permitindo que usuários digitem contratos diretamente pelo celular usando a API bancária JoinBank. Diferente do wizard atual (que abre como Sheet lateral dentro do Base OFF e requer um cliente pré-selecionado), este módulo será uma página completa, standalone, onde o usuário preenche tudo do zero.

### Arquitetura

```text
src/modules/digitacao/
├── DigitacaoModule.tsx          # Módulo principal com lista de propostas + botão "Nova Digitação"
├── index.ts                     # Exports
├── types.ts                     # Types
├── components/
│   ├── DigitacaoForm.tsx         # Wizard mobile-first 4 steps (fullscreen)
│   ├── ProposalCard.tsx          # Card de proposta na listagem
│   └── ProposalDetail.tsx        # Detalhe/status de uma proposta
└── hooks/
    └── useDigitacao.ts           # CRUD de propostas (joinbank_proposals) + lógica de listagem
```

### Fluxo do Wizard (4 Steps — Mobile-First)

**Step 1 — Dados do Cliente**: CPF (com busca automática se existir na base), Nome, NB, Celular, Data Nascimento, DDB, Espécie, Renda, UF. Seção colapsável "Dados Adicionais" (endereço, RG, mãe). Link copiável IN100 + botão consultar.

**Step 2 — Simulação**: Tipo operação, Tabela (rules), Prazo, Taxa, Valor Parcela/Empréstimo, Seguro. Se Port/Refin: campos do contrato de origem. Botão "Calcular" com resultado visual (parcela, valor liberado, IOF, troco).

**Step 3 — Documentos**: Upload frente/verso do documento (aceita imagem e PDF).

**Step 4 — Confirmação**: Dados bancários para crédito + resumo completo + botão "Enviar Proposta".

### Layout Mobile-First

- Formulário ocupa tela inteira (não Sheet lateral)
- Inputs com `h-12` para facilitar toque
- Step indicator compacto (dots) no mobile
- Botões de navegação fixos no bottom (`sticky bottom-0`)
- Cards de resultado da simulação com destaque visual (verde/vermelho para troco)
- Listagem de propostas em cards com status badge e swipe actions

### Tela Principal (DigitacaoModule)

- Header com título + botão FAB "Nova Digitação"
- Lista de propostas do usuário (joinbank_proposals) com filtros por status
- Cards mostrando: CPF, Nome, Tipo Operação, Status, Data
- Tap no card abre detalhe com dados completos + ações (consultar status, copiar simulação)

### Integração

- Reutiliza `useJoinBankAPI` existente (hook do Base OFF)
- Reutiliza tabela `joinbank_proposals` existente
- Permissão: `can_access_digitacao`

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---|---|
| `src/modules/digitacao/DigitacaoModule.tsx` | Módulo principal com listagem + FAB |
| `src/modules/digitacao/components/DigitacaoForm.tsx` | Wizard 4 steps mobile-first (fullscreen) |
| `src/modules/digitacao/components/ProposalCard.tsx` | Card de proposta |
| `src/modules/digitacao/hooks/useDigitacao.ts` | CRUD propostas + busca CPF na base |
| `src/modules/digitacao/types.ts` | Types |
| `src/modules/digitacao/index.ts` | Exports |
| `src/components/Navigation.tsx` | Adicionar item "Digitação" com icon CreditCard |
| `src/components/LazyComponents.tsx` | Lazy import do módulo |
| `src/pages/Index.tsx` | Registrar tab + permissão |
| `src/components/UsersList.tsx` | Adicionar `can_access_digitacao` nas permissões |
| Migração SQL | Adicionar coluna `can_access_digitacao` na tabela profiles |

