

## Adicionar botão "Importar Leads" no módulo Leads Premium (admin)

O botão de importação existe (`ImportBase`) e já suporta **INSS / SIAPE / Convênios livres** (formato Padrão) e **Base Governo (BA)** com todos os campos novos (matrícula, banco, margem, valor de parcela, ADE, etc.). O problema é que ele está renderizado apenas no módulo legado `LeadsManagement.tsx` — o novo `LeadsPremiumModule.tsx` (que você está usando) **não expõe esse botão**.

### O que será feito

**1. `src/modules/leads-premium/LeadsPremiumModule.tsx` (Desktop)**
- Adicionar estado `showImportBase`.
- No header desktop, ao lado do botão "Pedir Leads", incluir botão **"Importar Leads"** (ícone Upload), visível somente para `profile?.role === 'admin'`.
- Quando ativo, renderizar `<ImportBase onBack={() => setShowImportBase(false)} />` em tela cheia (mesmo padrão do `LeadsManagement`), substituindo a view atual.

**2. `src/modules/leads-premium/LeadsPremiumModule.tsx` (Mobile)**
- Adicionar o mesmo botão **"Importar"** no header mobile (apenas admin), ao lado do badge de simulações pendentes.
- Ao tocar, abre a mesma tela `ImportBase`.

**3. `src/modules/leads-premium/components/MobileActionBar.tsx`**
- Adicionar um quarto botão de ícone (Upload) na barra inferior mobile, visível apenas para admin, que aciona `onOpenImport`.
- Aceitar nova prop opcional `onOpenImport?: () => void` e `isAdmin: boolean`.

**4. Reforço visual no seletor de formato dentro do `ImportBase`**
- Atualmente o seletor mostra apenas "Padrão" e "Governo". Vou expandir os textos auxiliares para deixar claro que **Padrão atende INSS e SIAPE** (e qualquer outro convênio digitado na coluna "Convênio" do CSV), enquanto **Governo** atende a base do servidor público (BA) com os campos completos (matrícula, banco, margem, valor de parcela).
- Atualizar o template de download (`downloadTemplate`) com exemplos rotulados INSS / SIAPE.

### Resultado
- No **Leads Premium**, admin verá **"Importar Leads"** no header (desktop) e no menu mobile.
- A tela de importação suporta: **INSS, SIAPE e qualquer convênio** (formato Padrão) + **Governo BA** (formato Governo, com banco, valor de parcela, margem disponível e demais campos já mapeados na migration anterior).
- Após importar, os leads ficam disponíveis no `request_leads_with_credits` com os filtros de banco, parcela mín/máx e margem mínima já implementados no wizard "Pedir Leads".

### Permissão
- Visível apenas para usuários com `profile.role === 'admin'` (mesma regra do módulo legado).

