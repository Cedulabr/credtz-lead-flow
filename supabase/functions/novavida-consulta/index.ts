import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getValidToken } from "../novavida-get-token/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NV_BASE = "https://wsnv.novavidati.com.br/WSLocalizador.asmx";

type Metodo = "NVBOOK_CEL_OBG" | "NVBOOK_CEL_OBG_WHATS" | "NVCHECK_JSON";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeCpf(raw: string) {
  return (raw || "").replace(/\D/g, "");
}

// --- minimal XML helpers ---
function decodeXmlEntities(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
function getTagText(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].trim() : null;
}
function getAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

function detectErrorStatus(text: string): string | null {
  if (/USUARIO, SENHA OU CLIENTE INCORRETO/i.test(text)) return "auth_error";
  if (/SEM ACESSO AO SISTEMA/i.test(text)) return "no_access";
  if (/QUANTIDADE CONFIGURADA ATINGIDA/i.test(text)) return "quota_exceeded";
  return null;
}

// xml -> generic JS object (shallow conversion that preserves arrays for repeated tags)
function xmlToObj(xml: string): any {
  // strip processing/declarations
  xml = xml.replace(/<\?xml[^?]*\?>/g, "").trim();
  const stack: any[] = [{}];
  const tagRe = /<\/?([A-Za-z0-9_]+)[^>]*>|([^<]+)/g;
  let m: RegExpExecArray | null;
  let currentKey = "";
  while ((m = tagRe.exec(xml))) {
    if (m[1]) {
      const tag = m[1];
      const isClose = m[0].startsWith("</");
      if (!isClose) {
        const obj: any = {};
        const parent = stack[stack.length - 1];
        if (parent[tag] === undefined) parent[tag] = obj;
        else if (Array.isArray(parent[tag])) parent[tag].push(obj);
        else parent[tag] = [parent[tag], obj];
        stack.push(obj);
        currentKey = tag;
      } else {
        stack.pop();
      }
    } else if (m[2]) {
      const txt = m[2].trim();
      if (txt) {
        const node = stack[stack.length - 1];
        // store text under "_text" if there are children, else replace object with string
        const parent = stack[stack.length - 2];
        if (parent && currentKey) {
          // if node has no own keys, replace it with string
          if (Object.keys(node).length === 0) {
            if (Array.isArray(parent[currentKey])) {
              parent[currentKey][parent[currentKey].length - 1] = decodeXmlEntities(txt);
            } else {
              parent[currentKey] = decodeXmlEntities(txt);
            }
          } else {
            node._text = decodeXmlEntities(txt);
          }
        }
      }
    }
  }
  return stack[0];
}

function pickArray(node: any, key: string): any[] {
  if (!node) return [];
  const v = node[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function asString(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v._text) return v._text;
  return String(v);
}

interface NormPhone {
  ddd: string | null;
  numero: string | null;
  numero_completo: string | null;
  tipo: "celular" | "fixo" | null;
  tem_whatsapp: boolean | null;
  procon: boolean | null;
  operadora: string | null;
  flhot: boolean | null;
  assinante: boolean | null;
  posicao: number | null;
}

function ynToBool(v: any): boolean | null {
  const s = asString(v).toUpperCase().trim();
  if (s === "S" || s === "SIM" || s === "TRUE" || s === "1") return true;
  if (s === "N" || s === "NAO" || s === "NÃO" || s === "FALSE" || s === "0") return false;
  return null;
}

function extractPhonesNvbook(consulta: any): NormPhone[] {
  const out: NormPhone[] = [];
  // <CONSULTA><CADASTRO>...<CELULARES><CELULAR>...
  const celulares = consulta?.CELULARES;
  const cels = pickArray(celulares ?? {}, "CELULAR");
  for (const c of cels) {
    const ddd = asString(c.DDDCEL) || null;
    const numero = asString(c.CEL) || null;
    out.push({
      ddd,
      numero,
      numero_completo: ddd && numero ? `${ddd}${numero}` : (numero ?? null),
      tipo: "celular",
      tem_whatsapp: ynToBool(c.FLWHATSAPP),
      procon: ynToBool(c.PROCON),
      operadora: null,
      flhot: null,
      assinante: null,
      posicao: null,
    });
  }
  const telefones = consulta?.TELEFONES;
  const fixs = pickArray(telefones ?? {}, "TELEFONE");
  for (const t of fixs) {
    const ddd = asString(t.DDD) || null;
    const numero = asString(t.TELEFONE) || null;
    out.push({
      ddd,
      numero,
      numero_completo: ddd && numero ? `${ddd}${numero}` : (numero ?? null),
      tipo: "fixo",
      tem_whatsapp: null,
      procon: ynToBool(t.PROCON),
      operadora: null,
      flhot: null,
      assinante: null,
      posicao: null,
    });
  }
  return out;
}

function extractPhonesNvcheck(consulta: any): NormPhone[] {
  const out: NormPhone[] = [];
  const arr = Array.isArray(consulta?.TELEFONES)
    ? consulta.TELEFONES
    : consulta?.TELEFONES
      ? [consulta.TELEFONES]
      : [];
  for (const t of arr) {
    const ddd = asString(t.DDD) || null;
    const numero = asString(t.TELEFONE) || null;
    const tipoCode = asString(t.TIPO_TELEFONE).toUpperCase();
    const tipo: "celular" | "fixo" | null =
      tipoCode === "C" ? "celular" : tipoCode === "F" ? "fixo" : null;
    out.push({
      ddd,
      numero,
      numero_completo: ddd && numero ? `${ddd}${numero}` : (numero ?? null),
      tipo,
      tem_whatsapp: null,
      procon: ynToBool(t.PROCON),
      operadora: asString(t.OPERADORA) || null,
      flhot: ynToBool(t.FLHOT),
      assinante: ynToBool(t.ASSINANTE),
      posicao: t.POSICAO ? Number(asString(t.POSICAO)) || null : null,
    });
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) return json({ error: "unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const cpfRaw = body.cpf as string | undefined;
    const metodo = body.metodo as Metodo | undefined;
    const leadId = (body.lead_id as string) || null;
    let companyId = body.company_id as string | undefined;

    if (!cpfRaw) return json({ error: "cpf_required" }, 400);
    if (!metodo || !["NVBOOK_CEL_OBG", "NVBOOK_CEL_OBG_WHATS", "NVCHECK_JSON"].includes(metodo)) {
      return json({ error: "invalid_metodo" }, 400);
    }

    const cpf = normalizeCpf(cpfRaw);
    if (cpf.length !== 11) return json({ error: "invalid_cpf" }, 400);

    if (!companyId) {
      const { data: uc } = await admin
        .from("user_companies")
        .select("company_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      companyId = uc?.company_id as string | undefined;
    }
    if (!companyId) return json({ error: "no_company" }, 400);

    // 7-day cache
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: cached } = await admin
      .from("telefonia_consultas")
      .select("id, resultado, status")
      .eq("company_id", companyId)
      .eq("cpf", cpf)
      .eq("metodo", metodo)
      .eq("status", "success")
      .gte("queried_at", sevenDaysAgo)
      .order("queried_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      const { data: phones } = await admin
        .from("telefonia_numeros")
        .select("*")
        .eq("consulta_id", cached.id);
      return json({
        status: "success",
        cached: true,
        consulta_id: cached.id,
        resultado: cached.resultado,
        telefones: phones ?? [],
      });
    }

    // Get token
    const tokenRes = await getValidToken(admin, companyId);
    if (tokenRes.error || !tokenRes.token) {
      return json({ error: tokenRes.error ?? "token_failed" }, 400);
    }
    const token = tokenRes.token;

    // Call Nova Vida
    let respText = "";
    let parsed: any = null;
    let httpStatus = 0;
    let url = "";
    try {
      if (metodo === "NVCHECK_JSON") {
        url = `${NV_BASE}/NVCHECKJson`;
        const r = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Token: token,
          },
          body: JSON.stringify({ nvcheck: { Documento: cpf } }),
        });
        httpStatus = r.status;
        respText = await r.text();
        try {
          parsed = JSON.parse(respText);
        } catch {
          parsed = { raw: respText };
        }
      } else {
        url =
          metodo === "NVBOOK_CEL_OBG"
            ? `${NV_BASE}/NVBOOK_CEL_OBG`
            : `${NV_BASE}/NvBookCelObWhats`;
        const form = new URLSearchParams();
        form.set("DOCUMENTO", cpf);
        form.set("TOKEN", token);
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
        httpStatus = r.status;
        respText = await r.text();
        // unwrap soap <string>...</string> if present
        let inner = respText;
        const wrap = inner.match(/<string[^>]*>([\s\S]*?)<\/string>/i);
        if (wrap) inner = decodeXmlEntities(wrap[1]);
        parsed = xmlToObj(inner);
      }
    } catch (e) {
      const errIns = await admin
        .from("telefonia_consultas")
        .insert({
          company_id: companyId,
          lead_id: leadId,
          cpf,
          metodo,
          resultado: { error: String(e?.message ?? e) },
          status: "error",
          error_message: String(e?.message ?? e),
          credits_used: 0,
          queried_by: userId,
        })
        .select("id")
        .single();
      return json({ status: "error", consulta_id: errIns.data?.id, error: String(e) }, 502);
    }

    // Detect API errors / not_found
    const errStatus = detectErrorStatus(respText);
    let status = "success";
    let errorMessage: string | null = null;
    let credits = 1;

    if (errStatus) {
      status = errStatus;
      errorMessage = respText.slice(0, 500);
      credits = 0;
    } else if (httpStatus < 200 || httpStatus >= 300) {
      status = "error";
      errorMessage = `http_${httpStatus}: ${respText.slice(0, 300)}`;
      credits = 0;
    } else {
      // detect empty consulta
      let isEmpty = false;
      if (metodo === "NVCHECK_JSON") {
        const cad = parsed?.d?.CONSULTA?.CADASTRAIS ?? parsed?.CONSULTA?.CADASTRAIS;
        if (!cad || (!cad.CPF && !cad.NOME && !cad.CNPJ)) isEmpty = true;
      } else {
        const cad = parsed?.CONSULTA?.CADASTRO;
        if (!cad) isEmpty = true;
      }
      if (isEmpty) {
        status = "not_found";
        credits = 0;
      }
    }

    // Insert consulta
    const { data: insConsulta, error: insErr } = await admin
      .from("telefonia_consultas")
      .insert({
        company_id: companyId,
        lead_id: leadId,
        cpf,
        metodo,
        resultado: parsed ?? { raw: respText },
        status,
        error_message: errorMessage,
        credits_used: credits,
        queried_by: userId,
      })
      .select("id")
      .single();

    if (insErr || !insConsulta) {
      return json({ error: "insert_failed", details: insErr?.message }, 500);
    }
    const consultaId = insConsulta.id as string;

    // Extract phones on success
    let telefones: NormPhone[] = [];
    if (status === "success") {
      if (metodo === "NVCHECK_JSON") {
        const consulta = parsed?.d?.CONSULTA ?? parsed?.CONSULTA ?? {};
        telefones = extractPhonesNvcheck(consulta);
      } else {
        const consulta = parsed?.CONSULTA ?? {};
        telefones = extractPhonesNvbook(consulta);
      }

      if (telefones.length > 0) {
        const rows = telefones.map((p) => ({
          consulta_id: consultaId,
          company_id: companyId,
          lead_id: leadId,
          cpf,
          ...p,
        }));
        await admin.from("telefonia_numeros").insert(rows);
      }
    }

    return json({
      status,
      cached: false,
      consulta_id: consultaId,
      resultado: parsed,
      telefones,
      error: errorMessage,
    });
  } catch (e) {
    console.error("novavida-consulta error", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
