

## Plano: Padronizar API WhatsApp + Limpar Activate Leads

### Problema 1: ERR_INTERNAL_ERROR no envio via API

Os logs mostram que o Ticketz retorna `500 ERR_INTERNAL_ERROR` ao enviar para o numero `5571992858184`. A edge function esta funcionando corretamente -- o erro vem da API externa. As causas provaveis sao:

- A instancia WhatsApp nao esta conectada/escaneada no painel Easyn
- O numero de destino precisa incluir o 9o digito ou esta em formato incorreto
- O token esta associado a uma conexao inativa

**Acao**: Melhorar o tratamento de erro na edge function para retornar mensagens mais claras e **nao retornar status 500** quando o erro vem da API externa (usar status 502 Bad Gateway). Tambem adicionar logs mais detalhados do request enviado para facilitar debug.

### Problema 2: Botao API WhatsApp inconsistente nos 3 modulos

Atualmente cada modulo tem estilo diferente para o botao. Vamos padronizar todos com:
- **Cor verde** (bg-green-600 ou variante)
- **Texto "API WhatsApp"** visivel
- **Icone Send** (consistente)

| Modulo | Arquivo | Estado Atual | Acao |
|---|---|---|---|
| Activate Leads | `ActivateLeads.tsx` | Icone ghost sem texto | Mudar para botao verde com texto "API WhatsApp" |
| Leads Premium | `LeadListItem.tsx` | Ghost com texto hidden em mobile | Mudar para botao verde com texto visivel |
| Meus Clientes | `MyClientsList.tsx` | Icone ghost sem texto | Mudar para botao verde com texto "API WhatsApp" |

### Problema 3: Activate Leads com poluicao visual

A tabela atual tem 10 colunas: Checkbox, Nome, Telefone, CPF, Origem, Status, Simulacao, Atribuido, Proxima Acao, Acoes (com 6+ botoes inline).

**Nova estrutura da tabela** (colunas visiveis):

| Coluna | Conteudo |
|---|---|
| Nome | Nome do lead (com avatar) |
| CPF | CPF formatado + botao editar inline |
| Simulacao | Botao solicitar simulacao (componente existente) |
| API WhatsApp | Botao verde padrao |
| Acoes | DropdownMenu com: Ligar, WhatsApp web, Historico, Segunda tentativa, Contato futuro, Atribuir, Alterar status |

As colunas removidas da tabela (Telefone, Origem, Status, Atribuido, Proxima Acao, select de status) serao acessiveis pelo menu "Acoes" ou pelo modal de historico/detalhes.

Para gestores/admin, o checkbox de selecao em massa permanece.

### Detalhes Tecnicos

#### 1. Edge Function `send-whatsapp/index.ts`
- Mudar o status de resposta de `500` para `502` quando o erro vem do Ticketz (linhas 199-207)
- Adicionar log do body enviado ao Ticketz para debug
- Mensagem de erro mais clara: incluir o numero normalizado na resposta para o usuario verificar

#### 2. `src/components/ActivateLeads.tsx`
- Reduzir colunas da tabela para: Nome, CPF, Simulacao, API WhatsApp, Acoes
- Criar um `DropdownMenu` na coluna Acoes contendo todas as funcionalidades movidas
- Botao API WhatsApp: `className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3 gap-1"`
- Manter o checkbox de selecao em massa (condicional a `canAssignLead`)

#### 3. `src/modules/leads-premium/components/LeadListItem.tsx`
- Alterar botao "API WhatsApp" (linhas 132-141) para usar estilo verde consistente
- Tornar o texto "API WhatsApp" sempre visivel (remover `hidden sm:inline`)

#### 4. `src/components/MyClientsList.tsx`
- Desktop (linha 1501-1509): Substituir icone ghost por botao verde com texto "API WhatsApp"
- Mobile (linha 1726-1728): Mesmo padrao verde

#### 5. Arquivos a modificar

| Arquivo | Tipo de mudanca |
|---|---|
| `supabase/functions/send-whatsapp/index.ts` | Melhorar erro e logs |
| `src/components/ActivateLeads.tsx` | Redesign tabela + botao verde |
| `src/modules/leads-premium/components/LeadListItem.tsx` | Padronizar botao verde |
| `src/components/MyClientsList.tsx` | Padronizar botao verde |

