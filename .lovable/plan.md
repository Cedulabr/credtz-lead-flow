

## Importacao Inteligente de Contatos SMS

### O que sera feito

1. **Botao "Baixar Modelo"** -- gera e baixa um arquivo CSV modelo com as colunas `nome;telefone` ja preenchidas com 2 exemplos para o usuario entender o formato.

2. **Importacao com validacao completa** -- ao importar CSV ou Excel:
   - Le o arquivo e extrai nome + telefone
   - Limpa telefones (remove caracteres nao numericos)
   - Valida formato (10 ou 11 digitos brasileiros)
   - Detecta telefones duplicados dentro do proprio arquivo
   - Detecta telefones que ja existem na lista de destino (consulta banco)
   - Separa em: validos, invalidos e duplicados

3. **Relatorio pos-importacao** -- Dialog com resumo visual:
   - Total de linhas lidas
   - Contatos validos importados (verde)
   - Telefones invalidos ignorados com lista dos numeros (vermelho)
   - Telefones duplicados ignorados com lista (amarelo)
   - Feedback claro ao usuario com cores e icones

---

### Detalhes Tecnicos

**Arquivo: `src/modules/sms/views/ContactsView.tsx`**

Alteracoes:
- Adicionar funcao `downloadTemplate()` que cria um CSV com header `nome;telefone` e 2 linhas de exemplo, e dispara download via `Blob` + `URL.createObjectURL`
- Botao "Baixar Modelo" ao lado de cada lista (icone Download)
- Reescrever `handleCsvImport` para:
  1. Aceitar `.csv` e `.xlsx`
  2. Ler arquivo (CSV via `text()`, XLSX via `xlsx` lib ja instalada)
  3. Normalizar telefones com `replace(/\D/g, "")`
  4. Validar: `phone.length === 10 || phone.length === 11`
  5. Detectar duplicados internos com `Set`
  6. Consultar `sms_contacts` da lista para encontrar telefones ja existentes
  7. Inserir apenas os validos e nao duplicados
  8. Abrir Dialog de relatorio com os resultados

- Novo state para o Dialog de relatorio: `importReport` com campos `{ total, imported, invalid, duplicatesInternal, duplicatesExisting, invalidPhones, duplicatePhones }`

**Nenhuma alteracao de banco de dados necessaria** -- a tabela `sms_contacts` ja existe com as colunas necessarias.

### Resultado Esperado

1. Usuario clica "Baixar Modelo" e recebe CSV pronto para preencher
2. Ao importar, o sistema valida todos os telefones automaticamente
3. Ao concluir, um relatorio visual mostra exatamente quantos foram importados, quantos tinham problemas e quais eram os numeros com erro
4. Apenas contatos validos e unicos sao inseridos na lista

