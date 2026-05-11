## Problema

Em **Revisar Ajustes → Pendências do mês**, ao clicar em "Lançar ajuste" (individual ou em lote) para uma pendência do tipo **Ajuste parcial**, o registro é gravado em `time_clock_adjustment_requests` com `adjustment_type = 'other'` e `status = 'approved'`.

A trigger do banco (`tg_apply_adjustment_request`) só aplica mudanças em `time_clock` quando o tipo é `add_entry|add_exit|add_break_start|add_break_end|edit_*|remove_record`. Para `other` ela retorna sem inserir nada — por isso o **Meu Histórico** continua mostrando o dia incompleto, mesmo aparecendo "Aprovada" em "Todas".

A imagem confirma: várias linhas "Jamily Silva · Outro 29/04/2026 — Ajuste parcial" foram aprovadas, mas o ponto da Jamile não foi alterado.

## O que vou alterar

Arquivo único: `src/components/TimeClock/AdjustmentReview.tsx`.

### 1. Detecção do tipo sugerido (`loadPendings`)
Quando o problema é `parcial`, inferir uma ação concreta a partir das batidas existentes em vez de cair em `'other'`:
- Falta `entrada` → `add_entry` (horário da escala).
- Falta `saida` → `add_exit` (horário da escala).
- `pausa_inicio` sem par → `add_break_end` (`lunch_end` da escala ou `+1h` da pausa).
- `pausa_fim` sem par → `add_break_start` (`lunch_start` ou `−1h` do retorno).
- Caso ainda não seja classificável, marcar `suggestedType = 'other'` e **bloquear** a linha de ações em lote, exigindo abrir o modal individual e escolher o tipo.

### 2. Bloqueio defensivo no envio
- `submitBulk`: filtrar fora linhas com `suggestedType === 'other'` e mostrar aviso ("Selecione manualmente o tipo destas pendências").
- `openCreateFromPending`: se vier `'other'`, abrir o modal já pré-preenchido mas com `newType` vazio para forçar o gestor a escolher (`add_entry`, `add_exit`, etc.).

### 3. Recuperação dos ajustes "Outro" já aprovados
Adicionar um botão discreto **"Reaplicar ajuste"** nas linhas da aba **Todas** quando `adjustment_type = 'other'` e `status = 'approved'`. Ele:
1. Abre o modal de criação com os dados pré-preenchidos (data, colaborador, motivo).
2. Pede ao gestor o tipo correto + horário.
3. Cria um novo registro com o tipo correto (a trigger aplica em `time_clock`) e marca o antigo como `cancelled` via UPDATE em `time_clock_adjustment_requests`.

Isso resolve as 4 pendências antigas da Jamily mostradas na tela sem mexer no banco manualmente.

### 4. Refresh cruzado
Após `submitBulk`, `submitCreate` e `decide`, disparar um evento global (`window.dispatchEvent(new CustomEvent('time-clock:refresh'))`). Em `MyHistory.tsx` adiciono um listener que chama `loadHistory()` para garantir que a tela do colaborador atualize sem precisar trocar de aba.

## Detalhes técnicos

- A trigger `tg_apply_adjustment_request` e a função `recalc_user_day` permanecem inalteradas — o bug está 100% no front, que escolhia um `adjustment_type` que a trigger ignora.
- Nenhuma migration nova é necessária.
- Sem mudança em RLS, lógica de negócio de cálculo, ou em outros módulos.

## Fora do escopo

- Não vou tocar em backend/SQL.
- Não vou re-arquitetar o fluxo de aprovação (continua auto-aprovado para gestor/admin).
- Não vou alterar `Meu Histórico` além do listener de refresh.
