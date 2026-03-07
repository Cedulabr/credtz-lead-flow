

## Plano: Corrigir PDF, Simulador, Cartoes, Parcelas, Header e CPF

### Problemas identificados

1. **PDF com contraste ruim**: O fundo escuro (`colors.dark = 51,65,85`) com texto nao suficientemente claro. A imagem mostra fundo quase preto com texto dificil de ler.
2. **Parcelas formato incorreto**: Atualmente mostra "Pagas/Restantes" mas usuario quer "Pagas/Prazo/Restantes".
3. **Cartoes RMC/RCC nao visivel**: `CartoesSection` existe mas filtra por tipos `4,5,6,7,12,13` - pode nao estar capturando os tipos corretos da API ou nao ha contratos com esses tipos.
4. **Header texto pequeno**: Secoes com `text-xs` dificultam leitura, idade nao em destaque.
5. **Simulador logica errada**: Portabilidade NAO deve tirar 70%. A regra de 70% + IOF e para **Cartao Consignado RMC/RCC** com taxa 2,55%. Portabilidade calcula troco normal com IOF apenas.
6. **Faltam modos no simulador**: Precisa de "Novo Emprestimo (Margem)" e "Cartoes (RMC/RCC)" alem de portabilidade e refinanciamento.
7. **Prazos incorretos**: Portabilidade/refinanciamento so 96x e 84x (96x prioridade). Cartao e margem: 72x, 84x, 96x (96x prioridade).
8. **StatusBadge "Ativo" desnecessario**: Trocar por "Disponivel" para contratos com >12 prestacoes pagas.
9. **CPF sem zero a esquerda**: O `search_term` e enviado sem padStart para Edge Function.

### Alteracoes

**1. `ProfessionalProposalPDF.tsx` - Contraste**
- Mudar `colors.dark` de `(51,65,85)` para `(30,41,59)` (mais escuro para texto)
- O box de simulacao: fundo branco com borda verde em vez de fundo escuro
- Todos os textos de dados: usar preto `(0,0,0)` ou quase preto `(15,23,42)`
- Fundo dos boxes de contrato: branco `(255,255,255)` com borda cinza
- Header: manter azul mas mais claro `(79,150,255)`
- Texto dentro do header da simulacao: preto sobre fundo branco/claro

**2. `ContratoCard.tsx` - Parcelas**
- Mudar label de "Pagas/Restantes" para formato: `{pagas}/{prazo} | Restantes: {restantes}`
- Trocar StatusBadge "Ativo" por badge "Disponível" (verde) quando `installments.pagas >= 12`

**3. `CartoesSection.tsx` - Garantir visibilidade**
- O componente ja existe e e renderizado em `ClienteDetalheView`. Verificar se os tipos de cartao estao corretos para os dados da API. Os dados da API nao mostram contratos com tipos 4-7/12-13, mas como nao ha dados de cartao no exemplo, o componente simplesmente nao aparece. Isso esta correto.
- Nao precisa alterar - funciona quando houver contratos de cartao.

**4. `ClienteHeader.tsx` - Fontes maiores e idade em destaque**
- `SectionTitle`: aumentar de `text-xs` para `text-sm`
- `InfoRow` labels e values: de `text-xs` para `text-sm`
- Idade: adicionar badge destacada ao lado do nome ou em campo separado com cor

**5. `TrocoCalculator.tsx` - Logica correta**
- **Remover** aviso de 70% da portabilidade
- **Portabilidade**: IOF apenas, sem regra de 70%
- **Refinanciamento**: IOF apenas, sem regra de 70%
- **Novo modo "Novo Emprestimo"**: Calcula PMT baseado na margem livre do cliente (precisa receber `margemLivre` como prop). Prazos: 72x, 84x, 96x.
- **Novo modo "Cartoes (RMC/RCC)"**: Taxa fixa 2,55%. Calcula limite do cartao pela margem disponivel. Do limite, tira IOF e aplica 70% = valor do saque. Prazos: 72x, 84x, 96x. Cliente so pode ter 1 RMC e 1 RCC.
- **Prazos** por modo:
  - Portabilidade/Refinanciamento: apenas `[96, 84]`
  - Novo Emprestimo/Cartoes: `[96, 84, 72]`

**6. `OptimizedSearch.tsx` ou `useOptimizedSearch.ts` - CPF com zero a esquerda**
- Antes de enviar `search_term`, se o valor contem apenas digitos e tem < 11 chars, fazer `padStart(11, '0')`

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `ProfessionalProposalPDF.tsx` | Fundo branco nos boxes, texto preto, alto contraste |
| `ContratoCard.tsx` | Formato "Pagas/Prazo | Restantes", badge "Disponivel" |
| `ClienteHeader.tsx` | Fontes maiores, idade em destaque |
| `TrocoCalculator.tsx` | 4 modos (port/refin/novo/cartao), corrigir 70% para cartao apenas, prazos corretos |
| `useOptimizedSearch.ts` | CPF padStart(11, '0') |

