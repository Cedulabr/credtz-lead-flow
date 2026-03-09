
## Diagnóstico

A tabela `time_clock_day_offs` não possui colunas para:
- Horário de início/fim de folga parcial (ex: folga das 14h às 18h)
- Tipo "home_office" 
- Flag se é dia completo ou parcial

## O que será feito

### 1. Migração do banco — adicionar colunas à `time_clock_day_offs`

Novas colunas:
```sql
is_partial_day   BOOLEAN DEFAULT false   -- se é folga parcial (com horário)
start_time       TIME                    -- horário início (null = dia todo)
end_time         TIME                    -- horário fim (null = dia todo)
```

E novo tipo na lista de `off_type`: **`home_office`**

### 2. Atualizar `DayOffManager.tsx`

**Modal:**
- Adicionar tipo `home_office` no `OFF_TYPE_CONFIG` (badge amarelo)
- Adicionar checkbox **"Folga parcial (horário específico)"**
- Quando marcado, exibir campos de **Hora Início** e **Hora Fim** (input `time`)
- Validar que horário início < horário fim

**Tabela de listagem:**
- Nova coluna **"Horário"** mostrando:
  - "Dia todo" se `is_partial_day = false`
  - "14:00 – 18:00" se parcial
- Badge especial para `home_office`

**Payload do INSERT:**
- Incluir `is_partial_day`, `start_time`, `end_time` em todos os inserts (individual e bulk)

### 3. Configuração dos tipos

```text
folga       → Folga (azul)         — suporta dia todo ou horário parcial
feriado     → Feriado (verde)      — sempre dia todo
licenca     → Licença (roxo)       — sempre dia todo  
ferias      → Férias (laranja)     — sempre dia todo
abono       → Abono (cinza)        — suporta parcial
home_office → Home Office (amarelo) — suporta parcial
```

Tipos com dia todo obrigatório (`feriado`, `licenca`, `ferias`) ocultam automaticamente o checkbox de folga parcial.

### Arquivos a modificar
- **Migração SQL** — adicionar colunas `is_partial_day`, `start_time`, `end_time` na tabela `time_clock_day_offs`
- **`src/components/TimeClock/DayOffManager.tsx`** — novo tipo, campos de horário, lógica parcial
