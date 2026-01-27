
# Plano: Sistema de Prevenção de Importação de Arquivos Duplicados

## Resumo Executivo
Este plano adiciona uma camada de proteção para evitar que o mesmo arquivo seja importado múltiplas vezes nos três módulos principais: **Leads Premium**, **Activate Leads** e **Consulta Base Off**. O sistema calculará um hash (checksum) do arquivo e verificará se já existe no histórico antes de permitir a importação.

---

## Estado Atual dos Módulos

### Leads Premium
- Verifica duplicatas por **nome + telefone + convênio** durante importação
- Atualiza campos vazios em registros duplicados (não perde dados)
- Executa varredura automática pós-importação
- **Não verifica** se o mesmo arquivo já foi importado

### Activate Leads  
- Verifica duplicatas por **nome + telefone** antes de inserir
- Filtra registros duplicados do CSV em tempo real
- Possui Duplicate Manager para resolução manual
- **Não verifica** se o mesmo arquivo já foi importado

### Consulta Base Off
- Usa UPSERT por **CPF** (clientes) e **CPF + contrato** (contratos)
- Processa arquivos grandes de forma assíncrona
- **Não verifica** se o mesmo arquivo já foi importado

---

## Solução Proposta

### 1. Modificações no Banco de Dados

Adicionar coluna `file_hash` à tabela `import_logs`:

```text
ALTER TABLE import_logs 
ADD COLUMN file_hash TEXT,
ADD COLUMN file_size_bytes BIGINT;

CREATE INDEX idx_import_logs_file_hash ON import_logs(file_hash);
```

Criar função RPC para verificar arquivo duplicado:

```text
CREATE FUNCTION check_duplicate_import(
  p_file_hash TEXT,
  p_module TEXT
) RETURNS TABLE(
  is_duplicate BOOLEAN,
  original_import_date TIMESTAMP,
  original_file_name TEXT,
  records_imported INTEGER
)
```

### 2. Função JavaScript para Cálculo de Hash

Criar utilitário reutilizável em `src/lib/fileHash.ts`:

```text
export async function calculateFileHash(file: File): Promise<string> {
  // Usa Web Crypto API para calcular SHA-256
  // Retorna hash em formato hexadecimal
}
```

### 3. Modificações por Módulo

#### Leads Premium (ImportBase.tsx)
- Calcular hash do arquivo após seleção
- Verificar via RPC antes de processar
- Mostrar alerta se arquivo já foi importado (com data e quantidade de registros)
- Oferecer opção de "Importar mesmo assim" ou "Cancelar"

#### Activate Leads (ActivateLeads.tsx)
- Calcular hash ao selecionar CSV
- Verificar duplicata antes de abrir preview
- Bloquear importação se arquivo for idêntico (mesmo hash)
- Permitir reimportação se confirmado pelo usuário

#### Consulta Base Off (ImportModal.tsx)
- Calcular hash antes do upload
- Verificar no banco antes de criar job
- Se duplicado: mostrar warning com opção de continuar

---

## Interface de Usuário

### Alerta de Arquivo Duplicado
Quando detectar arquivo já importado:

```text
+--------------------------------------------------+
|  ⚠️  Arquivo Já Importado                         |
|                                                   |
|  Este arquivo foi importado em 15/01/2026.        |
|  Foram processados 1.500 registros.               |
|                                                   |
|  Deseja importar novamente?                       |
|                                                   |
|  [Cancelar]  [Importar Mesmo Assim]              |
+--------------------------------------------------+
```

---

## Fluxo Técnico

```text
1. Usuário seleciona arquivo
         │
         ▼
2. Frontend calcula SHA-256 do arquivo
         │
         ▼
3. Chama RPC check_duplicate_import(hash, módulo)
         │
         ├──► Não duplicado ──► Continua importação normal
         │
         └──► Duplicado encontrado
                    │
                    ▼
         4. Exibe modal de confirmação
                    │
                    ├──► Usuário cancela ──► Fim
                    │
                    └──► Usuário confirma ──► Continua importação
                                                    │
                                                    ▼
                              5. Registra novo import_log com mesmo hash
```

---

## Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/XXXXX.sql` | Adicionar coluna file_hash e função RPC |
| `src/lib/fileHash.ts` | **Novo** - Utilitário para cálculo de hash |
| `src/components/ImportBase.tsx` | Adicionar verificação de hash antes de importar |
| `src/components/ActivateLeads.tsx` | Adicionar verificação de hash no handleImportSubmit |
| `src/modules/baseoff/components/ImportModal.tsx` | Adicionar verificação antes de criar job |

---

## Considerações Técnicas

### Performance
- O cálculo de hash usa Web Crypto API (nativa do browser, muito rápida)
- Arquivos de 100MB levam ~2 segundos para calcular
- A verificação no banco é instantânea (índice na coluna hash)

### Limitações
- Se o usuário modificar uma célula do arquivo, o hash será diferente
- Não detecta "quase duplicados" (apenas arquivos idênticos byte a byte)
- Arquivos muito grandes (>500MB) podem demorar no cálculo do hash

### Fallback
- Se o cálculo de hash falhar, continua sem verificação (não bloqueia o usuário)
- Logs de erro são registrados para debug

---

## Benefícios

1. **Prevenção de erros humanos**: Evita importar o mesmo arquivo por engano
2. **Economia de recursos**: Não processa dados já existentes
3. **Auditoria melhorada**: Histórico de hashes permite rastrear reimportações
4. **UX aprimorada**: Usuário é informado antes de duplicar dados
5. **Consistência**: Mesma solução nos três módulos principais
