

## Alterar botão "Testar conexão" para "Verificar Status"

### Alterações em `src/components/WhatsAppConfig.tsx`

**1. Botão na lista de instâncias (linha ~649)**
- Trocar `title="Testar conexão"` → `title="Verificar Status"`
- Trocar ícone de `Send` para `RefreshCw` (já importado)
- Adicionar texto visível "Verificar Status" ao lado do ícone (sem ser apenas hover)
- Tornar o botão sempre visível (remover `opacity-0 group-hover:opacity-100` para este botão específico)

**2. Lógica `handleTest` (linha ~413)**
- Após verificar o status via Evolution API, atualizar o campo `instance_status` na tabela `whatsapp_instances` com o resultado (`connected` ou `disconnected`)
- Exibir toast com estado real: "Instância conectada" ou "Instância desconectada"

**3. Badge de status (linhas ~638-647)**
- Substituir badges "OK"/"Erro" por badges semânticas: 🟢 "Conectado" / 🔴 "Desconectado"
- Tornar badges sempre visíveis (não apenas após teste)
- Usar o campo `instance_status` do banco como estado inicial, atualizando após cada verificação

