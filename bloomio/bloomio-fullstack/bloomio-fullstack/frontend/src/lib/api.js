// Cliente da API (Railway). Envia sempre o token do Supabase no header.
const API_URL = import.meta.env.VITE_API_URL || "";

function authHeader() {
  let token = "";
  try { token = localStorage.getItem("bloomio_token") || ""; } catch (e) {}
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function post(path, body) {
  if (!API_URL) throw new Error("VITE_API_URL não configurada");
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body || {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Erro na API");
  return data;
}

export const api = {
  // Assinatura (Stripe) — redirecione para data.url
  subscribe: (plan) => post("/stripe/subscribe", { plan }),
  cancelSubscription: () => post("/stripe/cancel", {}),

  // Pix do add-on WhatsApp (Mercado Pago) — use qr_base64 + copia_cola
  pix: (amount, description) => post("/mp/pix", { amount, description }),

  // NFS-e
  emitirNFSe: (payload) => post("/nfse/emitir", payload),

  // WhatsApp (Evolution)
  enviarWhatsapp: (to, message) => post("/whatsapp/enviar", { to, message }),

  // IA (Marketing)
  gerarConteudo: (system, messages) => post("/ai/gerar", { system, messages }),
};

export const hasApi = !!API_URL;
