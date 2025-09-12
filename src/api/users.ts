// api/users.ts
import { supabase } from "../supabaseClient";
import type { User, UserRole } from "../types";

function roleFromUser(u: any): UserRole {
  // 🔹 Prima controlla user_metadata.role
  const role = u?.user_metadata?.role as UserRole | undefined;
  if (role) return role;

  // 🔹 Fallback su app_metadata
  const appRole = u?.app_metadata?.role as UserRole | undefined;
  if (appRole) return appRole;

  // 🔹 Fallback finale: deduci da email
  const email: string | undefined = u?.email ?? u?.user_metadata?.email;
  if (email?.startsWith("admin")) return "admin";
  if (email?.endsWith("@saverplast.it")) return "backoffice";
  return "worker";
}

export const userAPI = {
  async login(email: string, password: string): Promise<User | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return null;

    // Recupero worker associato
    const { data: worker } = await supabase
      .from("workers")
      .select("id, name")
      .eq("user_id", data.user.id)
      .maybeSingle();

    return {
      id: data.user.id,
      email: data.user.email ?? email,
      workerId: worker?.id ?? "",
      name: worker?.name ?? "",
      role: roleFromUser(data.user),
    };
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  async me(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: worker } = await supabase
      .from("workers")
      .select("id, name")
      .eq("user_id", user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email ?? "",
      workerId: worker?.id ?? "",
      name: worker?.name ?? "",
      role: roleFromUser(user),
    };
  },
};

