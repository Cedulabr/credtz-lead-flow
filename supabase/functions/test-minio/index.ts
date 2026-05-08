const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENDPOINT = "https://s3.minio.werkonnect.xyz";
const BUCKET = "supabase";
const REGION = "us-east-1";

async function hmac(key: ArrayBuffer | Uint8Array, data: string) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
}
async function sha256hex(data: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}
const enc = (s: string) => new TextEncoder().encode(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ACCESS_KEY = Deno.env.get("MINIO_ACCESS_KEY");
  const SECRET_KEY = Deno.env.get("MINIO_SECRET_KEY");
  if (!ACCESS_KEY || !SECRET_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "Missing MINIO keys" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const method = "GET";
    const url = new URL(`${ENDPOINT}/${BUCKET}/?list-type=2&max-keys=1`);
    const host = url.host;
    const amzdate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const datestamp = amzdate.slice(0, 8);
    const payloadHash = await sha256hex("");
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzdate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = `${method}\n${url.pathname}\nlist-type=2&max-keys=1\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const credScope = `${datestamp}/${REGION}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzdate}\n${credScope}\n${await sha256hex(canonicalRequest)}`;
    const kDate = await hmac(enc("AWS4" + SECRET_KEY), datestamp);
    const kRegion = await hmac(kDate, REGION);
    const kService = await hmac(kRegion, "s3");
    const kSigning = await hmac(kService, "aws4_request");
    const sig = [...await hmac(kSigning, stringToSign)].map(b => b.toString(16).padStart(2, "0")).join("");
    const auth = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;
    const res = await fetch(url, { method, headers: { Authorization: auth, "x-amz-date": amzdate, "x-amz-content-sha256": payloadHash } });
    const body = await res.text();
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, statusText: res.statusText, body: body.slice(0, 2000) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
