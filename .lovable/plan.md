

## Plano: Modulo "Meu Numero" - Integracao BR DID API

### Resumo

Criar um novo modulo completo chamado **"Meu Numero"** que integra com a API da BR DID (brdid.com.br) para permitir que usuarios adquiram e gerenciem numeros virtuais diretamente na plataforma.

### API BR DID - Endpoints mapeados

Base URL: `https://brdid.com.br/br-did/api/public/`
Autenticacao: Token via query parameter `TOKEN`

| Secao do Modulo | Endpoint(s) API | Metodo |
|---|---|---|
| Buscar localidades | `/buscar_localidades` | GET |
| Buscar numeros por area | `/buscar_numeros_by_area_local` | GET |
| Consultar DID | `/consultar_did` | GET |
| Contratar DID | `/adquirir_novo_did` | POST |
| Cancelar DID | `/cancelar_did` | POST |
| Configurar Siga-me (SIP) | `/configurar_siga_me` | POST |
| Desconfigurar Siga-me | `/desconfigurar_siga_me` | POST |
| WhatsApp configurar | `/whatsapp_configurar` | POST |
| Logs de chamadas | `/get_dids_cdrs` | GET |
| Billing: criar plano | `/criar_plano` | POST |
| Billing: criar cliente | `/criar_cliente` | POST |
| Billing: vincular DID+plano+cliente | `/montar_cliente_plano_dids` | POST |
| Billing: listar clientes | `/listar_clientes` | GET |
| Billing: listar planos | `/listar_planos` | GET |

### Arquivos a criar

#### 1. Secret: `BRDID_API_TOKEN`
Armazenar o token fornecido como secret do Supabase para uso na edge function.

#### 2. Edge Function: `supabase/functions/brdid-api/index.ts`
Proxy seguro que recebe requisicoes do frontend e chama a API BR DID com o token. Suporta todas as acoes via um campo `action` no body JSON.

```text
Frontend -> Edge Function (com auth do usuario)
Edge Function -> BR DID API (com TOKEN secreto)
```

Acoes suportadas:
- `buscar_localidades` - lista areas disponiveis
- `buscar_numeros` - busca DIDs por area local
- `consultar_did` - consulta dados de um DID
- `adquirir_did` - contrata um DID
- `cancelar_did` - cancela um DID
- `configurar_sip` - configura siga-me
- `desconfigurar_sip` - remove siga-me
- `whatsapp_configurar` - configura webhook WhatsApp
- `get_cdrs` - busca logs de chamadas
- `criar_plano` - cria plano billing
- `criar_cliente` - cria cliente billing
- `montar_cliente_plano_dids` - vincula DID+plano+cliente
- `listar_clientes` - lista clientes billing
- `listar_planos` - lista planos billing

#### 3. Modulo frontend: `src/modules/meu-numero/`

Estrutura:
```text
src/modules/meu-numero/
  index.ts              - Export principal
  MeuNumeroModule.tsx   - Componente principal com tabs
  types.ts              - Tipos TypeScript
  hooks/
    useBrDid.ts         - Hook para chamadas a edge function
  views/
    BuscarNumerosView.tsx   - Busca + lista de numeros disponiveis
    MeusNumerosView.tsx     - DIDs contratados + consulta + cancelamento
    ConfiguracaoSipView.tsx - Configurar/desconfigurar siga-me
    WhatsAppView.tsx        - Integracao WhatsApp
    BillingView.tsx         - Planos, clientes, vinculacao
    LogsChamadasView.tsx    - CDRs / historico de chamadas
```

#### 4. Tabela Supabase: `user_dids`
Para rastrear quais DIDs cada usuario contratou:
- id, user_id, numero, cn, area_local, status, sip_config, whatsapp_configured, created_at, updated_at

#### 5. Integracao no sistema existente

| Arquivo | Mudanca |
|---|---|
| `src/components/Navigation.tsx` | Adicionar item "Meu Numero" com icone Phone e permissionKey `can_access_meu_numero` |
| `src/pages/Index.tsx` | Adicionar case "meu-numero" renderizando MeuNumeroModule |
| `src/components/UsersList.tsx` | Adicionar permissao `can_access_meu_numero` no PERMISSION_MODULES |
| `supabase/config.toml` | Adicionar `[functions.brdid-api]` com verify_jwt = false |

### Interface do modulo

O modulo tera 6 abas (tabs):

1. **Buscar Numeros** - Selecionar localidade (DDD), ver numeros disponiveis com valores (mensal + instalacao), botao "Contratar" para cada numero
2. **Meus Numeros** - Lista de DIDs contratados, consulta de status, botao de cancelamento com confirmacao
3. **Configuracao SIP** - Formulario para configurar siga-me (numero de destino) ou desconfigurar
4. **WhatsApp** - Configurar webhook para receber codigo de verificacao do WhatsApp Business
5. **Billing** - Criar planos, criar clientes, vincular DIDs a clientes+planos, listar planos e clientes
6. **Logs de Chamadas** - Selecionar DID + periodo (mes/ano), visualizar CDRs em tabela

### Detalhes tecnicos

**Hook `useBrDid`**: centraliza todas as chamadas via `supabase.functions.invoke('brdid-api', { body: { action, params } })`. Retorna funcoes tipadas para cada operacao + estados de loading/error.

**Edge Function**: recebe `{ action: string, params: Record<string, any> }`, monta a URL com query params conforme a API BR DID, faz fetch e retorna o resultado. Todas as chamadas usam `https://brdid.com.br/br-did/api/public/{endpoint}?TOKEN=...&param1=...`.

**Modelo Did** (da API):
```text
CODIGO: number
VALOR_MENSAL: number
VALOR_INSTALACAO: number
CN: number
NUMERO: string
GOLD: boolean
SUPER_GOLD: boolean
DIAMANTE: boolean
```

**Resposta de contratacao** (retorno):
```text
STATUS: string
USUARIO: number (SIP user)
SENHA: string (SIP password)
DOMINIO: string (SIP domain)
```

**Tabela `user_dids`**: armazena os dados de retorno da contratacao (usuario SIP, senha, dominio) para que o usuario possa consultar suas credenciais SIP a qualquer momento.

### Sequencia de implementacao

1. Adicionar secret `BRDID_API_TOKEN`
2. Criar migration para tabela `user_dids` com RLS
3. Criar edge function `brdid-api`
4. Criar modulo frontend completo
5. Integrar no Navigation, Index e UsersList

