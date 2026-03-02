

## Plano: Corrigir modulo "Meu Numero" - Adequar a API BR DID

### Problema

Apos estudar a documentacao oficial da API (https://brdid.com.br/api-docs/brdid-api.json), identifiquei **9 problemas criticos** que impedem o funcionamento correto do modulo. Os nomes dos parametros e o metodo de envio estao incorretos em praticamente todos os endpoints.

### Problemas identificados e correcoes

#### 1. Edge Function: TODOS os parametros sao via query string (NAO body)

A API BR DID usa `"in": "query"` para TODOS os parametros, inclusive nos endpoints POST. A edge function envia params no body para POST, mas a API espera tudo na URL como query params.

**Correcao:** Alterar a edge function para enviar TODOS os parametros como query params, independente do metodo HTTP.

#### 2. Contratacao de DID (adquirir_novo_did)

Parametros errados:
- Enviamos: `{ CODIGO }` 
- API exige: `CN` (numero) + `NUMERO` (string) + `SIP_TRUNK` (opcional, enviar 0 para criar usuario SIP)

**Correcao no hook e na view BuscarNumerosView:** Enviar `CN`, `NUMERO` e `SIP_TRUNK=0`.

#### 3. WhatsApp configurar

Parametros errados:
- Enviamos: `NUMERO` + `WEBHOOK`
- API exige: `numero` (minusculo!) + `url_retorno`

**Correcao adicional:** Melhorar a explicacao do campo webhook para leigos. Explicar passo a passo como vincular o WhatsApp Business ao numero virtual, incluindo o fluxo de verificacao por ligacao.

#### 4. Billing - Criar Plano

Campos totalmente errados:
- Enviamos: `NOME`, `VALOR`, `DESCRICAO`
- API exige: `NOME`, `VALOR MINUTOS FIXO`, `VALOR MINUTOS MOVEL` (com espacos!)

**Correcao:** Redesenhar o formulario com os campos corretos.

#### 5. Billing - Criar Cliente

Faltam 9 campos obrigatorios. A API exige:
- `NOME`, `EMAIL`, `TELEFONE`, `CPF / CNPJ`, `CEP`, `ENDERECO`, `NUMERO`, `BAIRRO`, `CIDADE`, `ESTADO`, `VENCIMENTO`, `CORTE FATURA`

**Correcao:** Redesenhar o formulario completo com todos os 12 campos.

#### 6. Billing - Vincular (montar_cliente_plano_dids)

Parametros errados:
- Enviamos: `CLIENTE_ID`, `PLANO_ID`, `DID_NUMERO`
- API exige: `ID CLIENTE`, `ID PLANO`, `LISTA DE DIDS` (CN+Numero, separado por virgula)

#### 7. Logs de Chamadas (CDR)

Parametro errado:
- Enviamos: `NUMERO`, `MES`, `ANO` separados
- API exige: `NUMERO` + `PERIODO` no formato `MMAAAA` (ex: `032026`)

#### 8. SIP Configurar (siga_me)

Parametro errado:
- Enviamos: `DESTINO`
- API exige: `NUMERO_TRANSFERIR`

#### 9. Cancelar DID

Falta parametro:
- Enviamos: apenas `NUMERO`
- API exige: `CN` + `NUMERO`

---

### Arquivos a modificar

#### `supabase/functions/brdid-api/index.ts`
- Mover TODOS os params para query string (tanto GET quanto POST)
- Corrigir nomes de parametros com espacos (usar encodeURIComponent ou URLSearchParams)

#### `src/modules/meu-numero/hooks/useBrDid.ts`
- Corrigir `adquirirDid`: enviar `CN`, `NUMERO`, `SIP_TRUNK=0`
- Corrigir `whatsappConfigurar`: usar `numero` (minusculo) e `url_retorno`
- Corrigir `configurarSip`: usar `NUMERO_TRANSFERIR`
- Corrigir `cancelarDid`: enviar `CN` + `NUMERO`
- Corrigir `getCdrs`: montar `PERIODO` como `MMAAAA`
- Corrigir `criarPlano`: usar campos corretos com espacos
- Corrigir `criarCliente`: usar todos os campos obrigatorios
- Corrigir `montarClientePlanoDids`: usar `ID PLANO`, `ID CLIENTE`, `LISTA DE DIDS`

#### `src/modules/meu-numero/views/BuscarNumerosView.tsx`
- Corrigir `handleContratar` para enviar `CN` e `NUMERO` ao inves de `CODIGO`
- Garantir que o Select de localidades funcione corretamente (converter AREA_LOCAL para string)

#### `src/modules/meu-numero/views/WhatsAppView.tsx`
- Substituir campo "URL do Webhook" por explicacao detalhada passo a passo:
  1. O que e: "Quando voce cadastrar seu numero no WhatsApp Business, o sistema vai ligar pro seu numero com um codigo de verificacao"
  2. Explicar que o webhook recebe o audio com o codigo automaticamente
  3. Adicionar card explicativo com passo a passo de como vincular ao WhatsApp Business
  4. Informar que precisa ter o "Siga-me" configurado OU um softphone para receber a ligacao

#### `src/modules/meu-numero/views/BillingView.tsx`
- **Criar Plano:** Redesenhar com campos: Nome, Valor Minutos Fixo, Valor Minutos Movel, e campos opcionais (Aplicar Limite, Limite por Valor, Limite por Minutos, Produtos Adicionais)
- **Criar Cliente:** Redesenhar com todos os 12 campos: Nome, Email, Telefone, CPF/CNPJ, CEP, Endereco, Numero, Complemento, Bairro, Cidade, Estado, Vencimento, Corte Fatura, ID Plano (opcional)
- **Vincular:** Corrigir parametros para `ID PLANO`, `ID CLIENTE`, `LISTA DE DIDS`

#### `src/modules/meu-numero/views/LogsChamadasView.tsx`
- Montar `PERIODO` no formato `MMAAAA` (ex: mes 3 + ano 2026 = `032026`)

#### `src/modules/meu-numero/views/ConfiguracaoSipView.tsx`
- Corrigir parametro para `NUMERO_TRANSFERIR`

#### `src/modules/meu-numero/views/MeusNumerosView.tsx`
- Corrigir cancelamento para enviar `CN` + `NUMERO`

#### `src/modules/meu-numero/types.ts`
- Atualizar tipos do BillingCliente com todos os campos

### Sequencia de implementacao

1. Corrigir edge function (query params para tudo)
2. Corrigir hook useBrDid (nomes de parametros)
3. Corrigir todas as 6 views
4. Deploy da edge function e testar

