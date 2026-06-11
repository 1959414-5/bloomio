# Bloomio — Guia de Deploy

## Em que pé estamos (leitura honesta)

**Frontend: PRONTO para subir.** É um app React (Vite) de página única. Hoje ele guarda os dados no `localStorage` do navegador (funciona de verdade para teste/piloto em 1 dispositivo, sem login real entre máquinas).

**Backend: AINDA NÃO existe.** Tudo que envolve dinheiro, fiscal, mensagens e dados na nuvem está como "gancho" (a interface está pronta, mas a execução real precisa de servidor):

- Login/contas reais e dados na nuvem (multi-estabelecimento) → **Supabase**
- Assinatura recorrente + cancelamento → **Stripe** (chave secreta só no backend)
- Pix do add-on WhatsApp → **Mercado Pago** (idem)
- Emissão de NFS-e → **Spedy / E-Notas** (idem)
- Disparo de WhatsApp → **Evolution API** (idem)
- Gerador de conteúdo "Bloom AI" → chamada à API da Anthropic (precisa de **proxy** no backend; no navegador a chave ficaria exposta)

**Resumo:** dá para colocar `bloomio.com.br` no ar HOJE como app (com persistência local) e ir plugando o backend por etapas. Só não confunda: subir o frontend NÃO ativa pagamentos/fiscal/WhatsApp de verdade — isso vem na Fase 2.

---

## FASE 1 — Subir o frontend (bloomio.com.br no ar)

### 1) Rodar localmente
```bash
npm install
npm run dev
```
Abre em `http://localhost:5173`. Login de teste: qualquer e-mail/senha entra como dono; use `admin@bloomio.com` para abrir o Painel Admin.

### 2) Subir no GitHub
```bash
git init
git add .
git commit -m "Bloomio frontend v1"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/bloomio.git
git push -u origin main
```

### 3) Deploy na Vercel
1. vercel.com → **Add New → Project** → importe o repositório `bloomio`.
2. A Vercel detecta Vite sozinha. Confirme:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Deploy**. Em ~1 min você recebe uma URL `*.vercel.app` funcionando.

### 4) Apontar o domínio bloomio.com.br (Hostinger → Vercel)
1. Na Vercel: **Project → Settings → Domains → Add** → digite `bloomio.com.br` e `www.bloomio.com.br`.
2. A Vercel mostra os registros DNS. No painel da **Hostinger** (DNS / Zona DNS), crie:
   - Registro **A** `@` → `76.76.21.21`
   - Registro **CNAME** `www` → `cname.vercel-dns.com`
   (use exatamente os valores que a Vercel exibir — podem variar)
3. Aguarde a propagação (minutos a algumas horas). A Vercel emite o **SSL (https)** automaticamente.

✅ Pronto: `bloomio.com.br` no ar como app (dados no navegador).

---

## FASE 2 — Backend (transformar em SaaS de verdade)

Ordem recomendada. Cada etapa entra sem quebrar o que já está no ar.

### A) Supabase — banco + login + arquivos
1. supabase.com → novo projeto (escolha região São Paulo).
2. **Auth**: ative e-mail/senha → substitui o login de demonstração.
3. **Database**: crie as tabelas multi-estabelecimento. Modelo mínimo:
   - `tenants` (estabelecimentos) — id, nome, cnpj, plano, status, expires, auto_renew
   - `users` — id, tenant_id, nome, email, role
   - `clients`, `services`, `products`, `professionals`, `appointments`, `sales`, `transactions`, `commissions`, `leads`, `anamneses`, `contratos`, `invoices`
   - Toda tabela com `tenant_id` + **RLS (Row Level Security)** filtrando por `tenant_id` do usuário logado (isolamento entre estabelecimentos).
4. **Storage**: bucket para logos/ícones (Portal e comprovantes).
5. No frontend, troque a camada de `localStorage` por chamadas ao `@supabase/supabase-js` (a estrutura de dados do app já espelha essas tabelas).

### B) Railway — API/segredos + integrações
Suba um serviço Node (Express/Fastify) que guarda as chaves SECRETAS e fala com os provedores. Endpoints essenciais:
- `POST /stripe/subscribe` e `POST /webhooks/stripe` → ativa/renova/cancela assinatura (atualiza `tenants` no Supabase).
- `POST /mp/pix` e `POST /webhooks/mercadopago` → Pix do add-on WhatsApp; libera o módulo ao confirmar.
- `POST /nfse/emitir` → repassa para Spedy/E-Notas e devolve a nota.
- `POST /whatsapp/enviar` → Evolution API.
- `POST /ai/gerar` → proxy da API da Anthropic (a chave fica AQUI, nunca no navegador). No frontend, troque a chamada direta a `api.anthropic.com` por uma chamada a este endpoint.

Variáveis de ambiente no Railway (exemplos):
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
ANTHROPIC_API_KEY=sk-ant-...
NFSE_API_KEY=...
EVOLUTION_API_URL=...
FRONTEND_URL=https://bloomio.com.br
```
> Configure **CORS** liberando `https://bloomio.com.br`.

### C) Ligar tudo
- No frontend (Vercel), adicione variáveis públicas: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (URL do Railway).
- Os botões que hoje fazem "simulação/gancho" passam a chamar os endpoints do Railway.

---

## Mapa rápido de onde cada coisa roda
| Camada | Onde | O que faz |
|---|---|---|
| Frontend (este projeto) | Vercel | Interface + bloomio.com.br |
| Banco + Auth + Storage | Supabase | Dados, login, logos |
| API + segredos + integrações | Railway | Stripe, Mercado Pago, NFS-e, WhatsApp, proxy IA |
| Domínio | Hostinger (DNS) → Vercel | bloomio.com.br |

## Observações
- A chamada de IA no módulo Marketing falha em produção até existir o proxy (item B `/ai/gerar`). O resto do app funciona normalmente sem backend.
- Pagamentos, NFS-e e WhatsApp **só funcionam de verdade após a Fase 2** — a interface já está preparada para "plugar".
