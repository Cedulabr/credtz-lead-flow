
# Plano: Correção do Fluxo de Status no Módulo Televendas

## Problemas Identificados

### 1. Erro Crítico no LEGACY_STATUS_MAP
O mapeamento `"cancelado_aguardando": "proposta_cancelada"` está **convertendo automaticamente** todas as solicitações de cancelamento em propostas canceladas, impedindo o fluxo de aprovação.

```typescript
// ERRO: Esta linha está transformando solicitar cancelamento em cancelado direto!
"cancelado_aguardando": "proposta_cancelada", // ❌ REMOVER
```

### 2. Status do Colaborador
Conforme requisitos, o colaborador deve ter acesso a:

| Status | Código | Situação Atual |
|--------|--------|----------------|
| Solicitar Digitação | `solicitar_digitacao` | OK |
| Solicitar Cancelamento | `cancelado_aguardando` | OK (mas LEGACY_MAP quebra) |
| Proposta Digitada | `proposta_digitada` | OK |
| Pago aguardando Gestor | `pago_aguardando` | OK |

**Problema**: `solicitar_exclusao` e `proposta_pendente` estão na lista de operador mas não foram mencionados nos requisitos.

### 3. Status do Gestor
O gestor precisa ter acesso a TODOS os status (colaborador + finais):

| Status | Código | Situação Atual |
|--------|--------|----------------|
| Proposta Cancelada | `proposta_cancelada` | OK |
| Exclusão Aprovada | `exclusao_aprovada` | OK |
| Exclusão Rejeitada | `exclusao_rejeitada` | OK |
| Devolvido para revisão | `devolvido` | OK |
| + Todos do colaborador | * | OK (via ALL_STATUSES) |
| **Proposta Paga** | `proposta_paga` | Falta no menu de ações |

### 4. Filtros não aplicam a propostas antigas
Os filtros de status funcionam, mas propostas antigas podem ter status legados que são mapeados incorretamente.

---

## Correções Necessárias

### 1. Arquivo: `src/modules/televendas/types.ts`

**Remover mapeamento incorreto do LEGACY_STATUS_MAP:**
```typescript
// REMOVER esta linha:
"cancelado_aguardando": "proposta_cancelada",
```

**Ajustar OPERATOR_STATUSES (opcional, baseado em confirmação):**
```typescript
export const OPERATOR_STATUSES = [
  "solicitar_digitacao",    // Solicitar Digitação
  "proposta_digitada",      // Proposta Digitada
  "pago_aguardando",        // Pago Aguardando Gestor
  "cancelado_aguardando",   // Solicitar Cancelamento (Aguardando Gestor)
] as const;
```

**Nota**: Remover `solicitar_exclusao` e `proposta_pendente` se não forem necessários para colaboradores.

### 2. Arquivo: `src/modules/televendas/components/ActionMenu.tsx`

O ActionMenu já usa `ALL_STATUSES` para gestores, então todos os status aparecem. Nenhuma alteração necessária aqui.

### 3. Arquivo: `src/modules/televendas/components/FiltersDrawer.tsx`

O FiltersDrawer já usa `ALL_STATUSES` para gestores. Nenhuma alteração estrutural necessária, mas os filtros funcionarão melhor após corrigir o LEGACY_STATUS_MAP.

### 4. Verificar/Atualizar Status Legados no Banco

Propostas antigas com status legados serão normalizadas corretamente após remover o mapeamento incorreto.

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/modules/televendas/types.ts` | Remover `"cancelado_aguardando": "proposta_cancelada"` do LEGACY_STATUS_MAP |
| `src/modules/televendas/types.ts` | (Opcional) Ajustar OPERATOR_STATUSES conforme requisitos |

---

## Fluxo Correto Após Correção

```text
COLABORADOR                              GESTOR
    │                                       │
    ├─► Solicitar Digitação                 │
    │                                       │
    ├─► Proposta Digitada                   │
    │                                       │
    ├─► Pago Aguardando Gestor ─────────────► Aprovar → Proposta Paga
    │                                       │ Rejeitar → Proposta Cancelada
    │                                       │ Devolver → Devolvido
    │                                       │
    ├─► Solicitar Cancelamento ─────────────► Aprovar → Proposta Cancelada
    │   (cancelado_aguardando)              │ Rejeitar → Devolvido
    │                                       │
    └─► Solicitar Exclusão ─────────────────► Aprovar → Exclusão Aprovada
                                            │ Rejeitar → Exclusão Rejeitada
```

---

## Testes Recomendados

1. Login como colaborador → Verificar que os 4 status aparecem no menu
2. Alterar para "Solicitar Cancelamento" → Verificar que NÃO converte automaticamente para cancelado
3. Login como gestor → Verificar que aparece na aba Aprovações
4. Aprovar/Rejeitar cancelamento → Verificar fluxo completo
5. Aplicar filtros por status em propostas antigas e novas
