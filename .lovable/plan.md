

## Refazer Dashboard - Resumo por Empresa e Modulo

### O que sera removido (indicadores antigos)

Todos os seguintes serao eliminados do Dashboard admin/gestor:
- Cards de Vendas Pagas, Faturamento, Comissoes, Top Vendedor/Conversao
- Secao de 6 cards de leads (Premium, Activate, Meus Clientes, Contato Futuro, Fechados, Documentacoes)
- Grafico de Vendas por Periodo (AreaChart)
- Funil de Televendas (PieChart)
- Resumo Financeiro (contas vencidas/vencendo)
- Top Vendedores
- Acoes Rapidas
- Vendas por Produto (PieChart)
- SalesRanking
- Alertas de financa

### Nova estrutura do Dashboard Admin/Gestor

O dashboard tera uma visao focada em **resumo de atividades dos usuarios por empresa**, cobrindo apenas os 6 modulos solicitados.

**Filtros (mantidos):** Mes + Empresa

**Layout: Tabela de resumo por usuario, agrupada por empresa**

Para cada empresa visivel ao gestor/admin, exibir uma secao com o nome da empresa e uma tabela com colunas:

| Colaborador | Leads Premium | Activate Leads | Televendas | Gestao TV | Gerador Proposta | SMS |
|---|---|---|---|---|---|---|
| Joao | 45 trab. | 20 trab. | 8 vendas | 12 propostas | 3 geradas | 15 enviados |
| Maria | 30 trab. | 15 trab. | 5 vendas | 9 propostas | 1 gerada | 8 enviados |

Detalhes de cada coluna:
- **Leads Premium**: count de `leads` com `status != 'new_lead'` e `assigned_to = user_id` no periodo
- **Activate Leads**: count de `activate_leads` com `status != 'novo'` e `assigned_to = user_id` no periodo
- **Televendas**: count de `televendas` com `status = 'pago'` e `user_id = user_id` no periodo (vendas pagas)
- **Gestao Televendas**: count de `televendas` criadas pelo usuario no periodo (total propostas)
- **Gerador Proposta**: count de `propostas` com `created_by_id = user_id` no periodo
- **SMS**: count de `sms_history` com `user_id = user_id` e `status = 'sent'` no periodo

**Cards resumo no topo (por empresa selecionada):**
6 cards compactos, um por modulo, com o total consolidado da empresa.

**Regras de acesso:**
- Admin: ve todas as empresas, pode filtrar por empresa
- Gestor: ve apenas sua empresa (pre-selecionada, sem opcao "Todas")
- Colaborador: continua vendo o ConsultorDashboard motivacional (sem alteracao)

### Dashboard Colaborador

Sem alteracao -- mantem o ConsultorDashboard.tsx atual com metas diarias e recontatos.

### Arquivos a editar

| Arquivo | Alteracao |
|---|---|
| `src/components/Dashboard.tsx` | Reescrever completamente: remover todos os indicadores antigos, remover imports de recharts/SalesRanking/finance. Novo layout com tabela de atividades por usuario agrupada por empresa, 6 cards resumo dos modulos. |
| `src/components/ConsultorDashboard.tsx` | Nenhuma alteracao |

### Detalhes tecnicos

**Queries necessarias (Dashboard.tsx):**

Para cada empresa visivel, buscar usuarios via `user_companies`, depois para cada usuario fazer queries paralelas:

```text
1. user_companies -> listar usuarios da empresa
2. leads (assigned_to IN userIds, status != 'new_lead', periodo) -> agrupar por assigned_to
3. activate_leads (assigned_to IN userIds, status != 'novo', periodo) -> agrupar por assigned_to
4. televendas (user_id IN userIds, status = 'pago', periodo) -> agrupar por user_id
5. televendas (user_id IN userIds, periodo) -> total propostas por user_id
6. propostas (created_by_id IN userIds, periodo) -> agrupar por created_by_id
7. sms_history (user_id IN userIds, status = 'sent', periodo) -> agrupar por user_id
```

Todas as queries usam `.in('field', userIds)` e agrupamento no frontend via Map/reduce.

**Estrutura do componente:**
- Header com filtros (mes + empresa) -- simplificado
- 6 cards resumo no topo (totais por modulo)
- Tabela responsiva com dados por colaborador
- Em mobile: cards em vez de tabela

