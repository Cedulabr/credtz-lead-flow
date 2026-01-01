import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordPayload {
  user_id: string;
  new_password?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ResetPasswordPayload = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with caller JWT to validate admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    const {
      data: { user },
      error: getUserError,
    } = await userClient.auth.getUser();
    
    console.log("User:", user?.id, "Error:", getUserError?.message);
    
    if (getUserError || !user) {
      console.error("Authentication failed:", getUserError?.message || "No user found");
      return new Response(JSON.stringify({ 
        error: "Não autenticado. Por favor, faça login novamente.",
        details: getUserError?.message 
      }), {
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

    // Use service role to update password
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { user_id, new_password } = payload;

    let finalPassword = new_password;
    
    // If no new password provided, generate one
    if (!finalPassword) {
      finalPassword = Math.random().toString(36).slice(-8) + "A1!";
    }

    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      user_id,
      { password: finalPassword }
    );

    if (updateError) {
      throw new Error(updateError.message);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: new_password ? "Password updated successfully" : "Password reset successfully",
        new_password: new_password ? undefined : finalPassword
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("admin-reset-password error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});