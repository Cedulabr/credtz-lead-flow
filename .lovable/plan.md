

## Plano: Redesign Completo da Tela Consulta Base OFF — Layout Fintech Moderno

### Visão Geral

Reestruturar a tela de detalhe do cliente (`ClienteDetalheView`) em 4 blocos visuais claros com design fintech, substituir tabelas densas por cards informativos no simulador, e adicionar destaque automático da melhor operação. Ocultar campos avançados (IOF, CET) da interface principal.

### Arquivos a Modificar

| Arquivo | Ação |
|---|---|
| `ClienteDetalheView.tsx` | Reestruturar layout em 4 blocos lineares, mover contatos para inline, botão GERAR PROPOSTA grande e fixo |
| `ClienteHeader.tsx` | Simplificar para perfil moderno: Nome, Idade, CPF, NB, Banco, Espécie, Cidade. Remover colunas detalhadas |
| `TelefoneHotPanel.tsx` | Converter para cards horizontais inline (não mais sidebar), botões grandes WhatsApp/Ligar/Copiar |
| `ContratoCard.tsx` | Redesign como card fintech: checkbox integrado, dados-chave visíveis sem expandir, remover collapsible |
| `MargemCards.tsx` | Refinar visual: ícones Lucide em vez de emoji, cards com sombra suave, valores maiores |
| `TrocoCalculator.tsx` | Resultados em cards (não tabelas), melhor operação no topo, ocultar IOF/CET, troco negativo com bolinha vermelha, botão GERAR PROPOSTA destacado |
| `ProfessionalProposalPDF.tsx` | Redesign do PDF: logo, valor liberado em destaque, hierarquia visual clara |

### 1. ClienteDetalheView — Nova Estrutura

Remover layout `grid lg:grid-cols-[1fr_320px]` (sidebar de telefones). Tudo em coluna única:

```
1. Perfil do Cliente (ClienteHeader simplificado)
2. Contatos (TelefoneHotPanel horizontal)  
3. Margens e Indicadores (MargemCards)
4. Cartões (CartoesSection)
5. Contratos (cards com checkbox integrado)
6. Simulador (resultados em cards, melhor operação no topo)
7. Botão GERAR PROPOSTA (grande, fixo no mobile)
```

Remover tabs contratos/timeline — exibir contratos diretamente. Timeline fica acessível via botão secundário.

### 2. ClienteHeader — Perfil Moderno

Card com avatar/ícone grande à esquerda, dados essenciais à direita:
- **Nome** (grande) + Badge de idade
- CPF, NB com botões copiar
- Banco pagador, Espécie, Cidade em chips/badges
- Remover as 3 colunas detalhadas (Dados Pessoais/Bancários/Endereço) — dados detalhados ficam em um "ver mais" colapsível

### 3. TelefoneHotPanel — Cards Horizontais

Converter de sidebar para grid horizontal `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`:
- Cada telefone como card com número grande
- Botões WhatsApp (verde, grande), Ligar, Copiar
- Funciona bem em mobile com scroll horizontal ou stack

### 4. ContratoCard — Card Fintech

Redesign sem collapsible:
- Checkbox integrado no canto superior
- Informações-chave visíveis: Banco, Parcela, Saldo, Taxa, Pagas/Restantes, Averbação
- Layout em grid dentro do card
- Badge "Disponível" verde se >= 12 parcelas pagas
- Sem botões de ação individuais (ações ficam no simulador)

### 5. MargemCards — Visual Refinado

- Substituir emojis por ícones Lucide coloridos
- Cards com `shadow-sm`, bordas mais suaves
- Valor em `text-3xl font-bold`
- Label em `text-xs uppercase tracking-wide`

### 6. TrocoCalculator — Resultados em Cards

**Melhor Operação** — Card destacado no topo:
- Fundo gradiente azul/verde
- "Melhor operação disponível"
- Banco, Taxa, Troco líquido em destaque

**Resultados** — Grid de cards em vez de tabela:
- Cada taxa vira um card com: Taxa, Parcela, Vl. Financiado, Vl. Liberado, Troco
- IOF, CET ocultos (dados mantidos internamente)
- Troco positivo: valor verde com bolinha verde
- Troco negativo: `● -R$ 203,52` em vermelho com bolinha vermelha

**Parâmetros** — Simplificados, campos de data ocultos por padrão (toggle "Avançado")

**Botão GERAR PROPOSTA** — `h-14 text-lg font-bold` com gradiente primário, full-width

### 7. Tratamento Visual do Troco

```tsx
<div className="flex items-center gap-2">
  <span className={cn(
    "w-3 h-3 rounded-full",
    troco >= 0 ? "bg-emerald-500" : "bg-red-500"
  )} />
  <span className={cn(
    "text-2xl font-bold",
    troco >= 0 ? "text-emerald-600" : "text-red-600"
  )}>
    {formatCurrency(troco)}
  </span>
</div>
```

### 8. PDF da Proposta

- Logo da empresa no topo
- Dados do cliente em seção limpa
- Resumo da operação com valor liberado em destaque (caixa grande azul)
- Condições do contrato em grid organizado
- Rodapé com disclaimers

### 9. Responsividade

Mobile-first: blocos empilham verticalmente na ordem Cliente → Contatos → Margens → Contratos → Simulação → Gerar Proposta. Botão GERAR PROPOSTA pode ser sticky no bottom em mobile.

### Resultado

Interface moderna tipo fintech com leitura rápida, hierarquia visual clara, e operação intuitiva mesmo para usuários leigos. Dados avançados (IOF, CET) preservados internamente mas ocultos da interface principal.

