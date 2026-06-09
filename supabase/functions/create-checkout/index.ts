// ══════════════════════════════════════════════════════════════
// MantenimientoApp — Create Stripe Checkout Session
// Supabase Edge Function: supabase/functions/create-checkout/index.ts
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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { profileId, plan, extraTecnicos = 0, successUrl, cancelUrl } = await req.json();

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (!profile) return new Response("Profile not found", { status: 404, headers: CORS });

    // Create or retrieve Stripe customer
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || "",
        name: profile.name,
        metadata: { profile_id: profileId },
      });
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", profileId);
    }

    // Build line items based on plan
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (plan === "tecnico") {
      lineItems.push({
        price: Deno.env.get("STRIPE_PRICE_TECNICO"),
        quantity: 1,
      });
    } else if (plan === "empresarial") {
      lineItems.push({
        price: Deno.env.get("STRIPE_PRICE_EMPRESARIAL"),
        quantity: 1,
      });
      // Extra tecnicos
      if (extraTecnicos > 0) {
        lineItems.push({
          price: Deno.env.get("STRIPE_PRICE_TECNICO_EXTRA"),
          quantity: extraTecnicos,
        });
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      success_url: successUrl || `${Deno.env.get("APP_URL")}?payment=success`,
      cancel_url: cancelUrl || `${Deno.env.get("APP_URL")}?payment=canceled`,
      subscription_data: {
        metadata: {
          profile_id: profileId,
          plan,
          extra_tecnicos: extraTecnicos.toString(),
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...CORS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Checkout error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...CORS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});