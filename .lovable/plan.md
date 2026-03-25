

## Easyn Voicer — Exemplos com Personagens + Créditos para Admin e Usuário

### 1. Exemplos Prontos — Atualizar scripts e vozes

**Arquivo**: `src/modules/voicer/components/ExamplesDialog.tsx`

Substituir os 4 exemplos atuais por:

| # | Titulo | Voz ElevenLabs | Gênero | Personagem Fictício |
|---|--------|---------------|--------|---------------------|
| 1 | Portabilidade — Abordagem Inicial | Sarah (EXAVITQu4vr4xnSDxMaL) | Feminino | "Ana Beatriz" — Consultora simpática |
| 2 | Cartão Consignado — Oferta | Laura (FGY2WhTYpPnrIDTdsKH5) | Feminino | "Camila Torres" — Especialista animada |
| 3 | Refinanciamento — Redução de Parcela | Roger (CwhRBWXzGAHq8TQ4Fs17) | Masculino | "Carlos Eduardo" — Analista cordial |
| 4 | Novo Empréstimo — Taxa Especial | Daniel (onwK4e9ZLuTAKqWW03F9) | Masculino | "Rafael Lima" — Consultor entusiasmado |

Remover "Cobrança Amigável". Cada exemplo terá:
- `characterName` e `characterEmoji` (avatar emoji: 👩‍💼, 👩‍🎤, 👨‍💼, 👨‍🔬)
- Textos de vendas em PT-BR com variáveis de fala
- Card visual com avatar/emoji do personagem, nome fictício, badge da voz ElevenLabs

O layout do card mostrará o avatar do personagem à esquerda (emoji grande em circle), nome fictício + voz real + botão "Usar".

### 2. Créditos — Tela do Usuário Melhorada

**Arquivo**: `src/modules/voicer/views/CreditsView.tsx`

Adicionar ao topo:
- Saldo atual grande (já existe)
- Botão "Entenda como cobramos" que abre Dialog com texto adaptado do PDF (explicação de variáveis, custo por caractere, dicas)
- Quando saldo = 0: banner "Sem créditos" com botão "Comprar Créditos" (por enquanto abre seção de recarga)
- Seção "Recarga" com input para o usuário digitar valor desejado + texto "Em breve você poderá comprar na plataforma" + botão desabilitado "Recarregar com PIX"

### 3. Painel Admin — Gerenciar Créditos Voicer

O `AdminCreditsManagement.tsx` já existe com 644 linhas e usa `admin_manage_credits` RPC. Ele já permite adicionar/remover créditos de usuários.

Verificar se já aparece no painel admin. Se não, garantir que esteja acessível. Não precisa duplicar — apenas garantir a rota.

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `ExamplesDialog.tsx` | Substituir exemplos, adicionar personagens fictícios com avatares, remover cobrança |
| `CreditsView.tsx` | Adicionar "Entenda como cobramos" dialog, seção recarga placeholder, banner sem créditos |
| `StudioView.tsx` | Quando balance = 0, mostrar alerta com botão "Comprar Créditos" que navega para aba créditos |

### Texto "Entenda como cobramos" (adaptado do PDF)

```
Como funciona a cobrança do Easyn Voicer?

O Easyn Voicer cobra por caractere convertido em áudio.

• 1 crédito = 100 caracteres de texto
• Variáveis de fala ({{...}}) NÃO são cobradas
• Espaços e pontuação são contados

Exemplo: Um texto de 450 caracteres custa 5 créditos.

Dicas para economizar:
1. Use variáveis de fala — elas controlam tom e emoção sem custo extra
2. Escreva textos objetivos e diretos
3. Teste com textos curtos antes de gerar a versão final
4. Use o Gerador de Variações para criar múltiplas versões do mesmo texto
```

### Detalhes técnicos

- Vozes Sarah e Laura são as mais populares em PT-BR na ElevenLabs (multilingual v2)
- Roger e Daniel são as vozes masculinas mais usadas em português
- Personagens fictícios usam emojis como avatar (sem necessidade de imagens externas)
- A seção de recarga será placeholder visual — sem integração de pagamento por enquanto

