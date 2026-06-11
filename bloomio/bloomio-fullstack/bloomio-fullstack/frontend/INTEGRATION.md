# Integração do Frontend com Supabase + API

As bibliotecas já estão prontas em `src/lib/`:
- `supabase.js` → auth + dados (com RLS por estabelecimento)
- `api.js` → chamadas ao backend (Stripe, Pix, NFS-e, WhatsApp, IA)

> **Modo demo:** sem as variáveis `VITE_*` o app continua rodando com `localStorage` (ótimo pra testar). Ao preencher o `.env`, ele passa a usar o backend real.

A IA do Marketing **já está ligada** ao proxy automaticamente (usa `/ai/gerar` quando `VITE_API_URL` existe; senão chama direto).

Faltam 3 trocas no `src/BloomioApp.jsx`. Todas opcionais para o demo, necessárias para produção.

---

## 1) Login real (substituir o demo)
No componente `LoginScreen`, importe no topo do arquivo:
```js
import { signIn, signUp, recoverPassword, hasSupabase } from "./lib/supabase.js";
```
No `submit` do login, quando `hasSupabase` for true, troque o "qualquer e-mail entra" por:
```js
try {
  const user = mode === "signup"
    ? await signUp({ email, password: pass, name, business: biz })
    : await signIn({ email, password: pass });
  onLogin({ name: name || email, email, role: email === "admin@bloomio.com" ? "admin" : "owner" });
} catch (e) { setErr(e.message || "Falha no login"); }
```
E no fluxo "Esqueceu a senha?": `await recoverPassword(email)` em vez do envio simulado.
No "Sair" (menu do perfil), chame `await signOut()` antes de `setUser(null)`.

## 2) Camada de dados (localStorage → Supabase)
O app guarda tudo em arrays de estado (`clients`, `services`, ...) dentro de `BloomioApp()`, e persiste no `localStorage`. Para usar o banco:

**a)** Carregue do Supabase ao logar (dentro de `BloomioApp`):
```js
import { hasSupabase, listAll, loadTenant } from "./lib/supabase.js";

useEffect(() => {
  if (!hasSupabase || !user) return;
  (async () => {
    setClients(await listAll("clients"));
    setServices(await listAll("services"));
    setProducts(await listAll("products"));
    setProfessionals(await listAll("professionals"));
    setAppointments(await listAll("appointments"));
    setSales(await listAll("sales"));
    setTransactions(await listAll("transactions"));
    setCommissions(await listAll("commissions"));
    setLeads(await listAll("leads"));
    const tenant = await loadTenant();
    if (tenant?.settings) setSettings((s) => ({ ...s, ...tenant.settings, plan: { ...s.plan, name: tenant.plan, status: tenant.status, expires: tenant.expires, autoRenew: tenant.auto_renew, price: tenant.price } }));
  })();
}, [user]);
```

**b)** Nas funções do `dataApi` (addClient, removeClient, etc.), chame os helpers do Supabase além de atualizar o estado. Exemplo:
```js
import { insertRow, updateRow, deleteRow, saveTenantSettings } from "./lib/supabase.js";

addClient: async (c) => {
  const row = hasSupabase ? await insertRow("clients", { ...c, tenant_id: undefined }) : { ...c, id: uid() };
  setClients((s) => [row, ...s]);
},
removeClient: async (id) => { if (hasSupabase) await deleteRow("clients", id); setClients((s) => s.filter((x) => x.id !== id)); },
```
> Repita o padrão para services/products/professionals/appointments/sales/transactions/commissions/leads.
> Para `settings`, ao salvar chame `saveTenantSettings(settings)`.
> Quando `hasSupabase` é true, **não** grave no `localStorage` (deixe o banco ser a fonte).

## 3) Pagamentos, NFS-e, WhatsApp via API
Importe `import { api } from "./lib/api.js";` e troque os "ganchos":
```js
// Assinar plano (Stripe) — no PlanoModal / RenewGate, em vez de ativar local:
const { url } = await api.subscribe(plan.name);
window.location.href = url;          // volta já ativo via webhook

// Cancelar assinatura:
await api.cancelSubscription();

// Pix do WhatsApp (PixPagamentoModal): use api.pix(49) e mostre qr_base64 + copia_cola

// Emitir NFS-e (TxDetailModal):
const { nota } = await api.emitirNFSe({ amount: tx.amount, description: tx.description, takerName: tx.client });

// Enviar WhatsApp:
await api.enviarWhatsapp(cliente.phone, mensagem);
```

---

## Dica de migração sem dor
Faça por partes: primeiro **auth** (item 1) → depois **leitura** dos dados (2a) → depois **escrita** (2b) → por fim **pagamentos/integrações** (3). A cada parte, teste. Como o app cai em modo demo quando falta `VITE_*`, você nunca fica sem um ambiente funcionando.
