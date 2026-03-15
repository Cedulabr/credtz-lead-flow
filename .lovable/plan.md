

## Correção de Busca + Redesign da Digitação (Layout Qualibank)

### Problema 1: Busca CPF não carrega

A edge function `baseoff-external-query` não foi modificada, mas os logs mostram apenas "shutdown" (sem erros). Possíveis causas:
- Conexão externa com o PostgreSQL da base caindo (pool timeout)
- A última edição no `useOptimizedSearch.ts` pode ter introduzido um erro silencioso no mapeamento

**Ação**: Testar a edge function diretamente via `supabase--test_edge_functions` para verificar se a conexão com o banco externo está funcional. Se o problema for o hook, reverificar o mapeamento.

### Problema 2: Autenticação da API de Tabelas

A documentação mostra inconsistência: em algumas seções o endpoint `/loan-product-rules/search/basic` usa `apikey`, em outras usa `Bearer Token`. O proxy atual envia **apenas** Bearer para esse endpoint — mas provavelmente precisa enviar **ambos** os headers (`apikey` + `Authorization: Bearer`), ou apenas `apikey`.

**Ação**: Alterar o proxy para enviar `apikey` para **todos** os endpoints (padrão da API), mantendo `Authorization: Bearer` apenas quando explicitamente necessário (seção de Aprovação 2.1.2).

### Problema 3: Redesign do Wizard — Layout Qualibank

Baseado nas 4 telas enviadas, o novo fluxo será:

```text
Step 1/4: Consulta IN100
├── CPF, Nome, Nº Benefício, Celular (pré-preenchidos, editáveis)
└── "Autorize o IN100" — link para o cliente autorizar (copiável)

Step 2/4: Simulação
├── Produto (select) + Tabela (select)
├── Se Port/Refin:
│   ├── Portabilidade: Banco Origem, Nº Contrato, Taxa, Prazo, Parcelas Restantes, Valor Parcela, Saldo Devedor
│   └── Refinanciamento: Taxa, Prazo, Valor Parcela, Valor do Contrato
├── Resultado: Valor do Troco, Valor do IOF
└── Botões: "Simular" + "Confirmar"

Step 3/4: Documentos
├── Upload Frente do Documento (PNG, JPEG, PDF, HEIC)
└── Upload Verso do Documento (mesmos formatos)

Step 4/4: Confirmação + Envio
├── Resumo completo (dados pessoais + operação + resultado)
├── Dados bancários para crédito
└── Botão "Enviar Proposta"
```

Os dados pessoais completos (endereço, RG, mãe, etc.) continuam sendo enviados na API, mas ficam em uma seção colapsável "Dados Adicionais" dentro do Step 1, em vez de um step inteiro separado. O foco visual é a consulta IN100 e a simulação.

### Problema 4: Salvar Documentação API

Criar arquivo `docs/JOINBANK_API_REFERENCE.md` com o resumo completo dos endpoints, payloads e autenticação para referência futura.

### Arquivos a Modificar/Criar

| Arquivo | Ação |
|---|---|
| `supabase/functions/joinbank-proxy/index.ts` | Corrigir autenticação — usar `apikey` como padrão para todos os endpoints |
| `src/modules/baseoff/components/DigitacaoWizard.tsx` | Redesign completo — layout Qualibank (4 steps: IN100, Simulação, Documentos, Confirmação) |
| `src/modules/baseoff/hooks/useJoinBankAPI.ts` | Adicionar métodos `queryIN100`, `getAuthTerm`, `uploadDocument` |
| `src/modules/baseoff/hooks/useOptimizedSearch.ts` | Verificar e corrigir possível erro no mapeamento que impede retorno |
| `docs/JOINBANK_API_REFERENCE.md` | Criar referência completa da API |

