

## Plano: Texto completo da proposta + botao separado para PDF

### O que muda

Apos gerar o PDF, a tela "Enviar via WhatsApp" tera:

1. **Textarea pre-preenchida** com o texto completo da proposta (dados do cliente, contratos selecionados, simulacao de troco, resumo) formatado para WhatsApp
2. **Dois botoes verdes**: "Enviar Texto" (envia a mensagem de texto) e "Enviar PDF" (envia o arquivo PDF)

### Texto gerado automaticamente

O texto seguira este formato:

```
📋 *PROPOSTA DE REFINANCIAMENTO*
━━━━━━━━━━━━━━━━━

👤 *Beneficiário:* João da Silva
📄 *CPF:* 123.456.789-00
🔢 *NB:* 1234567890
🏦 *Banco Pagto:* Banco do Brasil
💰 *Margem Disponível:* R$ 150,00

📄 *CONTRATOS SELECIONADOS*
━━━━━━━━━━━━━━━━━

1️⃣ *Banco BMG* - Consignado
   Nº 123456789
   Parcela: R$ 250,00 | Saldo: R$ 5.000,00
   Prazo: 84x | Taxa: 1.80%

2️⃣ *Banco Pan* - Cartão
   ...

💰 *SIMULAÇÃO DE TROCO*
━━━━━━━━━━━━━━━━━
🏦 Banco: Banco Master
📊 Taxa: 1.70% | Prazo: 84x
💵 Nova Parcela: R$ 180,00
🤑 *TROCO: R$ 3.500,00*

📊 *RESUMO*
Total contratos: 2
Saldo total: R$ 10.000,00

_Proposta gerada por Easyn_
```

### Detalhes tecnicos

#### Arquivo: `src/modules/baseoff/components/ProfessionalProposalPDF.tsx`

1. **Nova funcao `generateProposalText()`** que monta o texto formatado para WhatsApp usando os dados do cliente, contratos selecionados e simulacao de troco

2. **Modificar `generatePDF`**: chamar `generateProposalText()` para preencher o `whatsAppMessage` com o texto completo em vez da mensagem curta

3. **Nova funcao `handleSendText()`**: usa `sendTextMessage` do hook `useWhatsApp` para enviar apenas o texto

4. **Modificar `handleSendWhatsApp`** (renomear para `handleSendPDF`): envia apenas o PDF sem mensagem de texto (ou com legenda curta)

5. **UI dos botoes**: substituir o botao unico por dois botoes:
   - "Enviar Texto" (verde, icone MessageCircle) - chama `sendTextMessage`
   - "Enviar PDF" (verde, icone FileText) - chama `sendMediaMessage`

6. **Importar `sendTextMessage`** do hook `useWhatsApp` (ja disponivel no hook)

