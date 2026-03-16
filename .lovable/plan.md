

## AutoLead — Regras de Crédito Gestor/Colaborador e Upsell SMS

### Contexto Atual

O wizard ja verifica creditos SMS do gestor e desabilita o toggle quando = 0. O home ja bloqueia o botao quando credits = 0. Falta:

1. **Banner estrategico de upsell SMS** quando sem creditos SMS
2. **Mensagem clara diferenciando Gestor vs Colaborador** quando sem creditos (Gestor ve "comprar", Colaborador ve "solicitar ao gestor")
3. **Banner persistente no Home** quando SMS = 0 incentivando compra

### Mudancas

| Arquivo | Acao |
|---|---|
| `src/modules/autolead/components/AutoLeadHome.tsx` | Adicionar banner de upsell SMS; diferenciar mensagem Gestor vs Colaborador quando sem creditos lead |
| `src/modules/autolead/components/AutoLeadWizard.tsx` | Melhorar aviso SMS (banner amarelo estrategico com "taxa de resposta +40%"); diferenciar textos por perfil |
| `src/modules/autolead/hooks/useAutoLead.ts` | Expor `smsCredits` e `isGestor` para os componentes consumirem |

### Detalhes

**1. AutoLeadHome — Banner SMS Upsell + Perfil**

Abaixo do card de creditos, se SMS credits = 0, exibir:

```
⚠️ Voce esta utilizando apenas WhatsApp.
Adicionar creditos de SMS pode aumentar sua taxa de resposta em ate 40%.
[Falar com suporte] (gestor) / [Solicitar ao gestor] (colaborador)
```

Quando leads = 0:
- Gestor: "Adquira creditos para iniciar a prospecção"
- Colaborador: "Solicite creditos ao seu gestor"

**2. AutoLeadWizard Step 3 (SMS)**

Substituir o card vermelho "Sem creditos SMS" por um banner amarelo/amber estrategico:
- Icone de alerta amarelo
- Texto: "Voce esta prospectando apenas via WhatsApp. Adicionar SMS pode aumentar sua taxa de resposta em ate 40%."
- Sub-texto diferenciado por perfil

**3. useAutoLead — Expor dados**

Adicionar `fetchSmsCredits` e `isGestor` ao retorno do hook para que Home possa exibir o banner sem duplicar logica. O wizard ja tem sua propria logica de fetch SMS credits, entao basta ajustar o Home.

Na pratica, o Home vai usar `useAutoLead` (que ja retorna credits) + chamar a mesma logica de SMS credits internamente.

Alternativa mais simples: fazer o fetch de SMS credits e isGestor diretamente no `AutoLeadHome` (mesmo padrao do wizard) — evita mexer no hook principal.

**Decisao**: Fazer o fetch diretamente no `AutoLeadHome` (padrao consistente com o wizard).

