import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DebugLoginPayload {
  user_id: string;
  password: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: DebugLoginPayload = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with caller JWT to validate admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
      auth: { persistSession: false, autoRefreshToken: false },
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

    // Verify admin role
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

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userRes, error: userErr } = await adminClient.auth.admin.getUserById(payload.user_id);

    if (userErr || !userRes?.user) {
      throw new Error(userErr?.message || "User not found");
    }

    const email = userRes.user.email;

    const auth_user = {
      id: userRes.user.id,
      email,
      email_confirmed_at: (userRes.user as any).email_confirmed_at ?? null,
      confirmed_at: (userRes.user as any).confirmed_at ?? null,
      banned_until: (userRes.user as any).banned_until ?? null,
      last_sign_in_at: (userRes.user as any).last_sign_in_at ?? null,
      created_at: (userRes.user as any).created_at ?? null,
      updated_at: (userRes.user as any).updated_at ?? null,
    };

    // Test login with anon key (do NOT return session)
    const testClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { error: signInError } = await testClient.auth.signInWithPassword({
      email: email || "",
      password: payload.password,
    });

    const login_test = {
      ok: !signInError,
      error: signInError?.message,
    };

    return new Response(
      JSON.stringify({ success: true, auth_user, login_test }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("admin-debug-login error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
