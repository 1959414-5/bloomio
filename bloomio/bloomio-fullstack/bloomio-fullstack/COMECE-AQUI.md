# COMECE AQUI — Bloomio (frontend + backend)

Este pacote tem tudo para colocar o `bloomio.com.br` no ar e transformá-lo em SaaS de verdade.

```
bloomio-fullstack/
  frontend/   → app React (Vite). Deploy na Vercel. Roda em modo DEMO sem backend.
  backend/    → Supabase (banco+login) + API Node (Railway) com as integrações.
```

## Caminho recomendado

### FASE 1 — site no ar (hoje, ~15 min)
1. `cd frontend` → `npm install` → `npm run dev` (testa local).
2. Suba `frontend/` no GitHub.
3. Vercel → importe o repo → Deploy (detecta Vite sozinha).
4. Aponte `bloomio.com.br` na Hostinger para a Vercel (registros A/CNAME que a Vercel mostrar).
   → Detalhes em `frontend/README.md`.
   ✅ Site no ar em modo demo (dados no navegador).

### FASE 2 — backend (vira SaaS real)
1. **Supabase:** rode `backend/supabase/schema.sql` no SQL Editor; ative Auth (Email).
2. **Railway:** suba `backend/api/`; preencha as variáveis (`backend/api/.env.example`); crie os preços no Stripe e configure os webhooks.
   → Detalhes em `backend/README.md`.
3. **Conectar o frontend:** crie o `.env` do `frontend/` (`frontend/.env.example`) e siga o `frontend/INTEGRATION.md` (login → Supabase, dados → Supabase, pagamentos/NFS-e/WhatsApp/IA → API).
   → As bibliotecas já estão prontas em `frontend/src/lib/` (supabase.js, api.js).

## Regra de ouro de segurança
- **Frontend (Vercel):** só `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`.
- **Backend (Railway):** todas as chaves secretas (service_role, Stripe secret, Anthropic, Mercado Pago, NFS-e, Evolution). Nunca no navegador.
- A RLS do Supabase isola os dados de cada estabelecimento automaticamente.

## Mapa
| Camada | Onde | Pasta |
|---|---|---|
| App + domínio | Vercel (+ DNS Hostinger) | `frontend/` |
| Banco, login, storage | Supabase | `backend/supabase/` |
| API, segredos, integrações | Railway | `backend/api/` |

Bom lançamento! 🌱
