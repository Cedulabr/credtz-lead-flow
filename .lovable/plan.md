
# Plano: Melhorias no Modulo "Meus Clientes"

## Resumo das Alteracoes

Este plano detalha tres melhorias para o modulo "Meus Clientes":

1. **Novo Status "Aguardando Retorno"** - Adicionar status para clientes que estao aguardando resposta
2. **Fluxo de Exclusao com Aprovacao** - Colaboradores solicitam exclusao, gestores aprovam/rejeitam
3. **Filtro por Data de Cadastro** - Exibir data de cadastro e permitir busca por calendario

---

## Detalhamento Tecnico

### 1. Novo Status "Aguardando Retorno"

**Arquivo:** `src/components/MyClientsList.tsx`

Adicionar novo status na configuracao `clientStatuses` (linha ~118):

```typescript
{
  id: "aguardando_retorno",
  label: "Aguardando Retorno",
  icon: Clock,
  color: "from-orange-500 to-orange-600",
  textColor: "text-orange-700",
  bgColor: "bg-gradient-to-r from-orange-50 to-orange-100",
  borderColor: "border-orange-200",
  dotColor: "bg-orange-500"
}
```

O status ficara entre "Proposta Enviada" e "Proposta Digitada" na ordem visual.

---

### 2. Fluxo de Exclusao com Aprovacao

**Mudancas no Banco de Dados:**

Adicionar novas colunas na tabela `propostas`:
- `deletion_requested` (boolean) - Indica se a exclusao foi solicitada
- `deletion_requested_by` (uuid) - ID do usuario que solicitou
- `deletion_requested_at` (timestamp) - Data/hora da solicitacao
- `deletion_reason` (text) - Motivo da solicitacao

Criar nova tabela `client_deletion_requests`:
```sql
CREATE TABLE client_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id integer REFERENCES propostas(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id),
  requested_at timestamptz DEFAULT now(),
  reason text,
  status text DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  company_id uuid REFERENCES companies(id)
);
```

**Mudancas no Frontend:**

1. **Para Colaboradores:**
   - Substituir botao "Excluir" por "Solicitar Exclusao"
   - Exibir modal com campo de motivo da exclusao
   - Mostrar badge indicando que exclusao foi solicitada
   - Desabilitar edicoes enquanto aguarda aprovacao

2. **Para Gestores/Admin:**
   - Manter botao "Excluir" atual para exclusao direta
   - Adicionar secao "Solicitacoes de Exclusao" no topo da pagina
   - Mostrar lista de solicitacoes pendentes da empresa
   - Botoes "Aprovar" e "Rejeitar" com campo opcional de observacoes

3. **Interface de Aprovacao (Gestor):**
   - Card destacado mostrando solicitacoes pendentes
   - Detalhes do cliente e motivo da solicitacao
   - Botoes de acao com confirmacao

**Fluxo:**
```
Colaborador -> Clica "Solicitar Exclusao"
     |
     v
Modal -> Preenche motivo -> Confirma
     |
     v
Registro criado em client_deletion_requests
     |
     v
Gestor ve notificacao/lista de pendencias
     |
     v
Gestor Aprova -> Cliente excluido
     ou
Gestor Rejeita -> Cliente permanece, colaborador notificado
```

---

### 3. Filtro por Data de Cadastro

**Mudancas na Interface:**

1. **Exibir data de cadastro na tabela:**
   - Adicionar nova coluna "Cadastrado em" na tabela desktop
   - Mostrar data formatada (DD/MM/YYYY)

2. **Adicionar filtro por data com calendario:**
   - Substituir campos de data simples por DatePicker com calendario
   - Usar componente Popover + Calendar do Shadcn
   - Campos "Data Inicial" e "Data Final"
   - Botao para limpar filtro de data

**Mudancas no codigo:**

Adicionar imports necessarios:
```typescript
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
```

Converter states de string para Date:
```typescript
const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
```

Renderizar DatePicker:
```typescript
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-full justify-start">
      <CalendarIcon className="mr-2 h-4 w-4" />
      {filterDateFrom ? format(filterDateFrom, "dd/MM/yyyy") : "Data inicial"}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    <Calendar
      mode="single"
      selected={filterDateFrom}
      onSelect={setFilterDateFrom}
      locale={ptBR}
      className="pointer-events-auto"
    />
  </PopoverContent>
</Popover>
```

---

## Arquivos a Serem Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/MyClientsList.tsx` | Status, filtros, exclusao |
| `src/components/MyClientsKanban.tsx` | Status (se necessario manter sincronizado) |
| Migracao SQL | Nova tabela e colunas |

---

## Ordem de Implementacao

1. **Migracao de Banco de Dados**
   - Criar tabela `client_deletion_requests`
   - Adicionar colunas na `propostas`
   - Configurar RLS policies

2. **Adicionar Status "Aguardando Retorno"**
   - Atualizar configuracao de status
   - Testar mudanca de status

3. **Implementar Fluxo de Exclusao**
   - Logica para colaboradores (solicitar)
   - Logica para gestores (aprovar/rejeitar)
   - Interface de listagem de solicitacoes

4. **Adicionar Filtro por Data com Calendario**
   - Exibir coluna de data de cadastro
   - Implementar DatePicker
   - Testar filtragem

---

## Consideracoes de Seguranca

- RLS na nova tabela `client_deletion_requests`:
  - Colaboradores podem criar e ver suas proprias solicitacoes
  - Gestores podem ver e atualizar solicitacoes da sua empresa
  - Admins podem ver e atualizar todas

- Validacao no backend:
  - Apenas gestores/admins podem aprovar exclusoes
  - Registrar historico de todas as acoes em `client_interactions`
