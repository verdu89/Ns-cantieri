// api/workers.ts
import type { Worker } from "../types";
import { supabase } from "../supabaseClient";

/* ===================== Mapper DB -> App ===================== */
function mapWorker(row: any): Worker {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    userId: row.user_id ?? undefined, // snake_case → camelCase
  };
}

/* ===================== API ===================== */
export const workerAPI = {
  async list(): Promise<Worker[]> {
    const { data, error } = await supabase
      .from("workers")
      .select("id, name, phone, user_id");

    if (error) throw error;
    return (data ?? []).map(mapWorker);
  },

  async getById(id: string): Promise<Worker | undefined> {
    const { data, error } = await supabase
      .from("workers")
      .select("id, name, phone, user_id")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapWorker(data) : undefined;
  },

  async create(payload: Omit<Worker, "id">): Promise<Worker> {
    const { data, error } = await supabase
      .from("workers")
      .insert({
        name: payload.name,
        phone: payload.phone ?? null,
        user_id: payload.userId ?? null, // camelCase → snake_case
      })
      .select("id, name, phone, user_id")
      .single();

    if (error) throw error;
    return mapWorker(data);
  },

  async update(id: string, patch: Partial<Worker>): Promise<Worker> {
    const { data, error } = await supabase
      .from("workers")
      .update({
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.phone !== undefined && { phone: patch.phone ?? null }),
        ...(patch.userId !== undefined && { user_id: patch.userId ?? null }), // camelCase → snake_case
      })
      .eq("id", id)
      .select("id, name, phone, user_id")
      .single();

    if (error) throw error;
    return mapWorker(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("workers").delete().eq("id", id);
    if (error) throw error;
  },
};
