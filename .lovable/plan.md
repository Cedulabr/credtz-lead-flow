

## Plano: Reformular PDF Mensal no Formato Profissional (Folha de Ponto)

### Onde gerar o PDF

O botao "Gerar PDF" ja existe na aba **Historico** do modulo Controle de Ponto. Quando voce seleciona um colaborador e clica em "Gerar PDF" > "Espelho Mensal", ele gera o PDF. O problema e que o formato atual nao corresponde ao modelo profissional que voce precisa.

### Problemas no PDF atual

1. **Layout nao corresponde ao modelo**: a imagem de referencia mostra uma tabela com colunas claras (Data, Dia da Semana, Hora Entrada, Hora Saida, Intervalo inicio/fim, Total Intervalo, Licenca Medica, Ferias, Total de Horas)
2. **Falta coluna "Dia da Semana"** por extenso (Segunda, Terca, etc.)
3. **Falta sinalizacao visual de Sabado/Domingo** com fundo diferente
4. **Falta colunas de Licenca Medica e Ferias** (Sim/Nao)
5. **Falta "Total de Horas" no formato HH:MM** padronizado
6. **Cabecalho da tabela sem destaque vermelho/forte** como no modelo
7. **Faltas nao estao sinalizadas claramente** - dia util sem registro deveria aparecer em branco com status "FALTA"

### Alteracoes planejadas

**Arquivo: `src/components/TimeClock/TimeClockPDF.tsx`** - Reescrever `generateMonthlyPDF()`

Nova estrutura de colunas no PDF (baseada na imagem de referencia):

| Data | Dia da Semana | Entrada | Saida | Pausa Inicio | Pausa Fim | Total Intervalo | Atraso | Licenca Med. | Ferias | Total Horas |
|------|--------------|---------|-------|-------------|-----------|-----------------|--------|-------------|--------|------------|

Melhorias especificas:
- Cabecalho da tabela com fundo vermelho forte (como na imagem)
- Dias de fim de semana com fundo cinza claro
- Dias com falta sinalizados com texto "FALTA" na coluna de status
- Dias com atraso mostram os minutos de atraso
- Dias com justificativa aprovada mostram indicador visual
- Formato de horas padronizado HH:MM (08:00:00 no modelo)
- Coluna "Total de Horas" calculada automaticamente
- Rodape com somatorio: Total Horas, Total Atrasos (soma em minutos/horas), Total Faltas, Total HE
- Campos de assinatura mantidos
- Informacao financeira (salario/desconto) mantida se disponivel

### Resumo

| Arquivo | Acao |
|---|---|
| `src/components/TimeClock/TimeClockPDF.tsx` | Reescrever tabela mensal no formato profissional da imagem de referencia |

Apenas 1 arquivo modificado. A logica de calculo ja existe em `timeClockCalculations.ts` - so precisa reformatar a apresentacao no PDF.

