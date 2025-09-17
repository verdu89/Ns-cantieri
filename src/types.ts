// Cliente
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt?: string;
  notes?: string;
}

// Commesse (job_orders)
export interface JobOrder {
  id: string;
  code: string;
  customerId: string;
  location: {
    address?: string;
    mapsUrl?: string;
  };
  notes?: string;
  notesBackoffice?: string;
  createdAt: string;
  payments?: Payment[];
}

// Stati possibili per un job/intervento
export type JobStatus =
  | "in_attesa_programmazione"
  | "assegnato"
  | "in_corso"
  | "da_completare"
  | "completato"
  | "annullato"
  | "in_ritardo";

// Eventi di un job (check-in, check-out, ecc.)
export interface JobEvent {
  id: string;
  jobId: string;
  type: "check_in" | "check_out_completato" | "check_out_da_completare";
  timestamp: string;
  notes?: string;
  createdBy: string; // workerId o backoffice
  createdAt?: string;
  date?: string;
}

// Pagamenti di un job
export interface Payment {
  id: string;
  jobId: string;
  label: string;
  amount: number;
  collected: boolean;
  createdAt?: string | null;
  notes?: string;
  partial: boolean;
  collectedAmount: number;
}

// Worker (montatore)
export interface Worker {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  createdAt?: string;
  email?: string;
  role?: string;
}

// Documenti (sia commessa che job)
export interface Documento {
  id: string;
  commessaId?: string; // se legato a una commessa
  jobId?: string; // se legato a un job
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
}

// Lavori/Interventi (jobs)
export interface Job {
  id: string;
  jobOrderId: string;
  createdAt: string;
  plannedDate: string | null;
  title:
    | "consegna"
    | "montaggio"
    | "consegna_montaggio"
    | "assistenza"
    | "altro";
  notes?: string;
  notesBackoffice?: string;
  assignedWorkers: string[];
  status: JobStatus;
  events: JobEvent[];
  customer: Customer;
  team: Worker[];
  payments: Payment[];
  docs: Documento[];
  files: any[]; // se hai un sistema file separato
  location?: {
    address?: string;
    mapsUrl?: string;
  };
}

// Payload per creare un nuovo job
export type JobCreate = Omit<
  Job,
  "id" | "events" | "customer" | "team" | "payments" | "docs"
>;

// ===== Utenti (AuthContext) =====
// src/types/User.ts

export type UserRole = "worker" | "backoffice" | "admin";

export interface User {
  id: string; // id dell'utente Supabase (auth.users)
  email: string; // email dell'utente Supabase
  workerId: string; // id del record nella tabella workers
  name: string; // nome del worker (colonna "name" in workers)
  role: UserRole; // ruolo (worker, backoffice, admin)
}
