# JoinBank API Reference (Ajin v3)

Base URL: `https://api.ajin.io/v3`

## Autenticação

- **Padrão**: Header `apikey: <JOINBANK_API_KEY>` para a maioria dos endpoints
- **Tabelas (Rules)**: `apikey` + `Authorization: Bearer <JOINBANK_LOGIN_ID>` (docs inconsistentes entre seções 1.2 e 2.1.1.2)
- **Aprovação de Saldo (2.1.2)**: `Authorization: Bearer <token>` exclusivamente

## 1. Produtos de Empréstimo

### 1.1 Listar Produtos
```
POST /loan-products/search/basic
Auth: apikey
Body: { "offset": 0, "limit": 100, "type": { "code": { "eq": 20 } }, "operation": { "code": { "eq": 3 } } }
```

### 1.2 Listar Tabelas (Rules)
```
POST /loan-product-rules/search/basic
Auth: apikey (+ Bearer token)
Body: { "offset": 0, "limit": 100, "operation": { "code": { "eq": 3 } } }
```

### Tipos de Produto
| Código | Nome |
|--------|------|
| 10 | Crédito Pessoal |
| 20 | INSS |
| 30 | SIAPE |
| 40 | FGTS |

### Tipos de Operação
| Código | Nome |
|--------|------|
| 1 | Novo |
| 2 | Refinanciamento |
| 3 | Portabilidade |
| 4 | Portabilidade + Refinanciamento |
| 5 | Refinanciamento da Portabilidade |

## 2. Simulação INSS

### 2.1.1.3 Criar Simulação (Portabilidade)
```
POST /loan-inss-simulations
Auth: apikey
Body: {
  "borrower": {
    "name", "identity" (CPF), "benefit" (NB), "benefitState", "benefitStartDate" (YYYY-MM-DD),
    "benefitPaymentMethod" (1=Cartão, 2=CC), "benefitType" (espécie),
    "birthDate", "motherName", "maritalStatus", "sex", "income", "phone", "email",
    "address": { "street", "number", "complement", "district", "city", "state", "zipCode" },
    "document": { "type": { "code": "RG", "name": "Registro Geral" }, "number", "issuingDate", "issuingEntity", "issuingState" }
  },
  "items": [{
    "ruleId", "term", "rate", "installmentValue", "loanValue", "hasInsurance", "referenceCode",
    "originContract": { "lenderCode", "contractNumber", "term", "installmentsRemaining", "installmentValue", "dueBalanceValue" },
    "refinancing": { "term", "rate", "installmentValue" } // Apenas para Port+Refin
  }],
  "creditBankAccount": { "bank", "branch", "number", "digit" },
  "step": { "code": 0, "name": null },
  "files": [{ "id": "uuid", "type": "doc_front" }, { "id": "uuid", "type": "doc_back" }],
  "note": null, "brokerId": null, "accessId": null
}
```

### 2.1.1.3.1 Calculadora
```
POST /loan-inss-simulations/calculation
Auth: apikey
Body: { "ruleId", "term", "rate", "installmentValue", "loanValue", "originContract": {...}, "hasInsurance", "referenceCode" }
```

### Refinanciamento — originContracts (array)
```json
"originContracts": [{
  "key": "00000000-0000-0000-0000-000000000000",
  "lenderCode": 329,
  "contractNumber": "xxx",
  "term": 95,
  "installmentsRemaining": 95,
  "installmentValue": 525.16,
  "dueBalanceValue": 24004.25
}]
```

### 2.1.1.6.1 Listar Contratos Refinanciáveis
```
POST /loan-inss-simulations/refinanceable-contracts
Auth: apikey
Body: { "identity", "benefit", "ruleid", "anyUser": true }
```

### 2.1.1.7 Atualizar Simulação
```
PUT /loan-inss-simulations/{simulation_id}
Auth: apikey
```

### 2.1.1.8 Selecionar Simulação
```
GET /loan-inss-simulations/{simulation_id}
Auth: apikey
```

### 2.1.1.10 Obter Termo de Autorização
```
GET /loan-inss-simulations/{simulation_id}/auth-term
Auth: apikey
```

### 2.1.1.11 Assinar Termo
```
PUT /signer/{auth_term_key}/accept
Auth: apikey
Body: { "position": { "latitude": "-235489", "longitude": "-466388" } }
```

### 2.1.1.12 Consultar IN100
```
POST /query-inss-balances/finder
Auth: apikey
Body: { "identity", "benefitNumber", "lastHours": 1, "timeout": 120 }
```

### 2.1.1.14 Consultar IN100 (Aguardar Retorno)
```
POST /query-inss-balances/finder/await
Auth: apikey
Body: { "identity", "benefitNumber" }
```

### 2.1.1.15 Gerar Contratos
```
POST /loan-inss-simulations/{simulation_id}/actions
Auth: apikey
Body: { "command": "create_loans" }
```

### 2.1.1.16 Consultar Empréstimos por Simulação
```
POST /loans/search
Auth: apikey
Body: { "simulationId": { "eq": "uuid" } }
```

### 2.1.1.20 Copiar Simulação
```
POST /loan-inss-simulations/{simulation_id}/copy
Auth: apikey
Body: {}
```

## 3. Arquivos

Upload de documentos retorna um ID que deve ser referenciado como `doc_front` ou `doc_back` no campo `files` da simulação.

## 2.1.2 Aprovação de Saldo

Auth: Bearer Token (OAuth2) — `Authorization: Bearer <token>`
Endpoint: `POST /loans/search` com `searchText`, `limit`, `offset`
