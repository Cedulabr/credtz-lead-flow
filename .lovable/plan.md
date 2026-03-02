

## Plano: Gestao de Instancias WhatsApp por Gestor e Admin

### Resumo

Transformar o modulo WhatsApp para que **Gestores** possam criar instancias e vincular a usuarios da sua empresa, e **Admins** possam criar instancias e vincular a qualquer empresa/usuario. Mostrar claramente a quem cada instancia esta vinculada. Redesenhar a interface com estetica premium.

---

### 1. Migracao de Banco de Dados (RLS)

As politicas RLS atuais ja permitem que admins vejam todas as instancias e gestores vejam instancias da empresa. Porem, faltam politicas para **gestores inserirem** instancias para outros usuarios e **admins inserirem/atualizarem** instancias para qualquer usuario/empresa.

**SQL Migration:**
- Atualizar politica de INSERT: permitir que gestores insiram instancias com `company_id` da sua empresa
- Atualizar politica de INSERT: permitir que admins insiram instancias para qualquer usuario/empresa
- Atualizar politica de UPDATE: garantir que admins possam atualizar qualquer instancia
- Atualizar politica de DELETE: gestores possam deletar instancias da sua empresa

```text
-- DROP e recriacao das politicas de INSERT, UPDATE e DELETE
-- INSERT: user_id = auth.uid() OR is_global_admin() OR is_company_gestor(company_id)
-- UPDATE: mesma logica
-- DELETE: mesma logica
```

### 2. Redesenhar `WhatsAppConfig.tsx`

Reescrever o componente com logica condicional baseada no perfil:

**Para Colaborador (comportamento atual):**
- Ve apenas suas proprias instancias
- Pode criar instancias vinculadas a si mesmo

**Para Gestor (novo):**
- Ve todas as instancias da sua empresa
- Pode criar instancias e vincular a qualquer usuario da empresa
- Formulario inclui Select de "Vincular ao usuario" (lista usuarios da empresa)
- Cada card de instancia mostra o nome do usuario vinculado

**Para Admin (novo):**
- Ve TODAS as instancias do sistema
- Pode criar instancias e vincular a qualquer empresa e usuario
- Formulario inclui Select de "Empresa" e Select de "Usuario"
- Cada card mostra empresa + usuario vinculado

**Melhorias esteticas:**
- Header com gradiente verde (estilo premium similar ao modulo SMS)
- Cards de instancia com layout mais rico: avatar do usuario, badge de status, empresa
- Icones e cores consistentes
- Separacao visual entre "Minhas Instancias" e "Instancias da Empresa/Sistema"

### 3. Dados adicionais no fetch

O `fetchInstances` precisa ser expandido para:
- **Gestor:** buscar instancias com `company_id` da empresa + join com `profiles` para nome do usuario
- **Admin:** buscar TODAS as instancias + join com `profiles` para nome do usuario + join com `companies` para nome da empresa
- Usar query com `.select("*, profiles:user_id(name, email)")` para trazer o nome do usuario vinculado

### 4. Formulario de criacao/edicao expandido

O Dialog de criacao tera campos condicionais:

```text
Colaborador: Nome + Token + Telefone
Gestor:      Nome + Token + Telefone + Select Usuario (da empresa)
Admin:       Nome + Token + Telefone + Select Empresa + Select Usuario
```

Ao selecionar empresa (admin), o Select de usuarios filtra automaticamente.

### 5. Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| `supabase/migrations/new.sql` | Atualizar RLS policies para gestor INSERT/DELETE |
| `src/components/WhatsAppConfig.tsx` | Reescrever completo com gestao por perfil + estetica premium |

### 6. Detalhes tecnicos

**Deteccao de perfil (ja existe no sistema):**
- `profile.role === 'admin'` para admin
- Query `user_companies` com `company_role = 'gestor'` para gestor
- Caso contrario: colaborador

**Busca de usuarios da empresa (para Select):**
```text
supabase.from('user_companies').select('user_id, profiles:user_id(name, email)')
  .eq('company_id', companyId).eq('is_active', true)
```

**Busca de empresas (para admin):**
```text
supabase.from('companies').select('id, name').eq('is_active', true)
```

**Layout dos cards de instancia (redesign):**
```text
+--------------------------------------------------+
| [Icone WhatsApp]  Nome da Instancia    [Badges]  |
| Telefone: 85 99999-9999                          |
| Vinculado a: Joao Silva                          |
| Empresa: Credtz Digital          [Test] [Edit] [X]|
+--------------------------------------------------+
```

### Sequencia de implementacao

1. Criar migracao SQL para atualizar RLS
2. Reescrever WhatsAppConfig.tsx com gestao por perfil e estetica premium

