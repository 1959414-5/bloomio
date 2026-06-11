import { Router } from "express";
import { getTenantFromAuth, supabaseAdmin } from "../supabase.js";

const router = Router();

// Envia mensagem via Evolution API. Só funciona se o add-on WhatsApp estiver ativo.
router.post("/enviar", async (req, res) => {
  try {
    const ctx = await getTenantFromAuth(req);
    if (!ctx) return res.status(401).json({ error: "não autenticado" });

    const { data: tenant } = await supabaseAdmin.from("tenants")
      .select("whatsapp_active").eq("id", ctx.tenantId).single();
    if (!tenant?.whatsapp_active)
      return res.status(402).json({ error: "Módulo WhatsApp não ativado." });

    const { to, message } = req.body;

    const r = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${ctx.tenantId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY },
      body: JSON.stringify({ number: to, text: message }),
    });
    const data = await r.json().catch(() => ({}));
    res.json({ ok: r.ok, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
