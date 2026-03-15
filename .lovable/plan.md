

## Redesign Módulo Digitação — Layout Qualibank (5 Steps)

### Análise dos Prints vs. Código Atual

O código atual tem 4 steps (Cliente → Simulação → Docs → Enviar) com os dados pessoais e endereço escondidos em um collapsible. Os prints do Qualibank mostram um fluxo diferente com 5 etapas claras e um sistema de múltiplas simulações:

```text
FLUXO ATUAL (4 steps):
1. Cliente (tudo junto, dados adicionais colapsados)
2. Simulação
3. Documentos
4. Confirmação + Bancários

FLUXO QUALIBANK (5 steps):
1. Consulta IN100 (CPF, Nome, NB, Celular + link copiável)
2. Simulações (criar/listar múltiplas simulações com modal)
3. Dados Pessoais + Benefício + Endereço + Bancários
4. Documentos (upload frente/verso)
5. Formalização (status, link formalização, CCB)
```

### Mudanças Principais

**Step 1 — Consulta IN100** (print 37): Layout limpo com apenas CPF, Nome, NB, Celular. Abaixo: "Autorize o IN100" com link copiável e botão "Copiar". Sem dados adicionais neste step.

**Step 2 — Simulações** (prints 38-39): Suporte a múltiplas simulações. Botão "Adicionar Simulação" abre um modal/card com: Produto (select), Tabela (select), seção Portabilidade (Banco Origem, Nº Contrato, Taxa, Prazo Original, Parcelas Restantes, Valor Parcela, Saldo Devedor), seção Refinanciamento (Taxa, Prazo, Valor Parcela, Valor do Contrato). Resultado: Valor do Troco + IOF. Lista de simulações criadas com detalhes expandidos.

**Step 3 — Dados Pessoais + Endereço + Bancários** (prints 40-41): Campos organizados em seções claras: Dados Pessoais (Tipo Doc, Número, UF, Órgão, Data Emissão, Nascimento, Sexo, Estado Civil, Email, Nome Mãe), Dados do Benefício (Tipo, DDB, UF, Forma Pagamento), Dados do Endereço (CEP, Rua, Número, Complemento, Bairro, Cidade, UF), Dados Bancários (Tipo Conta, Banco, Agência, Conta, Dígito).

**Step 4 — Documentos** (print 42): Upload frente e verso com cards visuais mostrando formatos aceitos (PNG, JPEG, PDF, HEIC) e tamanho mínimo. Checkbox "Documentos enviados pelo próprio cliente". Navegação "Voltar | 3/4 | Próximo".

**Step 5 — Formalização** (print 43): Após envio bem-sucedido, mostrar status, tipo (Biometria com documento), link de formalização copiável e botão "Visualizar CCB".

### Dados do PDF para Teste

O PDF contém os dados completos de uma proposta Port+Refin da cliente ALAIDE FERREIRA DOS SANTOS (CPF 146.046.475-34, NB 1347306800). Após implementar o redesign, o sistema estará pronto para digitação desses dados via interface.

### Arquivos a Modificar/Criar

| Arquivo | Ação |
|---|---|
| `src/modules/digitacao/components/DigitacaoForm.tsx` | Redesign completo — 5 steps no layout Qualibank |
| `src/modules/digitacao/components/SimulationModal.tsx` | Novo — Modal de criação de simulação (print 38) |
| `src/modules/digitacao/components/SimulationCard.tsx` | Novo — Card de simulação criada na lista (print 39) |
| `src/modules/digitacao/components/ProposalDetail.tsx` | Atualizar — Adicionar seção formalização (print 43) |
| `src/modules/digitacao/types.ts` | Adicionar types para múltiplas simulações e formalização |

