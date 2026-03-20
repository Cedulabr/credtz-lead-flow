

## Fix: Botões de Ação e Nomes no Conta Corrente

### Problemas Identificados

1. **Botões não aparecem para comissões com R$ 0,00**: A condição `commission.commission_amount > 0` (linha 912) oculta Editar/Estornar/Apagar quando o valor é zero. Comissões lançadas com valor errado (R$ 0,00) ficam sem botão de edição.

2. **Nomes de usuários vazios**: O `fetchCommissions` consulta `profiles` diretamente (linha 157), que pode ser bloqueado por RLS — mesmo problema já corrigido no `CommissionPayment`. Precisa usar a RPC `get_profiles_by_ids`.

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/components/ContaCorrente.tsx` | Trocar query de profiles por `get_profiles_by_ids` RPC; remover condição `commission_amount > 0` dos botões Editar/Apagar; manter condição de estorno apenas para `status !== 'refunded'` |

### Detalhes

**1. Fix botões de ação**

```typescript
// Antes (linha 912): botões só aparecem se valor > 0
{commission.commission_amount > 0 && ( <> Editar / Apagar / Estornar </> )}

// Depois: botões aparecem para todas exceto estornos
{commission.status !== 'refunded' && ( <> Editar / Apagar / Estornar </> )}
```

- Editar e Apagar: disponíveis para qualquer comissão que não seja estorno
- Estornar: disponível para `paid` ou `pending` com valor > 0
- Marcar como Pago: mantém condição `pending` + valor > 0

**2. Fix nomes de usuários via RPC**

```typescript
// Trocar:
const { data: profilesData } = await supabase.from('profiles').select(...)
// Por:
const { data: profilesData } = await supabase.rpc('get_profiles_by_ids', { user_ids: userIds });
```

Também aplicar fallback `profile.name || profile.email?.split('@')[0]` para garantir que nunca mostre vazio.

