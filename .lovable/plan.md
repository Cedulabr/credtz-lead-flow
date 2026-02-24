
# Plano: Melhorias no Controle de Ponto (PDF Easyn) + Refatoracao do Dashboard Principal

## Resumo

Este plano cobre duas grandes areas:

1. **PDF do Controle de Ponto** -- Personalizar com identidade visual Easyn (cores azul marinho #0A1F44, azul vibrante #3B82F6, logo Easyn), layout profissional com campo de assinatura do colaborador para fechamento mensal
2. **Dashboard Principal (Consultor)** -- Substituir o conteudo atual por um painel focado em metricas operacionais especificas

---

## Parte 1: PDF do Controle de Ponto -- Identidade Visual Easyn

### Arquivo: `src/components/TimeClock/TimeClockPDF.tsx`

**Mudancas no PDF Diario e Mensal:**

- Header com fundo azul marinho escuro (#0A1F44) em vez do azul atual (#3B82F6)
- Adicionar logo Easyn no canto superior esquerdo do header (usando `src/assets/easyn-logo.png` convertido para base64 e embutido no jsPDF via `addImage`)
- Texto "EASYN" ao lado do logo
- Barra de resumo final com gradiente azul marinho para azul (#0A1F44 -> #3B82F6)
- Cores de status ajustadas para o tema Easyn
- Rodape com texto "Easyn -- Sistema de Gestao de Ponto" e data de geracao
- **Campo de assinatura aprimorado** no espelho mensal:
  - Linha de assinatura do colaborador com campo para data
  - Linha de assinatura do gestor/responsavel com campo para data
  - Texto legal: "Declaro que as informacoes acima sao verdadeiras e conferem com meu registro de ponto"
  - Espaco para carimbo da empresa
- Layout mais profissional com margens e espacamentos ajustados
- Fontes e tamanhos padronizados para melhor legibilidade

### Copiar logo Easyn para uso no PDF

- Copiar `user-uploads://90f5cd35-5f9d-45e5-8291-f7fcf4d2483b.png` para `src/assets/easyn-logo-dark.png` para uso no header do PDF (logo branco sobre fundo escuro)

---

## Parte 2: Refatoracao do Dashboard Principal (Consultor)

### Arquivo: `src/components/ConsultorDashboard.tsx`

O dashboard sera completamente refeito para exibir **apenas** os seguintes indicadores:

### Cards/Secoes do novo Dashboard:

1. **Ranking de Vendedores (Propostas Pagas)**
   - Reutilizar o componente `SalesRanking` ja existente que busca dados via RPC `get_televendas_sales_ranking`
   - Exibir ranking do dia e do mes (propostas com status `proposta_paga`)

2. **Clientes Premium Fechados**
   - Query na tabela `leads` filtrando por `status = 'fechado'` (ou status equivalente de fechamento)
   - Exibir quantidade total e lista dos ultimos 5

3. **Leads Activate Fechados**
   - Query na tabela `activate_leads` filtrando por `status = 'fechado'`
   - Exibir quantidade total e lista dos ultimos 5

4. **Absenteismo dos Colaboradores**
   - Query na tabela `time_clock` cruzando com `profiles` para calcular faltas no mes
   - Exibir card com total de faltas, atrasos e taxa de absenteismo (%)
   - Lista dos colaboradores com mais faltas

5. **Documentos Anexados (Quantidade)**
   - Query na tabela `client_documents` contando registros no periodo
   - Card simples com total de documentos

6. **Clientes Indicados (Quantidade)**
   - Query na tabela `leads_indicados` contando registros do usuario no periodo
   - Card com total e breakdown por status (enviado, aprovado, pago)

7. **Vendas Televendas Cadastradas (Quantidade)**
   - Query na tabela `televendas` contando registros no periodo
   - Card com total de vendas cadastradas

### Layout do novo Dashboard:

```text
+------------------------------------------+
|  Saudacao + Seletor de Mes + Refresh     |
+------------------------------------------+
|  [Ranking Dia]    |  [Ranking Mes]       |
+------------------------------------------+
| Premium  | Activate | Absenteismo        |
| Fechados | Fechados |                    |
+------------------------------------------+
| Docs     | Indicados | Vendas Televendas |
| Anexados |           | Cadastradas       |
+------------------------------------------+
```

---

## Detalhes Tecnicos

### Queries do Dashboard:

- **Ranking**: Reutiliza `SalesRanking` component (ja usa RPC otimizado)
- **Premium fechados**: `supabase.from('leads').select('id').eq('assigned_to', userId).eq('status', 'fechado').gte('created_at', startISO)`
- **Activate fechados**: `supabase.from('activate_leads').select('id').eq('assigned_to', userId).eq('status', 'fechado').gte('created_at', startISO)`
- **Absenteismo**: Cruza `profiles` (ativos) com `time_clock` para dias sem entrada no periodo, considerando dias uteis
- **Documentos**: `supabase.from('client_documents').select('id', { count: 'exact' }).gte('created_at', startISO)`
- **Indicados**: `supabase.from('leads_indicados').select('id, status').eq('created_by', userId).gte('created_at', startISO)`
- **Televendas**: `supabase.from('televendas').select('id', { count: 'exact' }).eq('user_id', userId).gte('data_venda', startStr)`

### PDF - Implementacao tecnica:

- Converter a imagem do logo Easyn para base64 em tempo de build (import como asset)
- Usar `doc.addImage(base64Logo, 'PNG', x, y, width, height)` no jsPDF
- Cores Easyn: header `#0A1F44`, acentos `#3B82F6`, texto branco sobre header
- Area de assinatura posicionada dinamicamente apos a tabela de registros

### Arquivos modificados:

| Arquivo | Tipo de mudanca |
|---------|----------------|
| `src/components/TimeClock/TimeClockPDF.tsx` | Refatoracao completa do layout PDF |
| `src/components/ConsultorDashboard.tsx` | Refatoracao completa do dashboard |
| `src/assets/easyn-logo-dark.png` | Novo arquivo (copia do logo enviado) |
