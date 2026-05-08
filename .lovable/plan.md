# Diagnóstico

Verifiquei o banco de dados:

- A solicitação aprovada de **27/04 às 09:22 (Adicionar entrada)** **não pertence à Alana Rodrigues**. O `user_id` da solicitação (`a8a1af22…`) é do usuário **Cedula BR** (`cedulabr@gmail.com`), e o registro foi inserido corretamente no ponto dele.
- A Alana (`8642cf4a…`) **não tem nenhuma solicitação de ajuste** no mês de 04/2026. Por isso o espelho mensal dela continua mostrando a entrada original (12:51) em 27/04.

A causa raiz é o **fluxo de ajustes**: hoje o formulário `AdjustmentRequest` só permite que o próprio colaborador crie pedidos para si (`user_id = auth.uid()`). Não existe caminho para admin/gestor lançar ajuste em nome de outro colaborador. Quando você abriu a tela e criou o ajuste, ele foi atribuído ao usuário logado (Cedula BR), e foi exatamente esse ponto que mudou — não o da Alana.

O trigger `tg_apply_adjustment_request` e o `recalc_user_day` estão funcionando: registro entra em `time_clock` com `status='ajustado'` e o `time_clock_day_summary` é recalculado. O `TimeClockPDF` (Espelho de Ponto) e o `MyHistory` lêem `time_clock` sem filtro de status, então registros ajustados aparecem normalmente — desde que pertençam ao colaborador correto.

# Plano

## 1. Lançamento administrativo de ajustes

Adicionar em `AdjustmentReview` (aba "Revisão de Ajustes") um botão **"Lançar ajuste"** disponível para `admin` e `gestor`:

- Modal com seleção de **colaborador** (lista filtrada por empresa do gestor / todas para admin), data, tipo (`add_entry`, `add_exit`, `add_break_start`, `add_break_end`, `edit_entry`, `edit_exit`, `edit_break_start`, `edit_break_end`, `remove_record`), horário proposto e motivo.
- Para tipos `edit_*` / `remove_record`, listar batidas existentes do dia para escolher `target_record_id`.
- Insere em `time_clock_adjustment_requests` já com `status='approved'`, `reviewed_by=auth.uid()`, `reviewed_at=now()`, `reason="Lançamento administrativo: <motivo>"`.
- O trigger existente `tg_apply_adjustment_request` cuida da inserção/edição em `time_clock`, do log e do `recalc_user_day`.

## 2. Permissão no banco

Atualizar a policy `adj_insert_*` em `time_clock_adjustment_requests` para permitir `INSERT` quando o autor é admin (`has_role_safe(auth.uid(),'admin')`) ou gestor da mesma empresa do colaborador alvo. Hoje só permite `auth.uid() = user_id`.

## 3. Ajustes manuais já lançados (limpeza)

Os ajustes de 27/04 e 28/04 que ficaram no usuário Cedula BR podem ser:

- Cancelados (status → `cancelled`) e os registros `time_clock` correspondentes removidos manualmente, **ou**
- Mantidos como histórico — fica a critério do usuário.

Após confirmar, posso criar uma migração de limpeza pontual.

## 4. Visibilidade do tipo "ajustado" no espelho mensal

O PDF já lê o campo `status='ajustado'`. Vou exibir uma marca visual ("A" sobrescrito ou cor diferente na coluna Entrada/Saída) para deixar claro que aquela batida é fruto de ajuste — útil para auditoria.

## 5. Verificação

Após implementar:

- Lançar ajuste de teste para Alana (entrada 09:00 em 27/04).
- Conferir `time_clock` (registro novo `status='ajustado'`).
- Conferir `time_clock_day_summary` (recalc com expected/worked corretos).
- Gerar Espelho Mensal de Alana e validar que a batida aparece com a marcação de ajuste.

# Detalhes técnicos

- Arquivo principal: `src/components/TimeClock/AdjustmentReview.tsx` (adicionar dialog "Lançar ajuste").
- Reaproveitar `get_profiles_by_ids` + lista de `user_companies` para listar colaboradores conforme escopo do gestor.
- Migração: novas policies `adj_insert_admin` e `adj_insert_gestor`.
- `TimeClockPDF.tsx`: anotar registros `status='ajustado'` na linha da tabela mensal (asterisco + legenda no rodapé da página).
