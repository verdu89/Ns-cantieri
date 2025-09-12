// api/jobs.ts
import type {
  Job,
  Worker,
  Payment,
  Documento,
  Customer,
  JobEvent,
} from "../types";
import { supabase } from "../supabaseClient";

/* ===================== Helpers ===================== */

function mapTeam(workerRows: any[]): Worker[] {
  return (workerRows || []).map((w) => ({
    id: w.id,
    name: w.name,
    phone: w.phone ?? undefined,   // se vuoi aggiungere anche il telefono
    userId: w.user_id ?? w.userId, // 👈 prende il valore dal DB o già mappato
  }));
}


function baseSelect() {
  // tutti i campi aliasati in camelCase
  return `
    id,
    jobOrderId:job_order_id,
    createdAt:created_at,
    plannedDate:planned_date,
    title,
    status,
    assignedWorkers:assigned_workers,
    notes,
    notesBackoffice:notes_backoffice,
    location
  `;
}

function mapBase(j: any): Job {
  return {
    id: j.id,
    jobOrderId: j.jobOrderId,
    createdAt: j.createdAt,
    plannedDate: j.plannedDate ? new Date(j.plannedDate).toISOString() : null,
    title: j.title ?? "",
    status: j.status,
    assignedWorkers: Array.isArray(j.assignedWorkers) ? j.assignedWorkers : [],
    notes: j.notes ?? null,
    notesBackoffice: j.notesBackoffice ?? null,
    location: j.location ?? {},
    customer: { id: "", name: "" } as Customer,
    team: [],
    payments: [],
    docs: [],
    events: [],
    files: [],
  };
}

async function loadPayments(jobId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id,
      jobId:job_id,
      label,
      amount,
      collected,
      partial,
      collectedAmount:collected_amount
    `)
    .eq("job_id", jobId);

  if (error) throw error;

  return (data || []).map((p: any) => ({
    id: p.id,
    label: p.label,
    amount: Number(p.amount),
    collected: p.collected,
    partial: p.partial ?? false,
    collectedAmount: p.collectedAmount ?? null,
    jobId: p.jobId,
    createdAt: null, // non esiste nel DB
  }));
}

/* ===================== Auto update stati ===================== */

async function autoUpdateStatus(job: Job): Promise<Job> {
  if (!job.plannedDate) return job;

  const now = new Date();
  const planned = new Date(job.plannedDate);
  let newStatus: Job["status"] | null = null;

  // se assegnato ed è arrivata l'ora → in_corso
  if (job.status === "assegnato" && planned <= now) {
    newStatus = "in_corso";
  }

  // se in_corso ed è passato → in_ritardo
  if (job.status === "in_corso" && planned < now) {
    newStatus = "in_ritardo";
  }

  if (newStatus) {
    const { error } = await supabase
      .from("jobs")
      .update({ status: newStatus })
      .eq("id", job.id);

    if (!error) {
      job.status = newStatus;
    }
  }

  return job;
}

/* ===================== API ===================== */

export const jobAPI = {
  async list(): Promise<Job[]> {
    const { data, error } = await supabase
      .from("jobs")
      .select(baseSelect())
      .order("planned_date", { ascending: true });

    if (error) throw error;

    const jobs = (data || []).map(mapBase);

    for (const j of jobs) {
      j.payments = await loadPayments(j.id);
      await autoUpdateStatus(j);
    }

    return jobs;
  },

  async listByOrder(orderId: string): Promise<Job[]> {
    const { data, error } = await supabase
      .from("jobs")
      .select(baseSelect())
      .eq("job_order_id", orderId)
      .order("planned_date", { ascending: true });

    if (error) throw error;

    const jobs = (data || []).map(mapBase);

    for (const j of jobs) {
      j.payments = await loadPayments(j.id);
      await autoUpdateStatus(j);
    }

    return jobs;
  },

  async listAssigned(userId: string): Promise<Job[]> {
    const { data, error } = await supabase
      .from("jobs")
      .select(baseSelect())
      .contains("assigned_workers", [userId])
      .order("planned_date", { ascending: true });

    if (error) throw error;

    const jobs = (data || []).map(mapBase);

    for (const j of jobs) {
      j.payments = await loadPayments(j.id);
      await autoUpdateStatus(j);
    }

    return jobs;
  },

  async getById(id: string): Promise<Job | undefined> {
    const { data: j, error } = await supabase
      .from("jobs")
      .select(baseSelect())
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!j) return undefined;

    const base = mapBase(j);

    // customer via job_orders
    const { data: order, error: orderErr } = await supabase
      .from("job_orders")
      .select("customerId:customer_id")
      .eq("id", base.jobOrderId)
      .maybeSingle();

    if (orderErr) throw orderErr;

    let customer: Customer | undefined;
    if (order?.customerId) {
      const { data: c, error: custErr } = await supabase
        .from("customers")
        .select("id, name, phone, email, address, notes")
        .eq("id", order.customerId)
        .maybeSingle();

      if (custErr) throw custErr;
      if (c) customer = c as Customer;
    }

    // team
    let team: Worker[] = [];
    if (base.assignedWorkers.length) {
      const { data: w, error: wErr } = await supabase
        .from("workers")
        .select("id, name")
        .in("id", base.assignedWorkers as string[]);

      if (wErr) throw wErr;
      team = mapTeam(w || []);
    }

    const mappedPayments = await loadPayments(id);

    // docs
    const { data: docs, error: docsErr } = await supabase
      .from("job_document")
      .select(`
        id,
        jobId:job_id,
        fileName:file_name,
        fileUrl:file_url,
        uploadedBy:uploaded_by,
        createdAt:created_at
      `)
      .eq("job_id", id)
      .order("created_at", { ascending: false });

    if (docsErr) throw docsErr;

    const mappedDocs: Documento[] = (docs || []).map((d: any) => ({
      id: d.id,
      name: d.fileName,
      type: "generic",
      url: d.fileUrl,
      uploadedBy: d.uploadedBy,
      uploadedAt: d.createdAt ?? null,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      createdAt: d.createdAt ?? null,
    }));

    // events
    const { data: events, error: evErr } = await supabase
      .from("job_events")
      .select(`
        id,
        jobId:job_id,
        date,
        type,
        notes
      `)
      .eq("job_id", id)
      .order("date", { ascending: true });

    if (evErr) throw evErr;

    const mappedEvents: JobEvent[] = (events || []).map((e: any) => ({
      id: e.id,
      date: e.date ?? null,
      type: e.type,
      notes: e.notes ?? null,
      jobId: e.jobId ?? id,
      timestamp: e.date ?? null,
      createdBy: "",
    }));

    const updatedJob = await autoUpdateStatus({
      ...base,
      customer: customer ?? base.customer,
      team,
      payments: mappedPayments,
      docs: mappedDocs,
      events: mappedEvents,
    });

    return updatedJob;
  },

  async create(
    payload: Omit<Job, "id" | "events" | "payments" | "docs" | "team" | "customer">
  ): Promise<Job> {
    const insertPayload: any = {
      job_order_id: payload.jobOrderId,
      title: payload.title,
      status: payload.status,
    };

    if (payload.plannedDate) {
      insertPayload.planned_date = new Date(payload.plannedDate).toISOString();
    }
    if (payload.assignedWorkers !== undefined) {
      insertPayload.assigned_workers = payload.assignedWorkers;
    }
    if (payload.notes !== undefined) insertPayload.notes = payload.notes;
    if (payload.notesBackoffice !== undefined) {
      insertPayload.notes_backoffice = payload.notesBackoffice;
    }
    if (payload.location !== undefined) insertPayload.location = payload.location;

    const { data, error } = await supabase
      .from("jobs")
      .insert(insertPayload)
      .select(baseSelect())
      .single();

    if (error) throw error;
    return mapBase(data);
  },

  async update(id: string, patch: Partial<Job>): Promise<Job> {
    const updatePayload: any = {};

    if (patch.jobOrderId !== undefined)
      updatePayload.job_order_id = patch.jobOrderId;
    if (patch.plannedDate)
      updatePayload.planned_date = new Date(patch.plannedDate).toISOString();
    if (patch.title !== undefined) updatePayload.title = patch.title;
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.assignedWorkers !== undefined)
      updatePayload.assigned_workers = patch.assignedWorkers;
    if (patch.notes !== undefined) updatePayload.notes = patch.notes;
    if (patch.notesBackoffice !== undefined)
      updatePayload.notes_backoffice = patch.notesBackoffice;
    if (patch.location !== undefined) updatePayload.location = patch.location;

    const { data, error } = await supabase
      .from("jobs")
      .update(updatePayload)
      .eq("id", id)
      .select(baseSelect())
      .single();

    if (error) throw error;
    return mapBase(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) throw error;
  },
};
