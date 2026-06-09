// ══════════════════════════════════════════════════════════════
// MantenimientoApp — Stripe Webhook Handler
// Supabase Edge Function: supabase/functions/stripe-webhook/index.ts
// ══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""
    );
  } catch (err) {
    console.error("Webhook signature error:", err);
    return new Response("Webhook Error", { status: 400 });
  }

  const sub = event.data.object as Stripe.Subscription;

  switch (event.type) {

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const customerId = sub.customer as string;
      const isActive = sub.status === "active" || sub.status === "trialing";
      const plan = sub.metadata?.plan || "tecnico";
      const extraTecnicos = parseInt(sub.metadata?.extra_tecnicos || "0");
      const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;

      // Find profile by stripe_customer_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!profile) break;

      // Update profile status
      await supabase.from("profiles").update({
        status: isActive ? "activo" : sub.status === "canceled" ? "bloqueado" : "demo",
        stripe_subscription_id: sub.id,
        plan,
        extra_tecnicos: extraTecnicos,
      }).eq("id", profile.id);

      // Upsert membership record
      await supabase.from("memberships").upsert({
        profile_id: profile.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        plan,
        status: sub.status,
        extra_tecnicos: extraTecnicos,
        amount_usd: amount,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }, { onConflict: "stripe_subscription_id" });

      break;
    }

    case "customer.subscription.deleted": {
      const customerId = sub.customer as string;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!profile) break;

      await supabase.from("profiles").update({
        status: "bloqueado",
        stripe_subscription_id: null,
        plan: null,
      }).eq("id", profile.id);

      await supabase.from("memberships").update({
        status: "canceled",
      }).eq("stripe_subscription_id", sub.id);

      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        await supabase.from("profiles").update({ status: "activo" }).eq("id", profile.id);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        await supabase.from("profiles").update({ status: "bloqueado" }).eq("id", profile.id);
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});