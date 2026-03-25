

## AutoLead — Layout Responsivo Desktop + TAG com Destaque

### Problemas Identificados

1. **TAG não aparece para gestor/usuário**: A query de tags busca na `leads_database` com filtro `is_available = true`. A RLS permite SELECT para todos quando `is_available = true`, mas falhas silenciosas podem esconder os resultados. Falta tratamento de erro e fallback.

2. **Layout ruim no desktop**: O módulo inteiro usa `max-w-lg mx-auto` (512px max) — projetado para mobile. No desktop (1791px), fica um bloco estreito centralizado. O wizard usa `Sheet side="bottom"` que é adequado para mobile mas estranho no desktop.

3. **TAG sem destaque**: A seção TAG está abaixo do scroll, separada apenas por um `border-t` fino, facilmente ignorada.

### Mudanças

| Arquivo | Ação |
|---|---|
| `AutoLeadWizard.tsx` | No desktop, usar `Dialog` em vez de `Sheet bottom`; grid 2 colunas para DDD; TAG com visual destacado (borda colorida, header com icone); adicionar error handling na query de tags |
| `AutoLeadHome.tsx` | Layout responsivo: no desktop usar grid 2 colunas (créditos + SMS à esquerda, job ativo + histórico à direita); remover `max-w-lg` no desktop |
| `AutoLeadModule.tsx` | Ajustar container para largura responsiva |

### Detalhes Técnicos

**1. Wizard — Dialog no Desktop, Sheet no Mobile**

Usar `useIsMobile()` para alternar entre:
- Mobile: `Sheet side="bottom"` (mantém comportamento atual)
- Desktop: `Dialog` com largura `max-w-2xl`, conteúdo com mais espaço

```typescript
const isMobile = useIsMobile();
// Mobile: Sheet side="bottom"
// Desktop: Dialog com max-w-2xl
```

**2. Step 1 (DDD + TAG) — Layout Melhorado**

- DDD grid: `grid-cols-5` no mobile, `grid-cols-10` no desktop (mostra todos de uma vez)
- TAG section: visual destacado com borda primária, header com icone de estrela, background sutil, label "Importante" em badge
- TAG cards: `grid-cols-2` no mobile, `grid-cols-3` no desktop
- Mover TAG para CIMA do DDD (prioridade visual) ou adicionar destaque visual forte

```text
Desktop Step 1 Layout:
┌──────────────────────────────────────┐
│ ⭐ Selecione a TAG do lead           │
│    (IMPORTANTE para segmentação)     │
│ ┌──────┐ ┌──────┐ ┌──────┐          │
│ │ INSS │ │Serv. │ │ FGTS │          │
│ └──────┘ └──────┘ └──────┘          │
│ ┌──────┐ ┌──────┐ ┌──────┐          │
│ │Cartão│ │Refin.│ │Todos │          │
│ └──────┘ └──────┘ └──────┘          │
├──────────────────────────────────────┤
│ DDD dos clientes (opcional)          │
│ [11][12][13]...[99]  (grid amplo)   │
└──────────────────────────────────────┘
```

**3. AutoLeadHome — Desktop Layout**

```text
Desktop Layout (>768px):
┌─────────────────┬──────────────────┐
│  ⚡ AutoLead     │                  │
│  Créditos: 150  │  Job Ativo       │
│  [Iniciar]      │  50/100 enviados │
│                 │  [Pausar][Detalhe]│
│  ⚠️ SMS Upsell  │                  │
│                 │  Histórico       │
│                 │  - Job 1         │
│                 │  - Job 2         │
└─────────────────┴──────────────────┘
```

Mudar de `max-w-lg mx-auto` para `max-w-5xl mx-auto` com grid responsivo.

**4. Error handling na query de tags**

Adicionar `try/catch` e log na busca de tags para diagnosticar se RLS está bloqueando para gestores/usuários. Garantir que `TIPOS_LEAD` sempre aparece independente da query de `availableTags`.

**5. TAG section com destaque visual**

- Borda `border-primary` no container
- Background `bg-primary/5`
- Header com icone de estrela + badge "Importante"
- Cards maiores com padding adequado
- Posição acima do DDD (inversão da ordem atual)

