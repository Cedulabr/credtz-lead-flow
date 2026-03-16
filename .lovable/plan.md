

## Leads Premium — Fix Mobile Layout e Animações

### Problemas Identificados

1. **Botão "Pedir Leads" cortado no mobile**: O botão de submit está dentro do `ScrollArea`, então em telas pequenas ele fica escondido abaixo do scroll e o usuário não consegue clicar
2. **Grid de DDDs com 5 colunas** é apertado demais em telefones pequenos
3. **Sem animações** — o conteúdo aparece estático, sem destaque visual

### Solução

**`RequestLeadsModal.tsx`** — 3 mudanças:

1. **Botão submit fixo no fundo**: Mover o botão para fora do `ScrollArea`, com `sticky bottom-0` e fundo com gradiente, garantindo que sempre fique visível no mobile
2. **Grid DDD responsivo**: Mudar de `grid-cols-5` para `grid-cols-4 sm:grid-cols-5` no mobile
3. **Animações por seção**: Adicionar `animate-fade-in` com delays escalonados em cada seção (créditos, quantidade, convênio, DDDs, tags) para criar um efeito cascata ao abrir o modal. Destacar o card de créditos com um leve pulse na borda

### Arquivo a Modificar

| Arquivo | Ação |
|---|---|
| `src/modules/leads-premium/components/RequestLeadsModal.tsx` | Botão sticky fora do scroll, grid responsivo, animações fade-in escalonadas |

