// @ts-ignore-next-line
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
// @ts-ignore-next-line
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  // @ts-ignore-next-line
  Deno.env.get("SUPABASE_URL")!,
  // @ts-ignore-next-line
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// @ts-ignore-next-line
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  // @ts-ignore-next-line
  const dodoWebhookSecret = Deno.env.get("DODO_WEBHOOK_SECRET");
  if (!dodoWebhookSecret) {
    console.error("DODO_WEBHOOK_SECRET is not set.");
    return new Response("Server configuration error", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const webhook = new Webhook(dodoWebhookSecret);
  const rawBody = await req.text();
  const event = JSON.parse(rawBody);

  const webhookHeaders = {
    "webhook-id": req.headers.get("webhook-id") || "",
    "webhook-signature": req.headers.get("webhook-signature") || "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") || "",
  };

  console.info(`Received ${event.type} event`);

  try {
    await webhook.verify(rawBody, webhookHeaders);
  } catch (error) {
    console.error("Webhook verification failed:", error.message);
    return new Response("Invalid webhook signature", {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    switch (event.type) {
      // payment events
      case "payment.succeeded":
      case "payment.failed":
      case "payment.processing":
      case "payment.cancelled":
        await managePayment(event);
        break;

      // subscription events
      case "subscription.active":
      case "subscription.plan_changed":
        await manageSubscription(event);
        await updateUserTier({
          dodoCustomerId: event.data.customer.customer_id,
          subscriptionId: event.data.subscription_id,
        });
        break;

      case "subscription.renewed":
      case "subscription.on_hold":
        await manageSubscription(event);
        break;

      case "subscription.cancelled":
      case "subscription.expired":
      case "subscription.failed":
        await manageSubscription(event);
        await downgradeToHobbyPlan({
          dodoCustomerId: event.data.customer.customer_id,
        });
        break;

      default:
        console.warn(`Unhandled event type: ${event.type}`);

        return new Response("Unhandled event type", {
          status: 200,
          headers: corsHeaders,
        });
    }
  } catch (error) {
    console.error("Error processing webhook:", error.message);
    return new Response("Error processing webhook", {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function managePayment(event: any) {
  const data = {
    payment_id: event.data.payment_id,
    brand_id: event.data.brand_id,
    created_at: event.data.created_at,
    currency: event.data.currency,
    metadata: event.data.metadata,
    payment_method: event.data.payment_method,
    payment_method_type: event.data.payment_method_type,
    status: event.data.status,
    subscription_id: event.data.subscription_id,
    total_amount: event.data.total_amount,
    customer_email: event.data.customer.email,
    customer_name: event.data.customer.name,
    customer_id: event.data.customer.customer_id,
    webhook_data: event,
    billing: event.data.billing,
    business_id: event.data.business_id,
    card_issuing_country: event.data.card_issuing_country,
    card_last_four: event.data.card_last_four,
    card_network: event.data.card_network,
    card_type: event.data.card_type,
    discount_id: event.data.discount_id,
    disputes: event.data.disputes,
    error_code: event.data.error_code,
    error_message: event.data.error_message,
    payment_link: event.data.payment_link,
    product_cart: event.data.product_cart,
    refunds: event.data.refunds,
    settlement_amount: event.data.settlement_amount,
    settlement_currency: event.data.settlement_currency,
    settlement_tax: event.data.settlement_tax,
    tax: event.data.tax,
    updated_at: event.data.updated_at,
  };

  const { error } = await supabase.from("payments").upsert(data, {
    onConflict: "payment_id",
  });

  if (error) throw error;
  console.log(`Payment ${data.payment_id} upserted successfully.`);
}

async function manageSubscription(event: any) {
  const data = {
    subscription_id: event.data.subscription_id,
    addons: event.data.addons,
    billing: event.data.billing,
    cancel_at_next_billing_date: event.data.cancel_at_next_billing_date,
    cancelled_at: event.data.cancelled_at,
    created_at: event.data.created_at,
    currency: event.data.currency,
    customer_email: event.data.customer.email,
    customer_name: event.data.customer.name,
    customer_id: event.data.customer.customer_id,
    discount_id: event.data.discount_id,
    metadata: event.data.metadata,
    next_billing_date: event.data.next_billing_date,
    on_demand: event.data.on_demand,
    payment_frequency_count: event.data.payment_frequency_count,
    payment_period_interval: event.data.payment_frequency_interval,
    previous_billing_date: event.data.previous_billing_date,
    product_id: event.data.product_id,
    quantity: event.data.quantity,
    recurring_pre_tax_amount: event.data.recurring_pre_tax_amount,
    status: event.data.status,
    subscription_period_count: event.data.subscription_period_count,
    subscription_period_interval: event.data.subscription_period_interval,
    tax_inclusive: event.data.tax_inclusive,
    trial_period_days: event.data.trial_period_days,
  };

  const { error } = await supabase.from("subscriptions").upsert(data, {
    onConflict: "subscription_id",
  });

  if (error) throw error;
  console.log(`Subscription ${data.subscription_id} upserted successfully.`);
}

async function updateUserTier(props: {
  dodoCustomerId: string;
  subscriptionId: string;
}) {
  const { error } = await supabase
    .from("users")
    .update({ current_subscription_id: props.subscriptionId, plan: "pro" })
    .eq("dodo_customer_id", props.dodoCustomerId);

  if (error) throw error;
  console.log(`User tier updated for customer ${props.dodoCustomerId}.`);
}

async function downgradeToHobbyPlan(props: { dodoCustomerId: string }) {
  const { error } = await supabase
    .from("users")
    .update({ current_subscription_id: null, plan: "free" })
    .eq("dodo_customer_id", props.dodoCustomerId);

  if (error) throw error;
  console.log(`User downgraded for customer ${props.dodoCustomerId}.`);
}
