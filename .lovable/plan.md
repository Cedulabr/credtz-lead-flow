Tracei um plano para realizar a limpeza solicitada, removendo módulos e tabelas que não são mais utilizados.

### 1. Limpeza do Frontend
Removerei as referências, componentes e arquivos dos seguintes módulos:
- **Base OFF**: Remover `src/modules/baseoff`, referências em `Index.tsx`, `LazyComponents.tsx` e `SidebarNav.tsx`.
- **Auto Lead**: Remover `src/modules/autolead`, referências em `Index.tsx`, `LazyComponents.tsx` e `SidebarNav.tsx`.
- **Meu Número**: Remover `src/modules/meu-numero`, referências em `Index.tsx`, `LazyComponents.tsx` e `SidebarNav.tsx`.
- **Radar de Oportunidade**: Remover `src/modules/radar`, referências em `Index.tsx`, `LazyComponents.tsx` e `SidebarNav.tsx`.
- **Módulo Áudios**: Remover `src/modules/audios`, referências em `Index.tsx`, `LazyComponents.tsx` e `SidebarNav.tsx`.

### 2. Limpeza do Banco de Dados (Supabase)
Criarei uma migração para deletar as tabelas e dados relacionados:
- **Base OFF**: Deletar `baseoff`, `baseoff_requests`, `registrodiariobaseoff`, `baseoff_allowed_banks`, `baseoff_active_clients`, `baseoff_lead_tracking`, `baseoff_notifications`, `baseoff_import_batches`, `baseoff_clients`, `baseoff_contracts`, `baseoff_bank_rates`.
- **Auto Lead**: Deletar `autolead_jobs`, `autolead_messages`.
- **Radar de Oportunidade**: Deletar `radar_credits`, `radar_credits_usage`, `radar_credits_requests`, `radar_saved_filters`.
- **Módulo Áudios**: Deletar `audio_generations`, `audio_variations`, `audio_files`.
- **Módulos no Catálogo**: Remover as entradas correspondentes na tabela `modules` (usando os slugs `baseoff`, `autolead`, `meu-numero`, `radar`, `audios`).

### 3. Ordem de Execução
1.  **Migração SQL**: Deletar tabelas e registros para liberar espaço e limpar o schema.
2.  **Remoção de Código**: Deletar os diretórios dos módulos.
3.  **Atualização de Configurações**: Limpar os arquivos de rotas, componentes lazy e menu lateral.

### Detalhes Técnicos
- As tabelas serão removidas com `DROP TABLE IF EXISTS ... CASCADE` para garantir que dependências (como chaves estrangeiras) não impeçam a remoção.
- O arquivo `src/integrations/supabase/types.ts` será atualizado automaticamente após a migração.
- Verificarei se existem permissões específicas (colunas em `profiles`) que também podem ser removidas.

---
**Deseja que eu comece executando a migração do banco de dados primeiro?**