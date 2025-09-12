import type { Customer } from "@/types";
import { supabase } from "@/supabaseClient";

export const customerAPI = {
  async list(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone, email, address, notes")
      .order("name", { ascending: true });
    if (error) throw error;

    return (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone ?? undefined,
      email: c.email ?? undefined,
      address: c.address ?? undefined,
      notes: c.notes ?? undefined,
    }));
  },

  async getById(id: string): Promise<Customer | undefined> {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone, email, address, notes")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;

    return {
      id: data.id,
      name: data.name,
      phone: data.phone ?? undefined,
      email: data.email ?? undefined,
      address: data.address ?? undefined,
      notes: data.notes ?? undefined,
    };
  },

  async create(payload: Omit<Customer, "id">): Promise<Customer> {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: payload.name,
        phone: payload.phone ?? null,
        email: payload.email ?? null,
        address: payload.address ?? null,
        notes: payload.notes ?? null,
      })
      .select("id, name, phone, email, address, notes")
      .single();
    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      phone: data.phone ?? undefined,
      email: data.email ?? undefined,
      address: data.address ?? undefined,
      notes: data.notes ?? undefined,
    };
  },

  async update(id: string, patch: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from("customers")
      .update({
        name: patch.name,
        phone: patch.phone ?? null,
        email: patch.email ?? null,
        address: patch.address ?? null,
        notes: patch.notes ?? null,
      })
      .eq("id", id)
      .select("id, name, phone, email, address, notes")
      .single();
    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      phone: data.phone ?? undefined,
      email: data.email ?? undefined,
      address: data.address ?? undefined,
      notes: data.notes ?? undefined,
    };
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) throw error;
  },
};
