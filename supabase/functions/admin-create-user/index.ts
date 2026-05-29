import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserPayload {
  company: string;
  level?: string;
  name: string;
  email: string;
  password: string;
  pix_key?: string;
  cpf?: string;
  phone?: string;
  role: "admin" | "partner";
  company_id?: string | null;
  company_role?: "gestor" | "colaborador";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: CreateUserPayload = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with caller JWT to validate admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const {
      data: { user },
      error: getUserError,
    } = await userClient.auth.getUser();
    if (getUserError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify admin role using has_role function
    const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Use service role to create auth user and profile
    const adminClient = createClient(supabaseUrl, serviceKey);

    let { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: { name: payload.name },
    });

    let existingUserReused = false;
    if (createErr || !created?.user) {
      const msg = (createErr?.message || "").toLowerCase();
      const alreadyExists = msg.includes("already") && msg.includes("registered");
      if (!alreadyExists) {
        throw new Error(createErr?.message || "Failed to create user");
      }
      // Find existing user by email and reuse it (idempotent re-link)
      let foundUser: any = null;
      for (let page = 1; page <= 20 && !foundUser; page++) {
        const { data: list, error: listErr } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
        if (listErr) throw new Error(listErr.message);
        foundUser = list.users.find((u: any) => (u.email || "").toLowerCase() === payload.email.toLowerCase());
        if (!list.users.length || list.users.length < 200) break;
      }
      if (!foundUser) throw new Error("Usuário com este email já existe, mas não foi possível localizá-lo.");
      // Reset password to the one provided
      await adminClient.auth.admin.updateUserById(foundUser.id, {
        password: payload.password,
        email_confirm: true,
        user_metadata: { name: payload.name },
      });
      created = { user: foundUser } as any;
      existingUserReused = true;
    }

    // Default restrictive permissions: only Televendas, Gestão Televendas, Digitação and PortFlow enabled
    const ALL_PERMISSIONS = [
      "can_access_premium_leads", "can_access_indicar", "can_access_gerador_propostas",
      "can_access_activate_leads", "can_access_baseoff_consulta", "can_access_meus_clientes",
      "can_access_televendas", "can_access_gestao_televendas", "can_access_digitacao",
      "can_access_financas", "can_access_documentos", "can_access_alertas",
      "can_access_tabela_comissoes", "can_access_minhas_comissoes", "can_access_relatorio_desempenho",
      "can_access_colaborativo", "can_access_controle_ponto", "can_access_meu_numero",
      "can_access_sms", "can_access_whatsapp", "can_access_radar", "can_access_autolead",
      "can_access_audios", "can_access_portflow",
    ];
    const ENABLED_BY_DEFAULT = new Set([
      "can_access_televendas",
      "can_access_gestao_televendas",
      "can_access_digitacao",
      "can_access_portflow",
    ]);
    const permissionDefaults: Record<string, boolean> = {};
    // Admins keep everything enabled; partners get the restricted defaults
    for (const key of ALL_PERMISSIONS) {
      permissionDefaults[key] = payload.role === "admin" ? true : ENABLED_BY_DEFAULT.has(key);
    }

    // Upsert profile with new columns + default permissions
    const { error: profileErr } = await adminClient
      .from("profiles")
      .upsert({
        id: created.user.id,
        role: payload.role,
        name: payload.name,
        email: payload.email,
        company: payload.company,
        level: payload.level,
        pix_key: payload.pix_key,
        cpf: payload.cpf,
        phone: payload.phone,
        ...permissionDefaults,
      });

    if (profileErr) throw new Error(profileErr.message);

    // If company_id is provided and valid, link user to company (upsert to be idempotent)
    if (payload.company_id && payload.company_id !== "none") {
      // Remove any previous links to avoid duplicates, then insert the requested one
      await adminClient
        .from("user_companies")
        .delete()
        .eq("user_id", created.user.id);

      const { error: companyErr } = await adminClient
        .from("user_companies")
        .insert({
          user_id: created.user.id,
          company_id: payload.company_id,
          company_role: payload.company_role || "colaborador"
        });

      if (companyErr) {
        console.error("Error linking user to company:", companyErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: created.user.id, reused: existingUserReused }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("admin-create-user error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
