

## Plano: Evolucao do Controle de Ponto - Salarios, PDF com Justificativas e Calculo Liquido

### Diagnostico

O modulo ja possui estrutura funcional: PDF mensal, calculo de pausas/atrasos, banco de horas, justificativas com upload, jornadas e relatorios. As lacunas sao:

1. **PDF mensal nao mostra sinalizacao de justificativas** (aprovada/rejeitada/pendente por dia)
2. **Nao existe cadastro de salarios** por colaborador/empresa
3. **Nao existe calculo de valor liquido** (salario - descontos por atraso)
4. **O "Cargo" no PDF e generico** (mostra "Colaborador" hardcoded, nao o cargo real)

### Alteracoes Planejadas

---

**1. Criar tabela `employee_salaries` no Supabase**

```sql
CREATE TABLE public.employee_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id),
  base_salary numeric(12,2) NOT NULL DEFAULT 0,
  cargo text DEFAULT 'Colaborador',
  hourly_rate numeric(8,2) GENERATED ALWAYS AS (
    CASE WHEN 176 > 0 THEN base_salary / 176 ELSE 0 END
  ) STORED,
  delay_discount_per_minute numeric(8,4) GENERATED ALWAYS AS (
    CASE WHEN 176 > 0 THEN (base_salary / 176) / 60 ELSE 0 END
  ) STORED,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);
ALTER TABLE public.employee_salaries ENABLE ROW LEVEL SECURITY;
```

Com RLS para admin/gestor ler e escrever, e colaborador ler apenas o proprio.

---

**2. Adicionar aba "Salarios" no modulo (apenas gestor/admin)**

Novo componente: `src/components/TimeClock/SalaryManager.tsx`

- Listar colaboradores com salario e cargo cadastrados
- Modal para cadastrar/editar: salario base, cargo
- Exibir valor hora e valor minuto de desconto calculados automaticamente
- Filtro por empresa

---

**3. Melhorar PDF mensal com sinalizacao de justificativas**

Arquivo: `src/components/TimeClock/TimeClockPDF.tsx`

Na coluna "Obs" do PDF mensal, adicionar:
- `✓ Apr` quando ha justificativa aprovada para o dia
- `⏳ Pend` quando ha justificativa pendente
- `✗ Rej` quando ha justificativa rejeitada
- Sem marcacao quando nao ha justificativa

Na barra de resumo, adicionar:
- **Salario Base**: R$ X.XXX,XX
- **Desconto Atrasos**: R$ X.XXX,XX (total minutos atraso x valor minuto)
- **Valor Liquido Estimado**: R$ X.XXX,XX

Buscar dados de `employee_salaries` junto com os demais dados.

Usar o campo `cargo` da tabela `employee_salaries` ao inves do hardcoded `Colaborador`.

---

**4. Soma de atrasos no PDF**

Ja existe parcialmente (`Atrasos: X (Ymin)`). Melhorar para:
- `Atrasos: X ocorrencias | Total: Xh Ymin`
- `Atrasos Justificados: X` (com justificativa aprovada)
- `Atrasos Nao Justificados: X`

---

**5. Atualizar navegacao do modulo**

Arquivo: `src/components/TimeClock/index.tsx`

- Adicionar aba "Salarios" (apenas para gestor/admin), com icone de moeda

---

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `src/components/TimeClock/SalaryManager.tsx` | **Novo** - CRUD de salarios |
| `src/components/TimeClock/TimeClockPDF.tsx` | Justificativas por dia, calculo liquido, cargo real |
| `src/components/TimeClock/index.tsx` | Nova aba Salarios |
| Migracao SQL | Criar tabela `employee_salaries` com RLS |

### Migracao SQL

1. `CREATE TABLE employee_salaries` com campos salario, cargo, valor hora calculado, RLS
2. Policies: admin full access, gestor por empresa, colaborador SELECT proprio

