
## Refazer Dashboard Principal - Admin/Gestor vs Colaborador

### Resumo

O Dashboard sera completamente reescrito com duas visoes distintas:

1. **Admin/Gestor**: Visao gerencial com metricas de equipe (leads trabalhados, contatos futuros, fechados, documentacoes)
2. **Colaborador**: Visao motivacional com metas diarias (50 leads premium, recontatos, documentacoes, propostas pagas)

---

### Dashboard Admin/Gestor

**Cards principais (grid 2x3 ou 3x2)**:

| Card | Dados | Fonte |
|---|---|---|
| Leads Premium Trabalhados | Total vs Trabalhados (status != 'new_lead') | tabela `leads` filtrada por empresa/mes |
| Activate Leads Trabalhados | Total vs Trabalhados (status != 'novo') | tabela `activate_leads` filtrada por empresa/mes |
| Meus Clientes Trabalhados | Total propostas criadas no periodo | tabela `propostas` filtrada por empresa/mes |
| Contato Futuro (3 modulos) | Leads Premium com status `contato_futuro` + Activate com `contato_futuro` + Propostas com status `contato_futuro` | 3 tabelas |
| Fechados (3 modulos) | Premium `cliente_fechado` + Activate `fechado` + Propostas pipeline `aceitou_proposta` | 3 tabelas |
| Documentacoes Salvas | Total de documentos salvos no periodo | tabela `client_documents` |

**Secoes adicionais (mantidas)**:
- Ranking de vendedores (SalesRanking)
- Grafico de vendas por periodo
- Funil de televendas
- Resumo financeiro
- Top vendedores
- Acoes rapidas

**Filtros**: Mes + Empresa (mantidos como estao hoje)

---

### Dashboard Colaborador

**Foco motivacional com metas diarias e barras de progresso**:

| Metrica | Meta Diaria | Dados |
|---|---|---|
| Leads Premium Trabalhados Hoje | 50 por dia | `leads` do usuario, status != 'new_lead', criados hoje |
| Recontatos Premium | Sem meta fixa, mostrar pendentes | `leads` com `contato_futuro` e `future_contact_date <= hoje` |
| Recontatos Activate | Sem meta fixa, mostrar pendentes | `activate_leads` com `contato_futuro` do usuario |
| Recontatos Meus Clientes | Sem meta fixa, mostrar pendentes | `propostas` com status `contato_futuro` |
| Documentacoes Salvas Hoje | 10 por dia | `client_documents` do usuario, criados hoje |
| Propostas Pagas Hoje | Mostrar contagem | `televendas` status `pago`, data_venda = hoje |

**Layout motivacional**:
- Saudacao com nome + frase motivacional
- Card de meta diaria de leads com barra de progresso circular/linear e porcentagem
- Cards de recontatos pendentes com botoes de acao rapida
- Cards de documentacoes e propostas pagas com indicadores visuais
- Ranking de vendedores (mantido)
- Acoes rapidas (Nova Venda, Meus Leads, Indicar Cliente)

---

### Arquivos a Editar

| Arquivo | Alteracao |
|---|---|
| `src/components/Dashboard.tsx` | Refazer secao de leads do admin/gestor com os 6 cards novos (Premium trabalhados, Activate trabalhados, Meus Clientes trabalhados, Contato Futuro consolidado, Fechados consolidado, Documentacoes). Atualizar `fetchLeadsData` para buscar contato_futuro e fechados dos 3 modulos |
| `src/components/ConsultorDashboard.tsx` | Reescrever completamente com foco motivacional: meta de 50 leads diarios, recontatos pendentes dos 3 modulos, documentacoes salvas hoje, propostas pagas hoje. Layout com barras de progresso e indicadores visuais de meta |

### Detalhes Tecnicos

**fetchLeadsData (Dashboard.tsx)** - Adicionar queries:
- `leads` com `status = 'contato_futuro'` para contar contatos futuros premium
- `leads` com `status = 'cliente_fechado'` para contar fechados premium
- `activate_leads` com `status = 'contato_futuro'` e `status = 'fechado'`
- `propostas` com `status = 'contato_futuro'` e `pipeline_stage = 'aceitou_proposta'`
- `client_documents` count para documentacoes

**ConsultorDashboard** - Novas queries diarias:
- `leads` do usuario com `assigned_to = user.id`, status != 'new_lead', created_at = hoje (meta 50)
- `leads` com `status = 'contato_futuro'` e `assigned_to = user.id` (recontatos pendentes)
- `activate_leads` com `status = 'contato_futuro'` e `assigned_to = user.id`
- `propostas` com `status = 'contato_futuro'` e `created_by_id = user.id`
- `client_documents` do usuario criados hoje
- `televendas` com `status = 'pago'` e `data_venda = hoje` e `user_id = user.id`
