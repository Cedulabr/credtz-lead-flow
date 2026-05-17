// Stripe webhook — handles subscription + one-time credit purchases.
// verify_jwt = false (Stripe doesn't send a JWT)
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, stripe-signature",
};

async function findModuleBySlug(slug: string) {
  const { data } = await supabase.from("modules").select("id, slug").eq("slug", slug).maybeSingle();
  return data;
}

async function upsertCompanyModule(args: {
  company_id: string;
  module_slug: string;
  status: string;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  current_period_start?: Date | null;
  current_period_end?: Date | null;
  cancel_at_period_end?: boolean;
  grace_period_until?: Date | null;
}) {
  const mod = await findModuleBySlug(args.module_slug);
  if (!mod) {
    console.error("module not found:", args.module_slug);
    return;
  }
  const payload: any = {
    company_id: args.company_id,
    module_id: mod.id,
    module_slug: args.module_slug,
    status: args.status,
    stripe_subscription_id: args.stripe_subscription_id ?? null,
    stripe_customer_id: args.stripe_customer_id ?? null,
    current_period_start: args.current_period_start?.toISOString() ?? null,
    current_period_end: args.current_period_end?.toISOString() ?? null,
    cancel_at_period_end: args.cancel_at_period_end ?? false,
    grace_period_until: args.grace_period_until?.toISOString() ?? null,
    updated_at: new Date().toISOString(),
  };
  if (args.status === "active" || args.status === "trialing") {
    payload.activated_at = new Date().toISOString();
  }
  if (args.status === "canceled") {
    payload.canceled_at = new Date().toISOString();
  }
  await supabase.from("company_modules").upsert(payload, { onConflict: "company_id,module_id" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, webhookSecret);
  } catch (err) {
    console.error("webhook signature error", err);
    return new Response(`signature verification failed: ${err}`, { status: 400 });
  }

  // Idempotency
  const { error: dupErr } = await supabase
    .from("billing_events")
    .insert({ stripe_event_id: event.id, type: event.type, payload: event as any });
  if (dupErr && dupErr.code === "23505") {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const md = s.metadata || {};
        const company_id = md.company_id;
        const module_slug = md.module_slug;
        if (!company_id || !module_slug) break;

        if (s.mode === "payment") {
          const credits = parseInt(md.credits || "0", 10);
          if (credits > 0) {
            await supabase.rpc("credit_wallet", {
              _company_id: company_id,
              _module_slug: module_slug,
              _amount: credits,
              _type: "purchase",
              _reference_id: s.id,
              _metadata: { stripe_session_id: s.id, amount_total: s.amount_total },
            });
          }
        } else if (s.mode === "subscription" && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription as string);
          await upsertCompanyModule({
            company_id,
            module_slug,
            status: sub.status,
            stripe_subscription_id: sub.id,
            stripe_customer_id: sub.customer as string,
            current_period_start: new Date(sub.current_period_start * 1000),
            current_period_end: new Date(sub.current_period_end * 1000),
            cancel_at_period_end: sub.cancel_at_period_end,
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const md = sub.metadata || {};
        const company_id = md.company_id;
        const module_slug = md.module_slug;
        if (!company_id || !module_slug) break;
        await upsertCompanyModule({
          company_id,
          module_slug,
          status: sub.status,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer as string,
          current_period_start: new Date(sub.current_period_start * 1000),
          current_period_end: new Date(sub.current_period_end * 1000),
          cancel_at_period_end: sub.cancel_at_period_end,
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const md = sub.metadata || {};
        if (md.company_id && md.module_slug) {
          await upsertCompanyModule({
            company_id: md.company_id,
            module_slug: md.module_slug,
            status: "canceled",
            stripe_subscription_id: sub.id,
            stripe_customer_id: sub.customer as string,
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
          const md = sub.metadata || {};
          if (md.company_id && md.module_slug) {
            const grace = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 dias
            await upsertCompanyModule({
              company_id: md.company_id,
              module_slug: md.module_slug,
              status: "past_due",
              stripe_subscription_id: sub.id,
              stripe_customer_id: sub.customer as string,
              grace_period_until: grace,
            });
            await supabase.from("invoices").upsert({
              company_id: md.company_id,
              user_id: md.user_id ?? null,
              module_slug: md.module_slug,
              stripe_invoice_id: inv.id,
              stripe_subscription_id: sub.id,
              stripe_customer_id: sub.customer as string,
              amount_paid: (inv.amount_paid ?? 0) / 100,
              currency: inv.currency ?? "brl",
              status: "open",
              hosted_invoice_url: inv.hosted_invoice_url ?? null,
              invoice_pdf: inv.invoice_pdf ?? null,
              period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
              period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
            }, { onConflict: "stripe_invoice_id" });
          }
        }
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
          const md = sub.metadata || {};
          if (md.company_id && md.module_slug) {
            await upsertCompanyModule({
              company_id: md.company_id,
              module_slug: md.module_slug,
              status: "active",
              stripe_subscription_id: sub.id,
              stripe_customer_id: sub.customer as string,
              current_period_start: new Date(sub.current_period_start * 1000),
              current_period_end: new Date(sub.current_period_end * 1000),
              cancel_at_period_end: sub.cancel_at_period_end,
            });
            await supabase.from("invoices").upsert({
              company_id: md.company_id,
              user_id: md.user_id ?? null,
              module_slug: md.module_slug,
              stripe_invoice_id: inv.id,
              stripe_subscription_id: sub.id,
              stripe_customer_id: sub.customer as string,
              amount_paid: (inv.amount_paid ?? 0) / 100,
              currency: inv.currency ?? "brl",
              status: "paid",
              hosted_invoice_url: inv.hosted_invoice_url ?? null,
              invoice_pdf: inv.invoice_pdf ?? null,
              period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
              period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
            }, { onConflict: "stripe_invoice_id" });
          }
        }
        break;
      }
    }

    await supabase
      .from("billing_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("webhook handler error", err);
    await supabase
      .from("billing_events")
      .update({ error: String(err) })
      .eq("stripe_event_id", event.id);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
