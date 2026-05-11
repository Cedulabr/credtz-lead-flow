## Causa raiz

O PDF (espelho de ponto) lê direto da tabela `time_clock` e usa `evaluateDay()`, que marca `Registro Incompleto` quando faltam batidas (entrada sem saída, pausa incompleta, etc.). O problema é que vários ajustes aprovados **nunca chegaram a inserir/atualizar** linhas em `time_clock`. Confirmado em produção (abril/2026):

- **`adjustment_type = 'other'`** → o trigger `tg_apply_adjustment_request` não trata esse tipo, então a aprovação grava só em `time_clock_adjustment_requests` e **não toca em `time_clock`**. Há 4+ pendências da Jamile aprovadas como `other`.
- **`edit_entry` / `edit_exit` / `edit_break_*` com `target_record_id IS NULL`** → o trigger só executa o `UPDATE` quando existe `target_record_id`. Hoje vários ajustes foram aprovados sem alvo (porque a pendência era "faltava entrada", e o frontend marcou como `edit_entry` em vez de `add_entry`). Resultado: nada foi gravado em `time_clock`. Exemplo: usuário `a8a1af22…` em 2026-04-07 e 2026-04-28 — o `edit_entry` 09:00 foi aprovado, mas só existe na tabela de requests; `time_clock` continua sem `entrada` → "Registro Incompleto".

## Correções

### 1. Trigger `tg_apply_adjustment_request` (migration SQL)

Tornar o trigger tolerante aos dois casos acima:

- **Para `edit_*` com `target_record_id` nulo**:
  - tentar localizar uma linha em `time_clock` por `(user_id, clock_date, clock_type)` correspondente e fazer `UPDATE`;
  - se não existir nenhuma linha do tipo, fazer `INSERT` (mesmo caminho do `add_*`), com `notes = 'Ajuste #id (auto-fallback edit→add)'`.
- **Para `other`**:
  - se `proposed_time IS NOT NULL` e o motivo/`notes` indica claramente um tipo (ex.: contém "entrada", "saída", "pausa"), inferir e inserir;
  - caso contrário, **rejeitar a aprovação** lançando `RAISE EXCEPTION` com mensagem clara ("Ajuste tipo Outro precisa ser convertido em add_entry/add_exit/etc antes de aprovar"). Isso impede silêncio e força a UI a converter.

Após criar/aplicar o trigger novo, rodar uma rotina única (no próprio migration) para **reaplicar** todos os requests com `status='approved'` cujo efeito ficou faltando: set status para `pending` e voltar para `approved`, disparando o trigger atualizado, OU executar a lógica do trigger inline para esses registros antigos. Limitado ao período `>= 2026-01-01` para segurança.

### 2. Frontend `AdjustmentReview.tsx` (defensivo)

- No `submitCreate` e `submitBulk`, antes de inserir o request:
  - se `newType` começa com `edit_` e `newTargetId` está vazio, converter automaticamente para o `add_` correspondente (`edit_entry → add_entry`, etc.).
  - se `newType === 'other'`, bloquear o submit com toast pedindo escolha de tipo concreto (já existe parcialmente — reforçar).
- Mesma proteção no fluxo de aprovação (`decide` para `approved`): se o request veio com `edit_*`+target nulo, atualizar o registro para `add_*` antes de marcar como `approved` (assim o trigger novo aplica corretamente).

### 3. Frontend `AdjustmentRequest.tsx` (origem da pendência)

Garantir que o `suggestedType` gerado a partir de uma pendência "faltando entrada/saída/pausa" sempre devolva `add_*` (nunca `edit_*` sem target). Hoje já tende a isso, mas confirmar no `loadPendings` e nas variantes de `parcial`.

### 4. Verificação

Após o fix:
- abrir "Pendências do mês" → aprovar uma pendência teste → conferir que aparece nova linha em `time_clock` com `status='ajustado'`;
- gerar o PDF do mês para o mesmo usuário → o dia deve sair como "Completo / Ajustado", não mais "Registro Incompleto";
- rodar query: `SELECT count(*) FROM time_clock_adjustment_requests r WHERE r.status='approved' AND NOT EXISTS (SELECT 1 FROM time_clock t WHERE t.user_id=r.user_id AND t.clock_date=r.clock_date AND t.notes LIKE '%'||r.id::text||'%') AND r.adjustment_type IN ('add_entry','add_exit','add_break_start','add_break_end');` → deve retornar 0.

## Fora de escopo

- Mudanças em UI de relatórios, layout do PDF, regras de cálculo de horas/banco.
- Mudanças em RLS, autenticação, outros módulos.
