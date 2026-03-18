

## SMS Disparos — Correções de Visibilidade e Gestão de Listas

### Diagnóstico

**Build Error**: O erro `Failed to load native binding` do `@swc/core` é um problema de infraestrutura do servidor de desenvolvimento, não do código. Ele impede que as últimas alterações (botão +Leads, deduplicação) apareçam no preview. Uma recarga resolve.

**Código já implementado**: O botão "+Leads" (linha 619-727) e a lógica de deduplicação (linha 138-184) já existem no código de `CampaignsView.tsx`. Estão dentro da aba "Leads" no dialog de Nova Campanha. O motivo de não aparecerem é o build travado.

**Problema real identificado**: Falta a funcionalidade de **apagar listas importadas**. A screenshot mostra múltiplas listas "Leads Premium" repetidas que poluem a interface. Admin/Gestor precisa poder excluí-las.

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/modules/sms/views/CampaignsView.tsx` | Adicionar botão de excluir lista ao lado de cada lista no seletor; permitir para admin e gestor |

### Detalhes

**1. Excluir listas importadas**

No seletor de listas (linha 575-581), adicionar para cada lista um botão de lixeira visível para admin/gestor. Ao clicar:
- Confirmar com AlertDialog
- Excluir os `sms_contacts` vinculados à lista
- Excluir a `sms_contact_lists`
- Atualizar a lista via `onRefreshLists()`

Implementação: Substituir o `Select` simples por um layout que mostra as listas com botões de ação, ou adicionar uma seção dedicada "Gerenciar Listas" com botões de exclusão abaixo do seletor.

**2. Deduplicação entre listas (melhoria)**

Adicionar ao nome da lista o count de contatos para facilitar identificação, e ao importar, verificar duplicatas entre TODAS as listas do usuário (já implementado no código atual).

