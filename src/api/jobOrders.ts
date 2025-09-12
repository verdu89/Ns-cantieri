import type { JobOrder } from "../types";
import { supabase } from "../supabaseClient";

export const jobOrderAPI = {
  async list(): Promise<JobOrder[]> {
    const { data, error } = await supabase
      .from("job_orders")
      .select("id, code, customer_id, location, notes, notes_backoffice, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data || []).map((o: any) => ({
      id: o.id,
      code: o.code,
      customerId: o.customer_id,
      location: o.location ?? {},
      notes: o.notes ?? undefined,
      notesBackoffice: o.notes_backoffice ?? undefined,
      createdAt: o.created_at,
    }));
  },

  async getById(id: string): Promise<JobOrder | undefined> {
    const { data, error } = await supabase
      .from("job_orders")
      .select("id, code, customer_id, location, notes, notes_backoffice, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;

    return {
      id: data.id,
      code: data.code,
      customerId: data.customer_id,
      location: data.location ?? {},
      notes: data.notes ?? undefined,
      notesBackoffice: data.notes_backoffice ?? undefined,
      createdAt: data.created_at,
    };
  },

  async listByCustomer(customerId: string): Promise<JobOrder[]> {
    const { data, error } = await supabase
      .from("job_orders")
      .select("id, code, customer_id, location, notes, notes_backoffice, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data || []).map((o: any) => ({
      id: o.id,
      code: o.code,
      customerId: o.customer_id,
      location: o.location ?? {},
      notes: o.notes ?? undefined,
      notesBackoffice: o.notes_backoffice ?? undefined,
      createdAt: o.created_at,
    }));
  },

  async create(payload: Omit<JobOrder, "id" | "createdAt">): Promise<JobOrder> {
    const { data, error } = await supabase
      .from("job_orders")
      .insert({
        code: payload.code,
        customer_id: payload.customerId,
        location: payload.location ?? null,
        notes: payload.notes ?? null,
        notes_backoffice: payload.notesBackoffice ?? null,
      })
      .select("id, code, customer_id, location, notes, notes_backoffice, created_at")
      .single();
    if (error) throw error;

    return {
      id: data.id,
      code: data.code,
      customerId: data.customer_id,
      location: data.location ?? {},
      notes: data.notes ?? undefined,
      notesBackoffice: data.notes_backoffice ?? undefined,
      createdAt: data.created_at,
    };
  },

  async update(id: string, patch: Partial<JobOrder>): Promise<JobOrder> {
    const { data, error } = await supabase
      .from("job_orders")
      .update({
        code: patch.code,
        customer_id: patch.customerId,
        location: patch.location ?? null,
        notes: patch.notes ?? null,
        notes_backoffice: patch.notesBackoffice ?? null,
      })
      .eq("id", id)
      .select("id, code, customer_id, location, notes, notes_backoffice, created_at")
      .single();
    if (error) throw error;

    return {
      id: data.id,
      code: data.code,
      customerId: data.customer_id,
      location: data.location ?? {},
      notes: data.notes ?? undefined,
      notesBackoffice: data.notes_backoffice ?? undefined,
      createdAt: data.created_at,
    };
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("job_orders").delete().eq("id", id);
    if (error) throw error;
  },
};
