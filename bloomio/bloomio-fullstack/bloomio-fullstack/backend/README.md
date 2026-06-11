# Bloomio — Backend (Supabase + Railway)

Dois componentes:
- **supabase/schema.sql** → banco de dados, login, isolamento por estabelecimento (RLS) e Storage.
- **api/** → API Node (Railway) que guarda as chaves SECRETAS e fala com Stripe, Mercado Pago, NFS-e, WhatsApp e a IA.

---

## 1) Supabase (banco + login)
1. supabase.com → novo projeto (região São Paulo).
2. **SQL Editor → New query** → cole TODO o `supabase/schema.sql` → **Run**.
   - Cria tabelas, RLS por `tenant_id`, criação automática de estabelecimento no cadastro (Trial 15 dias) e o bucket de Storage.
3. **Authentication → Providers** → habilite **Email**. (Opcional: desligue confirmação de e-mail para testes.)
4. Anote em **Project Settings → API**: `URL`, `anon key` (frontend) e `service_role` (backend, secreto).

## 2) API no Railway
1. Suba a pasta `api/` num repositório e crie um projeto no Railway (ou `railway up`).
2. **Start command:** `npm start` · **Root:** `/api` (se subir tudo junto).
3. Em **Variables**, preencha conforme `api/.env.example` (Supabase service_role, Stripe, Mercado Pago, NFS-e, Evolution, Anthropic).
4. No **Stripe**: crie 3 produtos/preços **recorrentes mensais** (Starter, Profissional, Premium) e cole os `price_id` nas variáveis. Em **Developers → Webhooks**, aponte para `https://SUA-API.up.railway.app/webhooks/stripe` e cole o `whsec_...`.
5. No **Mercado Pago**: em Webhooks, aponte para `https://SUA-API.up.railway.app/webhooks/mercadopago`.

## 3) Ligar o frontend (Vercel)
Adicione variáveis públicas no projeto da Vercel:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=https://SUA-API.up.railway.app
```
No frontend, troque:
- **login demo** → `supabase.auth.signInWithPassword` / `signUp` (o trigger cria o tenant).
- **camada localStorage** → leituras/gravações via `@supabase/supabase-js` (a RLS já isola por estabelecimento).
- **assinar plano** → `POST {VITE_API_URL}/stripe/subscribe` e redireciona para `url`.
- **cancelar** → `POST /stripe/cancel`.
- **Pix WhatsApp** → `POST /mp/pix` (usa `qr_base64` + `copia_cola`).
- **emitir NFS-e** → `POST /nfse/emitir`.
- **WhatsApp** → `POST /whatsapp/enviar`.
- **Bloom AI (Marketing)** → trocar `fetch(api.anthropic.com...)` por `POST /ai/gerar`.
> Sempre envie o header `Authorization: Bearer <token do supabase>` para a API identificar o tenant.

## Endpoints da API
| Método | Rota | Função |
|---|---|---|
| POST | /stripe/subscribe | Cria checkout de assinatura (Stripe) |
| POST | /stripe/cancel | Cancela renovação (acesso até o fim do período) |
| POST | /webhooks/stripe | Ativa/renova/expira o plano + grava fatura |
| POST | /mp/pix | Gera Pix (add-on WhatsApp) |
| POST | /webhooks/mercadopago | Libera o add-on ao aprovar o Pix |
| POST | /nfse/emitir | Emite NFS-e (Spedy/E-Notas) |
| POST | /whatsapp/enviar | Envia mensagem (Evolution API) |
| POST | /ai/gerar | Proxy seguro da IA (Marketing) |

## Segurança (importante)
- `service_role`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, tokens do MP/NFS-e/Evolution **ficam só no Railway**. Nunca no frontend.
- A RLS garante que um estabelecimento nunca veja dados de outro.
- Webhooks validam assinatura (Stripe) e consultam o pagamento real (Mercado Pago).
