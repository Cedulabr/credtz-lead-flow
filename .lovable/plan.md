

## Correção: Consulta Base OFF - Dados não carregam no front

### Causa Raiz

O erro `"invalid input syntax for type uuid: "undefined""` ocorre em `ClienteDetalheView.tsx` linha 94-98.

A edge function retorna `id: cpf` (string numérica, não UUID). Quando o cliente não tem contratos (array `contratos` vazio), o código entra no `else` (linha 93) e tenta consultar a tabela Supabase `baseoff_contracts` usando `client.id` = CPF — que não é um UUID válido.

**Fluxo do bug:**
```text
Edge Function retorna → { id: "42763541453", contratos: [] }
                              ↓
useOptimizedSearch transforma → client.contratos = []
                              ↓
ClienteDetalheView → hasInlineContracts = false (array vazio)
                              ↓
Fallback: supabase.from('baseoff_contracts').eq('client_id', "42763541453")
                              ↓
ERRO: "invalid input syntax for type uuid"
```

### Correção

**Arquivo:** `src/modules/baseoff/views/ClienteDetalheView.tsx`

Na função `fetchContracts` (linhas 87-108), alterar a lógica para:

1. Se `hasInlineContracts` → usar contratos inline (já funciona)
2. Se o `client.id` **não** é um UUID válido (vem da API externa) → definir contratos como array vazio, sem consultar Supabase
3. Apenas consultar `baseoff_contracts` quando o `client.id` for um UUID real

```typescript
const fetchContracts = useCallback(async () => {
  setIsLoading(true);
  try {
    if (hasInlineContracts) {
      const mapped = inlineContracts!.map((c, i) => inlineToContract(c, client.id, client.cpf, i));
      setContracts(mapped);
    } else {
      // Se o ID não é UUID (vem da API externa), não consultar Supabase
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(client.id)) {
        setContracts([]);
      } else {
        const { data, error } = await supabase
          .from('baseoff_contracts')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setContracts(data || []);
      }
    }
  } catch (error) {
    console.error('Error fetching contracts:', error);
    toast.error('Erro ao carregar contratos');
  } finally {
    setIsLoading(false);
  }
}, [client.id, client.cpf, inlineContracts, hasInlineContracts]);
```

Essa mudança é mínima e cirúrgica — apenas adiciona uma verificação de UUID antes de consultar o Supabase, eliminando o erro sem alterar nenhuma outra funcionalidade.

