

## Correções no módulo Leads Premium

### 1. Botão "Importar Leads" não funciona
**Causa:** o estado `showImportBase` é alternado, mas o componente `<ImportBase />` **nunca é renderizado** no layout desktop e nem no mobile. Falta o early-return condicional.

**Correção em `src/modules/leads-premium/LeadsPremiumModule.tsx`:**
- Adicionar logo no início do `return` (antes do branch mobile/desktop):
  ```tsx
  if (showImportBase && isAdmin) {
    return <ImportBase onBack={() => setShowImportBase(false)} />;
  }
  ```

### 2. Wizard "Pedir Leads" — botões "Próximo/Voltar" inacessíveis
**Causa:** o `DialogContent` usa `max-h-[85vh]` mas em telas menores (≈607px) sobra pouco espaço, e o conteúdo das etapas Tipo/Perfil é alto. A `ScrollArea` interna não tem altura mínima garantida e empurra os botões para fora.

**Correções em `src/modules/leads-premium/components/RequestLeadsWizard/index.tsx`:**
- Aumentar para `max-h-[90vh] h-[90vh]` no `DialogContent` (desktop) — fixa altura, garantindo que `flex-1` na ScrollArea funcione consistentemente.
- Adicionar `min-h-0` na ScrollArea (`<ScrollArea className="flex-1 min-h-0 px-1">`) — fix clássico para flex children que precisam encolher.
- Reduzir o tamanho do indicador de etapas: `h-10 w-10` → `h-8 w-8`, ícone menor; remover/encolher os conectores em mobile.
- Footer (botões Voltar/Próximo) já é `flex-shrink-0`, mas adicionar `sticky bottom-0 bg-background pt-3` para reforço visual.

**Correções em `StepTipoLead.tsx`:**
- Reduzir padding dos cards: `p-4` → `p-3`, ícone `text-3xl` → `text-2xl`, descrição em `text-xs`. Os 5 cards passam a caber sem rolagem em telas médias.

**Correções em `StepPerfil.tsx`:**
- Promover os filtros avançados (banco, parcela, margem) para visíveis por padrão **quando `data.tipoLead === 'servidor'` ou `'governo'`** (deixar colapsado para INSS/SIAPE/FGTS, onde não fazem sentido).
- Compactar espaçamentos: `space-y-6` → `space-y-4`, `h-11` selects → `h-10`.

### 3. Filtro de Estado (UF) ao escolher "Servidor Público"
Hoje há apenas DDDs. Quando o usuário seleciona "Servidor Público" no passo Tipo, mostrar um **seletor de Estado (UF)** logo no início do StepPerfil, que automaticamente seleciona todos os DDDs daquela UF.

**Implementação:**
- Adicionar mapa estático `UF_TO_DDDS` (ex.: BA → ['71','73','74','75','77'], SP → ['11','12','13','14','15','16','17','18','19'], etc.) em `types.ts`.
- Adicionar campo `uf: string | null` em `LeadRequestData`.
- Em `StepPerfil.tsx`, renderizar um `<Select>` "Estado (UF)" **somente se `tipoLead === 'servidor'`**. Ao escolher uma UF, atualizar `data.ddds` automaticamente com os DDDs da UF e marcar `data.uf`.
- Manter o grid de DDDs abaixo, agora pré-preenchido — o usuário pode refinar manualmente.

### 4. Resumo dos arquivos editados
- `src/modules/leads-premium/LeadsPremiumModule.tsx` — early-return para `ImportBase`.
- `src/modules/leads-premium/components/RequestLeadsWizard/index.tsx` — altura do dialog, `min-h-0`, footer sticky, indicador menor.
- `src/modules/leads-premium/components/RequestLeadsWizard/StepTipoLead.tsx` — cards mais compactos.
- `src/modules/leads-premium/components/RequestLeadsWizard/StepPerfil.tsx` — filtros avançados expandidos para servidor/governo, novo seletor UF.
- `src/modules/leads-premium/components/RequestLeadsWizard/types.ts` — campo `uf`, mapa `UF_TO_DDDS`.

### Resultado esperado
- Admin clica "Importar Leads" → tela `ImportBase` carrega corretamente (Padrão para INSS/SIAPE, Governo BA com todos os campos).
- Wizard "Pedir Leads" cabe em qualquer tela; botão "Próximo" sempre visível.
- Ao escolher "Servidor Público": aparece seletor de **Estado**, e os filtros de **Banco / Faixa de parcela / Margem mínima** ficam visíveis sem precisar expandir nada.

