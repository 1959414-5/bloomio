import { createClient } from "@supabase/supabase-js";

// Cliente admin (service_role) — roda só no backend, ignora RLS.
// Use com cuidado: SEMPRE filtre por tenant_id nas queries.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false } }
);

// Valida o token do usuário (Authorization: Bearer <jwt>) e devolve o tenant.
export async function getTenantFromAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("tenant_id, role").eq("id", user.id).single();
  return profile ? { userId: user.id, tenantId: profile.tenant_id, role: profile.role } : null;
}
