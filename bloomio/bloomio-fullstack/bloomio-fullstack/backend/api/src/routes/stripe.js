import { Router } from "express";
import Stripe from "stripe";
import { supabaseAdmin, getTenantFromAuth } from "../supabase.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = Router();

const PRICE = {
  Starter: process.env.STRIPE_PRICE_STARTER,
  Profissional: process.env.STRIPE_PRICE_PROFISSIONAL,
  Premium: process.env.STRIPE_PRICE_PREMIUM,
};

// Cria a sessão de checkout (assinatura recorrente). Frontend redireciona para session.url.
router.post("/subscribe", async (req, res) => {
  try {
    const ctx = await getTenantFromAuth(req);
    if (!ctx) return res.status(401).json({ error: "não autenticado" });
    const { plan } = req.body;
    const price = PRICE[plan];
    if (!price) return res.status(400).json({ error: "plano inválido" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: ctx.tenantId,
      metadata: { tenant_id: ctx.tenantId, plan },
      success_url: `${process.env.FRONTEND_URL}/?assinatura=ok`,
      cancel_url: `${process.env.FRONTEND_URL}/?assinatura=cancel`,
    });
    res.json({ url: session.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cancela a renovação (mantém acesso até o fim do período pago).
router.post("/cancel", async (req, res) => {
  try {
    const ctx = await getTenantFromAuth(req);
    if (!ctx) return res.status(401).json({ error: "não autenticado" });
    const { data: t } = await supabaseAdmin.from("tenants")
      .select("stripe_subscription_id").eq("id", ctx.tenantId).single();
    if (t?.stripe_subscription_id) {
      await stripe.subscriptions.update(t.stripe_subscription_id, { cancel_at_period_end: true });
    }
    await supabaseAdmin.from("tenants").update({ auto_renew: false }).eq("id", ctx.tenantId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Webhook do Stripe: confirma pagamento, atualiza tenant e grava a fatura.
export async function stripeWebhook(req, res) {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) { return res.status(400).send(`Webhook error: ${err.message}`); }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const tenantId = s.metadata?.tenant_id || s.client_reference_id;
      const plan = s.metadata?.plan;
      const expires = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
      await supabaseAdmin.from("tenants").update({
        plan, status: "Ativo", auto_renew: true, expires,
        stripe_customer_id: s.customer, stripe_subscription_id: s.subscription,
      }).eq("id", tenantId);
      await supabaseAdmin.from("invoices").insert({
        tenant_id: tenantId, num: "BLM-" + Date.now().toString().slice(-8),
        plan, amount: (s.amount_total || 0) / 100, status: "Pago", provider: "stripe",
      });
    }
    if (event.type === "invoice.paid") {
      const inv = event.data.object;
      const expires = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
      await supabaseAdmin.from("tenants").update({ status: "Ativo", expires })
        .eq("stripe_subscription_id", inv.subscription);
    }
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      await supabaseAdmin.from("tenants").update({ status: "Expirado", auto_renew: false })
        .eq("stripe_subscription_id", sub.id);
    }
    res.json({ received: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

export default router;
