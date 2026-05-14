## Renomear "PortFlow" → "Digitação Agibank" e criar módulo do zero

Substituir o item de menu PortFlow por **Digitação Agibank** (rota `/digitacao-agibank`) com um módulo novo de simulação + cadastro de proposta para o Agibank Easyn.

### 1. Sidebar / navegação
**`src/components/layout/SidebarNav.tsx`**
- Trocar o item `{ id: "portflow", label: "PortFlow", icon: GitBranch, ... }` por:
  `{ id: "digitacao-agibank", label: "Digitação Agibank", icon: Keyboard, permissionKey: "can_access_portflow" }` (mantém a chave de permissão existente para não exigir migração de perfis).

**`src/pages/Index.tsx` / `src/components/LazyComponents.tsx`**
- Renomear o caso `portflow` para `digitacao-agibank` e apontar para a nova página `DigitacaoAgibank`.
- Adicionar rota `/digitacao-agibank` (mantendo `/portflow` como redirect opcional para não quebrar links salvos).

### 2. Página nova `src/pages/DigitacaoAgibank.tsx`
Header com ícone `Keyboard` (ti-keyboard), título "Digitação Agibank", subtítulo "Empréstimos Consignado".

Estado interno `view`: `"home" | "simular" | "digitar"`.

**Home:** dois cards lado a lado.
- "Simular" (Calculator, accent azul) → `view = "simular"`
- "Digitar" (Pencil, accent verde) → `view = "digitar"`

**Simular (step 1 de 2):** indicador de passos, card "Simular contrato novo":
- Input parcela (máscara BRL, usa `CurrencyInput` existente)
- Toggle de prazo (108 / 96 / 84)
- Box azul com troco calculado em tempo real (label, valor grande, sub-linha bruto/IOF)
- Botões: "Digitar essa proposta" (verde, leva parcela+prazo para step 2) e "Voltar" (ghost)

**Digitar (step 2):** indicador de passos com step 1 marcado, banner amarelo de aviso sobre benefício desbloqueado, e três cards:
1. **Dados do cliente:** CPF (máscara `000.000.000-00`), nome, telefone (máscara `(00) 00000-0000`). Sem nenhum campo de SMS/WhatsApp.
2. **Qual produto o cliente quer?:** três botões toggle (Novo empréstimo / Refinanciamento / Portabilidade). Quando "Novo empréstimo" estiver selecionado, exibir chip azul "Banco: Agibank Easyn" (Building2 icon). Abaixo, sempre: parcela (BRL) e select de prazo (108/96/84, default 84). Box verde com troco recalculado ao vivo.
3. **Documentação do cliente:** três zonas drag-and-drop (aceitam imagem e PDF):
   - "RG — frente" — pill vermelho "Obrigatório"
   - "RG — verso" — pill vermelho "Obrigatório"
   - "Extrato bancário" — pill verde "Opcional"
   Cada zona mostra nome do arquivo e botão X após upload.

Botões finais: "Enviar proposta" (azul, ícone Send) e "Cancelar" (ghost → home).

Validação inline: bloqueia envio se RG frente/verso ausentes ou campos obrigatórios vazios. Após sucesso → toast `"Proposta enviada com sucesso! Aguarde análise."` e volta para a home do módulo.

### 3. Lib `src/lib/calcularTroco.ts`
Função pura `calcularTroco({ parcela, prazo })` retornando `{ valorBruto, iofEstimado, troco }`:
```
taxa = 0.0185
fator = (taxa*(1+taxa)^prazo) / ((1+taxa)^prazo - 1)
valorBruto = parcela / fator
dias = prazo * 30
iof = valorBruto * (min(0.000082*dias, 0.03) + 0.0038)
troco = valorBruto - iof
```
Tratar `parcela <= 0` retornando zeros. Reutilizada por home-Simular e Digitar.

### 4. Banco de dados (Supabase)
Migration nova: tabela `public.digitacao_agibank_propostas` com as colunas pedidas (`cpf`, `nome_cliente`, `telefone`, `produto`, `banco`, `parcela`, `prazo` int2, `troco_calculado`, `valor_bruto`, `iof_estimado`, `rg_frente_url`, `rg_verso_url`, `extrato_url` nullable, `status` default `'pendente'`, `user_id`, `created_at`).

CHECK constraints:
- `produto IN ('novo_emprestimo','refinanciamento','portabilidade')`
- `prazo IN (84,96,108)`

RLS habilitada com política: `auth.uid() = user_id` para SELECT e INSERT (usuário só vê/insere as próprias propostas).

Bucket de Storage `digitacao-documentos` (privado), com policies de INSERT/SELECT restritas a `(storage.foldername(name))[1] = auth.uid()::text`. Path: `{user_id}/{cpf}/{filename}`.

### 5. Restrições estritas
- Nenhum campo, toggle ou opção de SMS / WhatsApp / notificação de cliente em qualquer parte do módulo.
- Todos os textos visíveis em PT-BR; identificadores, arquivos e nomes de função em inglês.

### Detalhes técnicos
- Reaproveita `CurrencyInput` de `src/modules/sales-wizard/components/CurrencyInput.tsx` para os inputs de parcela.
- Usa `supabase.storage.from("digitacao-documentos").upload(...)` + `getPublicUrl` (ou signed URL) e grava o path retornado nas colunas `*_url`.
- Toda a chamada ao banco passa por `supabase` client com `user_id = auth.user.id` (obtido via `useAuth`).
- O permissionKey `can_access_portflow` é mantido para não obrigar mudança no schema de profiles. Se quiser renomear depois, fica como follow-up.

### Fora de escopo
- Remover/renomear a coluna `can_access_portflow` em `profiles`.
- Aproveitar/migrar dados antigos do PortFlow (módulo será desligado).
- Integração externa de envio da proposta para o Agibank (apenas grava no Supabase).
