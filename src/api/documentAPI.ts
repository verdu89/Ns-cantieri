import { supabase } from "../supabaseClient";
import type { Documento } from "../types";

export const documentAPI = {
  // 📂 Allegati COMMESSA
  async listByOrder(orderId: string): Promise<Documento[]> {
    const { data, error } = await supabase
      .from("order_document")
      .select("id, order_id, file_name, file_url, uploaded_by, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((d: any) => ({
      id: d.id,
      commessaId: d.order_id,
      fileName: d.file_name,
      fileUrl: d.file_url,
      uploadedBy: d.uploaded_by,
      createdAt: d.created_at,
    }));
  },

  async addToOrder(
    orderId: string,
    payload: Omit<Documento, "id" | "createdAt" | "commessaId">
  ): Promise<Documento> {
    const { data, error } = await supabase
      .from("order_document")
      .insert({
        order_id: orderId,
        file_name: payload.fileName,
        file_url: payload.fileUrl,
        uploaded_by: payload.uploadedBy,
      })
      .select("id, order_id, file_name, file_url, uploaded_by, created_at")
      .single();

    if (error) throw error;

    return {
      id: data.id,
      commessaId: data.order_id,
      fileName: data.file_name,
      fileUrl: data.file_url,
      uploadedBy: data.uploaded_by,
      createdAt: data.created_at,
    };
  },

  async deleteFromOrder(docId: string): Promise<void> {
    const { error } = await supabase
      .from("order_document")
      .delete()
      .eq("id", docId);
    if (error) throw error;
  },

  // 📂 Allegati JOB
  async listByJob(jobId: string): Promise<Documento[]> {
    const { data, error } = await supabase
      .from("job_document")
      .select("id, job_id, file_name, file_url, uploaded_by, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((d: any) => ({
      id: d.id,
      jobId: d.job_id,
      fileName: d.file_name,
      fileUrl: d.file_url,
      uploadedBy: d.uploaded_by,
      createdAt: d.created_at,
    }));
  },

  async addToJob(
    jobId: string,
    payload: Omit<Documento, "id" | "createdAt" | "jobId">
  ): Promise<Documento> {
    const { data, error } = await supabase
      .from("job_document")
      .insert({
        job_id: jobId,
        file_name: payload.fileName,
        file_url: payload.fileUrl,
        uploaded_by: payload.uploadedBy,
      })
      .select("id, job_id, file_name, file_url, uploaded_by, created_at")
      .single();

    if (error) throw error;

    return {
      id: data.id,
      jobId: data.job_id,
      fileName: data.file_name,
      fileUrl: data.file_url,
      uploadedBy: data.uploaded_by,
      createdAt: data.created_at,
    };
  },

  async deleteFromJob(docId: string): Promise<void> {
    const { error } = await supabase
      .from("job_document")
      .delete()
      .eq("id", docId);
    if (error) throw error;
  },
};
