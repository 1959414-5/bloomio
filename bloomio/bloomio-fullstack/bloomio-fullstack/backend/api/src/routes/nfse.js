import { Router } from "express";
import { getTenantFromAuth, supabaseAdmin } from "../supabase.js";

const router = Router();

// Emite NFS-e via provedor (Spedy ou E-Notas). Recebe os dados da transação.
router.post("/emitir", async (req, res) => {
  try {
    const ctx = await getTenantFromAuth(req);
    if (!ctx) return res.status(401).json({ error: "não autenticado" });

    const { amount, description, takerName, takerDoc } = req.body;
    const provider = process.env.NFSE_PROVIDER || "spedy";
    const apiKey = process.env.NFSE_API_KEY;
    const env = process.env.NFSE_ENV || "homologacao";

    // Dados do emissor (estabelecimento) vêm do tenant
    const { data: tenant } = await supabaseAdmin.from("tenants")
      .select("name, cnpj, settings").eq("id", ctx.tenantId).single();

    // ---- TODO: trocar pelo endpoint real do provedor escolhido ----
    // Exemplo Spedy (ajuste conforme a doc oficial):
    // const r = await fetch("https://api.spedy.com.br/v1/nfse", {
    //   method: "POST",
    //   headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    //   body: JSON.stringify({ ambiente: env, prestador: { cnpj: tenant.cnpj },
    //     servico: { descricao: description, valor: amount }, tomador: { nome: takerName, doc: takerDoc } })
    // });
    // const nota = await r.json();

    // Resposta simulada enquanto o provedor não está plugado:
    const nota = {
      numero: "NFS-" + Math.floor(100000 + Math.random() * 900000),
      status: env === "producao" ? "emitida" : "homologacao",
      provider, valor: amount,
      codigo_verificacao: Math.random().toString(36).slice(2, 18).toUpperCase(),
    };

    res.json({ ok: true, nota });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
