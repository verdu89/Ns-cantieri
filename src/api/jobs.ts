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
    phone: w.phone ?? undefined,
    userId: w.user_id ?? w.userId,
  }));
}

function baseSelect() {
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
    customer: { id: "", phone: "", name: "" } as Customer,
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
    .select(
      `
      id,
      jobId:job_id,
      label,
      amount,
      collected,
      partial,
      collectedAmount:collected_amount
    `
    )
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
    createdAt: null,
  }));
}

/* ===================== Stato centralizzato (solo visuale) ===================== */
function autoUpdateStatus(job: Job): Job {
  if (!job.plannedDate) return job;

  const now = new Date();
  const planned = new Date(job.plannedDate);

  // Caso 1: assegnato → in_corso quando è arrivata l’ora
  if (job.status === "assegnato" && planned <= now) {
    return { ...job, status: "in_corso" };
  }

  // Caso 2: in_corso → in_ritardo dopo le 17 dello stesso giorno
  if (job.status === "in_corso") {
    const cutoff = new Date(planned);
    cutoff.setHours(17, 0, 0, 0);

    if (now > cutoff) {
      return { ...job, status: "in_ritardo" };
    }
  }

  return job;
}

/* ===================== API ===================== */

export const jobAPI = {
  async list(): Promise<Job[]> {
    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
  ${baseSelect()},
  job_orders!jobs_job_order_id_fkey (
    customer_id
  )
`
      )

      .order("planned_date", { ascending: true });

    if (error) throw error;

    const jobs = (data || []).map((j: any) => {
      const base = mapBase(j);

      // Carichiamo il cliente solo se presente
      if (j.job_orders?.customer_id) {
        base.customer.id = j.job_orders.customer_id;
      }

      return base;
    });

    for (const j of jobs) {
      j.payments = await loadPayments(j.id);
    }

    // ✅ Carichiamo tutti i clienti in un’unica query e poi li abbiniamo
    const customerIds = [
      ...new Set(jobs.map((j) => j.customer?.id).filter(Boolean)),
    ];

    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone")
        .in("id", customerIds);

      for (const j of jobs) {
        const cust = customers?.find((c) => c.id === j.customer?.id);
        if (cust) j.customer = cust;
      }
    }

    return jobs.map(autoUpdateStatus);
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
    }

    return jobs.map(autoUpdateStatus);
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
    }

    return jobs.map(autoUpdateStatus);
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
      .select(
        `
        id,
        jobId:job_id,
        fileName:file_name,
        fileUrl:file_url,
        uploadedBy:uploaded_by,
        createdAt:created_at
      `
      )
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
      .select(
        `
        id,
        jobId:job_id,
        date,
        type,
        notes
      `
      )
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

    // 🔹 ritorna job con stato calcolato a runtime
    return autoUpdateStatus({
      ...base,
      customer: customer ?? base.customer,
      team,
      payments: mappedPayments,
      docs: mappedDocs,
      events: mappedEvents,
    });
  },

  async create(
    payload: Omit<
      Job,
      "id" | "events" | "payments" | "docs" | "team" | "customer"
    >
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
    if (payload.location !== undefined)
      insertPayload.location = payload.location;

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
