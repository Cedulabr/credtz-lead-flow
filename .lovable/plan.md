

## Diagnóstico: Dashboard Modular não aparece para Admin

### Causa
O código em `Dashboard.tsx` linha 89 define:
```typescript
setShowSimpleDashboard(!isAdmin && !userIsGestor);
```

Isso significa que o novo dashboard com cards (ConsultorDashboard) só é exibido para colaboradores comuns. Admins e gestores veem o dashboard antigo com tabelas de atividades.

### Solução Proposta

Integrar os cards modulares no dashboard de Admin/Gestor, mantendo as tabelas de atividades mas adicionando uma seção superior com os cards de visão geral do sistema.

**Opção 1 - Adicionar cards ao Dashboard Admin:**
- Adicionar uma seção de cards no início do `Dashboard.tsx` 
- Os cards mostrarão totais globais (para admin) ou da empresa (para gestor)
- Manter as tabelas de atividades detalhadas abaixo

**Opção 2 - Tabs para alternar views:**
- Adicionar toggle "Visão Geral" / "Atividades" no topo
- Visão Geral mostra os cards modulares
- Atividades mostra as tabelas existentes

### Implementação Recomendada (Opção 1)

Modificar `Dashboard.tsx` para incluir os cards antes das tabelas:

```text
┌────────────────────────────────────────────────────────────┐
│  Dashboard Admin                    [Mês] [Empresa] [Ref] │
└────────────────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Leads    │ │ Radar    │ │ Vendas   │ │ WhatsApp │
│ Premium  │ │ Créditos │ │ Pagas    │ │ Status   │
│   127    │ │   45     │ │   23     │ │ Conectado│
└──────────┘ └──────────┘ └──────────┘ └──────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐
│ Docs     │ │ SMS      │ │ Ativados │
│ Salvos   │ │ Créditos │ │   89     │
│   156    │ │  1.250   │ │          │
└──────────┘ └──────────┘ └──────────┘

[Tabelas de atividades por empresa - existente]
```

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/Dashboard.tsx` | Adicionar seção de cards antes das tabelas (para admin/gestor) |

A lógica de dados já existe no `ConsultorDashboard` - será extraída para um hook reutilizável ou duplicada no Dashboard principal.

