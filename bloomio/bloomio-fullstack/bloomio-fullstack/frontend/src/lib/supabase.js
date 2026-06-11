import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Só cria o client se as variáveis existirem (assim o app roda em modo demo sem Supabase).
export const supabase = url && anon ? createClient(url, anon) : null;
export const hasSupabase = !!supabase;

// Guarda o token de acesso para o frontend mandar à API (header Authorization).
export async function syncToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || "";
  try { token ? localStorage.setItem("bloomio_token", token) : localStorage.removeItem("bloomio_token"); } catch (e) {}
  return token;
}

// ---- AUTH ----
export async function signUp({ email, password, name, business }) {
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { name, business } },
  });
  if (error) throw error;
  await syncToken();
  return data.user;
}

export async function signIn({ email, password }) {
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await syncToken();
  return data.user;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
  try { localStorage.removeItem("bloomio_token"); } catch (e) {}
}

export async function recoverPassword(email) {
  if (!supabase) throw new Error("Supabase não configurado");
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// ---- DADOS (helpers genéricos; a RLS já isola por estabelecimento) ----
export async function listAll(table) {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
  if (error) throw error; return data || [];
}
export async function insertRow(table, row) {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error; return data;
}
export async function updateRow(table, id, patch) {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).update(patch).eq("id", id).select().single();
  if (error) throw error; return data;
}
export async function deleteRow(table, id) {
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

// Config do estabelecimento (settings) fica em tenants.settings
export async function loadTenant() {
  if (!supabase) return null;
  const { data } = await supabase.from("tenants").select("*").single();
  return data;
}
export async function saveTenantSettings(settings) {
  if (!supabase) return;
  const { data: t } = await supabase.from("tenants").select("id").single();
  if (t) await supabase.from("tenants").update({ settings }).eq("id", t.id);
}
