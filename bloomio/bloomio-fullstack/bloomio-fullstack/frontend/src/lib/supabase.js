// =====================================================================
// BLOOMIO — lib/supabase.js
// Helpers para conectar o frontend ao Supabase.
// Coloque este arquivo em: frontend/src/lib/supabase.js
// =====================================================================
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const hasSupabase = !!(url && key);
export const supabase = hasSupabase ? createClient(url, key) : null;

// ---------- AUTH ----------

export async function signUp({ email, password, name, business }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, business }, // vai pro trigger handle_new_user
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function recoverPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset`,
  });
  if (error) throw error;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ---------- PERFIL / TENANT ----------

export async function loadProfile() {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .single();
  return data;
}

export async function loadTenant() {
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .single();
  return data;
}

export async function saveTenantSettings(settings) {
  const tenant = await loadTenant();
  if (!tenant) return;
  const { error } = await supabase
    .from("tenants")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", tenant.id);
  if (error) throw error;
}

// ---------- CRUD GENÉRICO ----------

export async function listAll(table, orderBy = "created_at", asc = false) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order(orderBy, { ascending: asc });
  if (error) throw error;
  return data || [];
}

export async function insertRow(table, row) {
  // tenant_id é preenchido automaticamente pelo RLS/trigger
  const clean = { ...row };
  delete clean.id; // deixa o Postgres gerar
  delete clean.tenant_id; // o RLS cuida
  const { data, error } = await supabase
    .from(table)
    .insert(clean)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRow(table, id, changes) {
  const clean = { ...changes };
  delete clean.tenant_id;
  const { data, error } = await supabase
    .from(table)
    .update(clean)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRow(table, id) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ---------- STORAGE (avatares/logos) ----------

export async function uploadImage(file, path) {
  const ext = file.name.split(".").pop();
  const filePath = `${path}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return data.publicUrl;
}