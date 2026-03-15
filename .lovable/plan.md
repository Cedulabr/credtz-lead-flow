

## Upgrade AutoLead — SMS Paralelo ao WhatsApp

### Visão Geral

Adicionar envio de SMS em paralelo ao WhatsApp no AutoLead. Ao criar um job, o sistema também dispara SMS imediatamente (sem delay) para os mesmos leads, verificando créditos SMS do gestor da empresa antes de autorizar. O wizard ganha um novo step para configurar o texto SMS com 3 copys de exemplo.

### Fluxo

```text
Wizard Step 3 (Mensagem WhatsApp) → Step 4 (NOVO: Mensagem SMS) → Step 5 (WhatsApp instances) → Step 6 (Resumo)

Step 4 - SMS:
├── Toggle: "Enviar também via SMS?" (ativo por padrão)
├── Verificação automática de créditos SMS do gestor
├── Se sem créditos → mensagem de aviso, toggle bloqueado
├── 3 copys de exemplo (cards clicáveis):
│   1. Portabilidade de Crédito
│   2. Novas Ofertas INSS
│   3. Nova Oportunidade de Crédito
├── Textarea editável com variáveis {{nome}}, {{whatsapp}}
└── Preview do SMS final
```

### Copys de Exemplo

Cada copy terá no final o número WhatsApp do usuário (obtido da instância selecionada):

1. **Portabilidade**: "Olá {{nome}}! Identificamos que você pode reduzir sua parcela com a portabilidade de crédito. Quer saber quanto pode economizar? Fale comigo: {{whatsapp}}"
2. **Novas Ofertas**: "{{nome}}, temos ofertas exclusivas para beneficiários do INSS com as melhores taxas do mercado. Entre em contato: {{whatsapp}}"
3. **Oportunidade**: "Olá {{nome}}! Surgiu uma nova oportunidade de crédito para você com condições especiais. Saiba mais: {{whatsapp}}"

### Verificação de Créditos SMS

O sistema busca o gestor da empresa do usuário e verifica os créditos SMS dele via `get_user_sms_credits`. Se o gestor não tiver créditos, o SMS é desabilitado com aviso. Os créditos são debitados do gestor (não do colaborador).

### Envio SMS

Na `createJob` do `useAutoLead.ts`, após criar as mensagens WhatsApp agendadas:
- Verificar créditos SMS do gestor
- Invocar a edge function `send-sms` para cada lead imediatamente (sem delay)
- Registrar no `sms_history` e debitar créditos SMS
- Registrar no job se SMS foi habilitado (`sms_enabled`, `sms_template`, `sms_sent`, `sms_failed`)

### Arquivos a Modificar/Criar

| Arquivo | Ação |
|---|---|
| `src/modules/autolead/types.ts` | Adicionar campos SMS ao `WizardData` e `AutoLeadJob`, adicionar copys de exemplo |
| `src/modules/autolead/components/AutoLeadWizard.tsx` | Novo step SMS com 3 copys, toggle, preview com {{whatsapp}} |
| `src/modules/autolead/hooks/useAutoLead.ts` | Lógica de verificação de créditos do gestor + envio SMS em lote imediato |
| Migração SQL | Adicionar colunas `sms_enabled`, `sms_template`, `sms_sent`, `sms_failed` na tabela `autolead_jobs` |

### Segurança

- Créditos SMS verificados do gestor da empresa (não do colaborador)
- Debitar créditos antes do envio para evitar envios sem saldo
- Se créditos insuficientes para todos os leads, enviar apenas para a quantidade disponível

