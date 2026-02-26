
## Evolucao do Modulo Controle de Ponto

### Problemas Identificados

1. **Historico (aba "Historico")**: Mostra apenas os registros do proprio usuario. Admin precisa ver todas as batidas de todos os usuarios com filtro por empresa.
2. **PDF da folha de ponto**: Gera apenas para o usuario logado. Admin precisa selecionar qualquer colaborador e gerar o espelho de ponto mensal.
3. **Batidas do Dia (aba "Painel")**: O ManagerDashboard busca todos os profiles sem filtro por empresa. Precisa de um filtro por empresa para controle por empresa.

---

### Plano de Implementacao

#### 1. Historico com visao Admin (MyHistory.tsx)

- Adicionar props opcionais `isAdmin` e `allUsers` ao componente
- Quando `isAdmin = true`:
  - Exibir um Select de "Colaborador" para o admin escolher qual usuario visualizar
  - Exibir um Select de "Empresa" para filtrar colaboradores por empresa
  - Buscar registros do usuario selecionado (ou de todos, se "Todos" estiver selecionado)
  - A tabela passa a exibir coluna "Colaborador" quando visualizando todos
- O componente TimeClockPDF ja recebe `userId` e `userName` -- quando admin seleciona outro usuario, passa os dados desse usuario para gerar o PDF correto

**Alteracao em `index.tsx`**: Na aba "history", quando `canManage`, passar `isAdmin={true}` e nao fixar o userId do usuario logado.

#### 2. PDF preciso por colaborador selecionado

- O TimeClockPDF ja suporta `userId` e `userName` como props -- basta que o MyHistory passe os dados do colaborador selecionado pelo admin
- Buscar a empresa do colaborador selecionado para preencher `companyName` e `companyCNPJ` no PDF
- Nenhuma alteracao no TimeClockPDF em si e necessaria, apenas no MyHistory que alimenta as props

#### 3. Filtro por empresa no Painel (ManagerDashboard.tsx)

- Buscar lista de empresas da tabela `companies`
- Adicionar Select de "Empresa" ao lado do campo de data no card "Batidas do Dia"
- Quando uma empresa for selecionada:
  - Filtrar profiles pelos usuarios que pertencem aquela empresa (via `user_companies`)
  - Filtrar `time_clock` registros apenas de usuarios daquela empresa
- Admins veem todas as empresas; gestores veem apenas sua empresa (pre-selecionada)
- Atualizar os cards de estatisticas para refletir o filtro

---

### Arquivos a Editar

| Arquivo | Alteracao |
|---|---|
| `src/components/TimeClock/MyHistory.tsx` | Adicionar modo admin com selects de empresa e colaborador, buscar registros de qualquer usuario |
| `src/components/TimeClock/index.tsx` | Passar props de admin para MyHistory quando `canManage` |
| `src/components/TimeClock/ManagerDashboard.tsx` | Adicionar filtro de empresa no card "Batidas do Dia" e filtrar dados por empresa |

### Fluxo do Admin

1. Admin abre aba "Historico" -- ve select de empresa e colaborador
2. Seleciona empresa -- lista de colaboradores filtra para aquela empresa
3. Seleciona colaborador (ou "Todos") -- tabela mostra registros
4. Clica em "Gerar PDF" -- gera espelho de ponto do colaborador selecionado com dados da empresa correta
5. Admin abre aba "Painel" -- ve select de empresa ao lado da data
6. Seleciona empresa -- cards e tabela de batidas filtram para aquela empresa
