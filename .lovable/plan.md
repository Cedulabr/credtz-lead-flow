

## Plano: Corrigir carregamento de usuarios ao selecionar empresa

### Problema identificado

O bug esta na funcao `fetchCompanyUsers` (linha 115-128 do `WhatsAppConfig.tsx`). Ela usa um join Supabase assim:

```
.from("user_companies")
.select("user_id, profiles:user_id(name, email)")
```

Esse join **nao funciona** porque nao existe uma Foreign Key direta entre `user_companies.user_id` e `profiles.id`. Ambas referenciam `auth.users(id)`, mas nao ha relacao direta entre si. O PostgREST silenciosamente retorna dados sem o join, resultando em `name` e `email` vazios.

### Correcao

Alterar `fetchCompanyUsers` para fazer duas consultas:

1. Buscar `user_id` de `user_companies` filtrado por `company_id`
2. Buscar `name` e `email` de `profiles` filtrado pelos `user_ids` encontrados

```text
// Passo 1: buscar user_ids da empresa
const { data: ucData } = await supabase
  .from("user_companies")
  .select("user_id")
  .eq("company_id", companyId)
  .eq("is_active", true);

// Passo 2: buscar profiles desses users
const userIds = ucData.map(d => d.user_id);
const { data: profilesData } = await supabase
  .from("profiles")
  .select("id, name, email")
  .in("id", userIds);
```

### Tambem corrigir: join na fetchInstances

O mesmo problema existe em `fetchInstances` (linha 140):
```
.select("*, profiles:user_id(name, email), companies:company_id(name)")
```

O join `profiles:user_id` tambem falha pela mesma razao. Corrigir para buscar profiles separadamente apos obter as instancias.

### Arquivo a modificar

| Arquivo | Mudanca |
|---|---|
| `src/components/WhatsAppConfig.tsx` | Corrigir `fetchCompanyUsers` e `fetchInstances` para usar duas queries em vez de join quebrado |

### Sequencia

1. Corrigir `fetchCompanyUsers` com consulta em duas etapas
2. Corrigir `fetchInstances` para popular `user_name`/`user_email` corretamente
3. Garantir que o Select de usuarios apareca e funcione tanto para Gestor quanto Admin

