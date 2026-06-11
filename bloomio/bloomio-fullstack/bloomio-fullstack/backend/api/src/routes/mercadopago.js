import { Router } from "express";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { supabaseAdmin, getTenantFromAuth } from "../supabase.js";

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
const router = Router();

// Gera um Pix (ex.: ativar o módulo WhatsApp por R$49). Retorna QR + copia-e-cola.
router.post("/pix", async (req, res) => {
  try {
    const ctx = await getTenantFromAuth(req);
    if (!ctx) return res.status(401).json({ error: "não autenticado" });
    const { amount = 49, description = "Add-on WhatsApp Bloomio" } = req.body;

    const payment = await new Payment(mp).create({
      body: {
        transaction_amount: Number(amount),
        description,
        payment_method_id: "pix",
        payer: { email: req.body.email || "cliente@bloomio.com.br" },
        metadata: { tenant_id: ctx.tenantId, kind: "whatsapp_addon" },
      },
    });
    const tx = payment.point_of_interaction?.transaction_data;
    res.json({
      id: payment.id,
      qr_base64: tx?.qr_code_base64,   // imagem do QR (base64)
      copia_cola: tx?.qr_code,         // Pix copia e cola
      status: payment.status,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Webhook do Mercado Pago: ao aprovar, libera o add-on no tenant.
export async function mpWebhook(req, res) {
  try {
    const paymentId = req.body?.data?.id;
    if (paymentId) {
      const payment = await new Payment(mp).get({ id: paymentId });
      if (payment.status === "approved") {
        const tenantId = payment.metadata?.tenant_id;
        if (payment.metadata?.kind === "whatsapp_addon" && tenantId) {
          await supabaseAdmin.from("tenants").update({ whatsapp_active: true }).eq("id", tenantId);
        }
      }
    }
    res.sendStatus(200);
  } catch (e) { res.sendStatus(200); } // sempre 200 para o MP não reenviar infinito
}

export default router;
