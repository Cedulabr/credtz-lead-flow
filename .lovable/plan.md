

## Auto-refresh da minutagem no Activate Leads (Lista + Pipeline)

### Problema

A minutagem "Tratado há Xmin" ja existe no codigo (tanto na lista quanto nos cards do Kanban), mas o valor e calculado apenas no momento da renderizacao e nao atualiza automaticamente. Apos alguns minutos na tela, os tempos ficam desatualizados ate que o usuario force um reload.

### Solucao

**1. Adicionar timer de 60s no `ActivatePipelineView.tsx`**

Criar um state `tick` com `setInterval` de 60 segundos que forca re-render dos cards, atualizando automaticamente os tempos exibidos.

```typescript
const [tick, setTick] = useState(0);
useEffect(() => {
  const interval = setInterval(() => setTick(t => t + 1), 60000);
  return () => clearInterval(interval);
}, []);
```

**2. Adicionar timer de 60s no `ActivateLeads.tsx` (lista)**

Mesmo mecanismo na view de lista para que a coluna "Ultima Atividade" tambem atualize a cada minuto.

**3. Garantir visibilidade sempre**

Verificar que a linha "Tratado ha Xmin" nos cards do Kanban e exibida incondicionalmente (sem depender de `showWorkedTime`) — ja esta assim no codigo atual.

### Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| `src/modules/activate-leads/views/ActivatePipelineView.tsx` | Adicionar `useState`/`setInterval` de 60s |
| `src/components/ActivateLeads.tsx` | Adicionar `useState`/`setInterval` de 60s |

### Resultado

Os tempos "Tratado ha 5min", "Tratado ha 1h 23min" etc. atualizam automaticamente a cada minuto sem necessidade de reload, tanto na lista quanto no pipeline.

