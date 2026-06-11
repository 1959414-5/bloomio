import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { getTenantFromAuth } from "../supabase.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const router = Router();

// Proxy seguro da IA (a chave fica só aqui, nunca no navegador).
// No frontend (módulo Marketing), troque o fetch para api.anthropic.com por este endpoint.
router.post("/gerar", async (req, res) => {
  try {
    const ctx = await getTenantFromAuth(req);
    if (!ctx) return res.status(401).json({ error: "não autenticado" });

    const { system, messages, max_tokens = 1000 } = req.body;
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens,
      system,
      messages,
    });
    const text = (msg.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    res.json({ text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
