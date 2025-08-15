import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserPayload {
  user_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: DeleteUserPayload = await req.json();

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

    // Use service role to delete user
    const adminClient = createClient(supabaseUrl, serviceKey);

    // First, update all related records to remove references to this user
    // Update leads where this user is referenced
    await adminClient
      .from('leads')
      .update({ created_by: null, assigned_to: null })
      .or(`created_by.eq.${payload.user_id},assigned_to.eq.${payload.user_id}`);

    // Update commissions where this user is referenced
    await adminClient
      .from('commissions')
      .update({ user_id: null })
      .eq('user_id', payload.user_id);

    // Update other tables that might reference this user
    await adminClient
      .from('lead_activities')
      .update({ created_by: null })
      .eq('created_by', payload.user_id);

    await adminClient
      .from('lead_attachments')
      .update({ uploaded_by: null })
      .eq('uploaded_by', payload.user_id);

    // Delete user from auth (this will cascade to profiles table)
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(payload.user_id);

    if (deleteErr) {
      throw new Error(deleteErr.message || "Failed to delete user");
    }

    return new Response(
      JSON.stringify({ success: true, message: "User deleted successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("admin-delete-user error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});