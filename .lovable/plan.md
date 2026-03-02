
## Plano: Enviar proposta PDF via WhatsApp apos gerar

### Contexto
O componente `ProfessionalProposalPDF` gera um PDF usando jsPDF e faz download automatico. O objetivo e adicionar a opcao de enviar esse PDF + mensagem de texto via WhatsApp API apos a geracao.

A edge function `send-whatsapp` ja suporta envio de midia via multipart/form-data (linhas 112-152) e o hook `useWhatsApp` ja tem `sendMediaMessage`. A API esta corretamente configurada.

### Mudancas

#### 1. `src/modules/baseoff/components/ProfessionalProposalPDF.tsx`

Apos gerar e baixar o PDF, mostrar um dialog/estado perguntando se o usuario quer enviar via WhatsApp:

- Modificar `generatePDF` para, alem de salvar, guardar o PDF em base64 no estado (`doc.output('datauristring')` ou `doc.output('arraybuffer')`)
- Apos gerar, em vez de fechar o modal imediatamente, exibir uma secao de "Enviar via WhatsApp"
- Campos: numero do telefone (pre-preenchido com `client.tel_cel_1`), mensagem de texto editavel, botao verde "API WhatsApp" para enviar
- Usar `useWhatsApp().sendMediaMessage` para enviar o base64 do PDF + mensagem de texto
- Manter botao "Fechar" para quem nao quer enviar

**Fluxo do usuario:**
1. Seleciona contratos -> clica "Gerar PDF" -> PDF e baixado
2. Modal muda para tela "Enviar via WhatsApp?" com campo de mensagem e telefone
3. Clica "API WhatsApp" (verde) -> envia texto + PDF via API
4. Ou clica "Fechar" para sair

#### 2. Nenhuma mudanca na edge function
A edge function ja implementa corretamente o envio de midia via `multipart/form-data` com o campo `medias` (blob). O base64 e convertido em bytes na edge function (linhas 114-118) e enviado como FormData. Nao precisa alterar.

#### 3. Nenhuma mudanca no hook `useWhatsApp`
O hook ja tem `sendMediaMessage` que aceita `mediaBase64`, `mediaName`, `message`, `clientName` e `instanceId`.

### Detalhes tecnicos

**Estado adicional no ProfessionalProposalPDF:**
```typescript
const [pdfBase64, setPdfBase64] = useState<string | null>(null);
const [showWhatsAppSend, setShowWhatsAppSend] = useState(false);
const [whatsAppMessage, setWhatsAppMessage] = useState('');
const [phoneNumber, setPhoneNumber] = useState('');
```

**Captura do base64 no generatePDF:**
```typescript
// Apos doc.save(fileName):
const base64 = doc.output('datauristring').split(',')[1]; // puro base64
setPdfBase64(base64);
setPhoneNumber(client.tel_cel_1 || '');
setWhatsAppMessage(`Olá ${client.nome?.split(' ')[0]}, segue sua proposta de refinanciamento.`);
setShowWhatsAppSend(true);
// NAO chamar onClose() aqui
```

**Envio via WhatsApp:**
```typescript
const { sendMediaMessage, hasInstances, sending } = useWhatsApp();

const handleSendWhatsApp = async () => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const fileName = `proposta_${client.cpf?.replace(/\D/g, '') || 'cliente'}.pdf`;
  
  await sendMediaMessage(fullPhone, pdfBase64!, fileName, whatsAppMessage, client.nome);
  onClose();
  setShowWhatsAppSend(false);
};
```

**UI apos gerar PDF:** Substituir a tela de selecao de contratos por uma tela com:
- Mensagem "PDF gerado com sucesso!"
- Campo de telefone (Input, pre-preenchido)
- Campo de mensagem (Textarea, editavel)
- Botao verde "API WhatsApp" (padrao consistente com os outros modulos)
- Botao "Fechar" para sair sem enviar

### Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `src/modules/baseoff/components/ProfessionalProposalPDF.tsx` | Adicionar estado de envio WhatsApp apos gerar PDF |
