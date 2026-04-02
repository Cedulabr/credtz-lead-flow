

## Adicionar botao Exportar PDF no modulo Gestao de Televendas

### O que sera feito

Botao "Exportar PDF" visivel apenas para gestor e admin no header do modulo. Ao clicar, gera um PDF com:
- Titulo + periodo/filtros ativos
- Resumo dos KPIs (total propostas, valor pago, pagas, ativas, criticos, alertas)
- Tabela de propostas filtradas (nome, CPF, telefone, produto, banco, status, valor, data)

### Arquivos a criar/modificar

**1. Criar `src/modules/televendas/components/ExportPDFButton.tsx`**

Componente com botao que usa `jsPDF` (ja instalado no projeto) para gerar o PDF:
- Recebe `filteredTelevendas`, `filteredStats`, `filters`, `isGestorOrAdmin`
- Renderiza apenas se `isGestorOrAdmin === true`
- Gera PDF com header, KPIs em grid, e tabela de propostas
- Usa formatacao pt-BR para datas e moedas
- Nome do arquivo: `televendas_relatorio_DD-MM-YYYY.pdf`

**2. Modificar `src/modules/televendas/TelevendasModule.tsx`**

- Importar `ExportPDFButton`
- Adicionar o componente na area de botoes do header (linha ~629, junto ao Sync e FiltersDrawer), dentro do bloco `isGestorOrAdmin`

### Detalhes tecnicos

- `jsPDF` ja esta como dependencia do projeto (usado em `ExportButtons.tsx` do PerformanceReport)
- O PDF tera formato retrato A4, fonte Helvetica, com cores neutras (azul escuro header, linhas alternadas cinza claro)
- Paginacao automatica quando a lista exceder uma pagina
- Rodape com data de geracao e numero de pagina

