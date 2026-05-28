import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InRow {
  name: string;
  phone: string;
  phone2?: string | null;
  phone3?: string | null;
  phone4?: string | null;
  phone5?: string | null;
  tag?: string | null;
  document?: string | null;
}
interface Body {
  rows: InRow[];
  file_name: string;
  agent_ids: string[];
  assignment_mode: "round_robin" | "manual" | "pool";
  manual_assignments?: Array<{ index: number; agent_id: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Authorization: must be admin or gestor
    const { data: isAdminRow } = await service.rpc("has_role", { _user_id: uid, _role: "admin" });
    let isAdmin = !!isAdminRow;
    let companyId: string | null = null;

    if (!isAdmin) {
      const { data: uc } = await service
        .from("user_companies")
        .select("company_id")
        .eq("user_id", uid)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      companyId = uc?.company_id ?? null;
      if (!companyId) {
        return new Response(JSON.stringify({ error: "no_company" }), { status: 403, headers: corsHeaders });
      }
      const { data: isGestor } = await service.rpc("is_company_gestor", { _user_id: uid, _company_id: companyId });
      if (!isGestor) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
      }
    }

    const body = (await req.json()) as Body;
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "no_rows" }), { status: 400, headers: corsHeaders });
    }
    const agentIds = body.agent_ids || [];
    if (agentIds.length === 0) {
      return new Response(JSON.stringify({ error: "no_agents" }), { status: 400, headers: corsHeaders });
    }

    // Resolve company_id for admin if not set (use first agent's company)
    if (!companyId) {
      const { data: uc } = await service
        .from("user_companies")
        .select("company_id")
        .eq("user_id", agentIds[0])
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      companyId = uc?.company_id ?? null;
    }

    // Normalize + validate phones
    const norm = (p: string) => (p || "").replace(/\D/g, "");
    const valid = rows
      .map((r, i) => ({
        ...r,
        phone: norm(r.phone),
        phone2: r.phone2 ? norm(r.phone2) : null,
        phone3: r.phone3 ? norm(r.phone3) : null,
        phone4: r.phone4 ? norm(r.phone4) : null,
        phone5: r.phone5 ? norm(r.phone5) : null,
        tag: r.tag ? String(r.tag).trim() : null,
        document: r.document ? norm(r.document) : null,
        _idx: i,
      }))
      .filter(r => r.phone.length >= 10 && r.phone.length <= 13 && r.name);

    const phones = Array.from(new Set(valid.map(r => r.phone)));

    // Existing leads with these phones
    const { data: existingLeads } = await service
      .from("agibank_leads")
      .select("phone")
      .in("phone", phones);
    const existingSet = new Set((existingLeads || []).map((r: any) => r.phone));

    // Blacklisted phones
    const { data: blacklist } = await service
      .from("agibank_blacklist")
      .select("phone")
      .in("phone", phones);
    const blackSet = new Set((blacklist || []).map((r: any) => r.phone));

    // Create list record
    const { data: listRow, error: listErr } = await service
      .from("agibank_lead_lists")
      .insert({
        uploaded_by: uid,
        company_id: companyId,
        file_name: body.file_name || "import.csv",
        total_rows: rows.length,
        imported_rows: 0,
        skipped_duplicates: 0,
        skipped_blacklist: 0,
      })
      .select("id")
      .single();
    if (listErr) throw listErr;
    const listId = listRow!.id;

    let imported = 0;
    let dupCount = 0;
    let blackCount = 0;
    const seenInBatch = new Set<string>();
    const toInsert: any[] = [];

    const manualMap = new Map<number, string>();
    if (body.assignment_mode === "manual" && body.manual_assignments) {
      body.manual_assignments.forEach(m => manualMap.set(m.index, m.agent_id));
    }

    let rrIdx = 0;
    for (const r of valid) {
      if (blackSet.has(r.phone)) { blackCount++; continue; }
      if (existingSet.has(r.phone) || seenInBatch.has(r.phone)) { dupCount++; continue; }
      seenInBatch.add(r.phone);
      const agentId =
        body.assignment_mode === "manual"
          ? manualMap.get(r._idx) || agentIds[rrIdx % agentIds.length]
          : agentIds[rrIdx % agentIds.length];
      rrIdx++;
      toInsert.push({
        agent_id: agentId,
        company_id: companyId,
        list_id: listId,
        name: r.name,
        phone: r.phone,
        phone2: r.phone2,
        phone3: r.phone3,
        phone4: r.phone4,
        phone5: r.phone5,
        tag: r.tag,
        document: r.document,
        status: "novo",
      });
    }
    // Add rows that failed phone validation as blacklist? No — count as skipped invalid.
    const invalidCount = rows.length - valid.length;

    if (toInsert.length > 0) {
      const { error: insErr } = await service.from("agibank_leads").insert(toInsert);
      if (insErr) throw insErr;
      imported = toInsert.length;
    }

    await service
      .from("agibank_lead_lists")
      .update({
        imported_rows: imported,
        skipped_duplicates: dupCount,
        skipped_blacklist: blackCount,
      })
      .eq("id", listId);

    return new Response(
      JSON.stringify({
        success: true,
        list_id: listId,
        total: rows.length,
        imported,
        skipped_duplicates: dupCount,
        skipped_blacklist: blackCount,
        skipped_invalid: invalidCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
