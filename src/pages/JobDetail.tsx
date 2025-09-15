import { Button } from "@/components/ui/Button";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { jobAPI } from "@/api/jobs";
import { workerAPI } from "@/api/workers";
import { documentAPI } from "@/api/documentAPI";
import { jobOrderAPI } from "@/api/jobOrders";
import { customerAPI } from "@/api/customers";
import { useAuth } from "@/context/AuthContext";
import type {
  Job,
  Worker,
  Payment,
  Documento,
  JobOrder,
  Customer,
} from "@/types";
import { toast } from "react-hot-toast";

// ✅ Componenti estratti
import JobHeader from "./job/JobHeader";
import JobStatusEditor from "./job/JobStatusEditor";
import JobPayments from "./job/JobPayments";
import JobDocuments from "./job/JobDocuments";
import JobNotes from "./job/JobNotes";
import JobCheckoutModal from "./job/JobCheckoutModal";
import JobCheckoutReport from "./job/JobCheckoutReport";

/* ===================== MAIN ===================== */
export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const jobId = id ?? "";

  const { user } = useAuth();
  const isBackoffice = user?.role === "backoffice" || user?.role === "admin";

  const currentUser = useMemo(() => {
    const display =
      (user as any)?.name ||
      (user as any)?.displayName ||
      (user as any)?.fullName ||
      (user as any)?.email?.split?.("@")?.[0] ||
      "Utente";
    return {
      id: (user as any)?.id || "user-unknown",
      name: String(display),
      role: (user as any)?.role || "montatore",
    };
  }, [user]);

  // ===== Stati =====
  const [job, setJob] = useState<Job | null>(null);
  const [order, setOrder] = useState<JobOrder | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orderDocs, setOrderDocs] = useState<Documento[]>([]);
  const [orderNotes, setOrderNotes] = useState<string>("");

  const [payments, setPayments] = useState<Payment[]>([]);
  const [finalConclusion, setFinalConclusion] = useState("");

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ultimato, setUltimato] = useState<"si" | "no" | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const [docs, setDocs] = useState<Documento[]>([]);
  const [assignedWorkers, setAssignedWorkers] = useState<string[]>([]);
  const [plannedLocal, setPlannedLocal] = useState<string>("");

  /* ========== Load Data ========== */
  const loadData = useCallback(async () => {
    if (!jobId) {
      setError("ID intervento non valido.");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);

      // 1) Carico job e workers
      const [j, w] = await Promise.all([
        jobAPI.getById(jobId),
        workerAPI.list(),
      ]);
      if (!j) {
        setError("Intervento non trovato.");
        setJob(null);
        setWorkers(w ?? []);
        return;
      }

      setJob(j);
      setAssignedWorkers(j.assignedWorkers ?? []);
      setPlannedLocal(
        j.plannedDate ? new Date(j.plannedDate).toISOString().slice(0, 16) : ""
      );
      setPayments(j.payments ?? []);

      // 2) ID commessa collegata
      const orderId: string | undefined =
        (j as any)?.jobOrderId || (j as any)?.orderId;

      // 3) Carico docs commessa, docs job, commessa
      const [oDocs, jDocs, orderObj] = await Promise.all([
        orderId
          ? documentAPI.listByOrder(orderId)
          : Promise.resolve<Documento[]>([]),
        documentAPI.listByJob(jobId),
        orderId
          ? jobOrderAPI.getById(orderId)
          : Promise.resolve<JobOrder | null>(null),
      ]);

      setOrderDocs(oDocs);
      setDocs(jDocs);

      // 4) Se ho la commessa, salvo note + cliente
      if (orderObj) {
        setOrder(orderObj);
        setOrderNotes(orderObj.notes ?? "");
        if (orderObj.customerId) {
          const cust = await customerAPI.getById(orderObj.customerId);
          setCustomer(cust ?? null);
        } else {
          setCustomer(null);
        }
      } else {
        setOrder(null);
        setOrderNotes("");
        setCustomer(null);
      }

      setWorkers(w ?? []);
    } catch (e) {
      console.error("Errore loadData JobDetail:", e);
      toast.error("Errore durante il caricamento.");
      setError("Errore durante il caricamento.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ========== Guard ========== */
  if (loading && !job)
    return (
      <div className="p-6 text-gray-600">⏳ Caricamento intervento...</div>
    );
  if (error && !job) return <div className="p-6 text-red-600">{error}</div>;
  if (!job)
    return <div className="p-6 text-red-600">Intervento non trovato</div>;

  /* ========== Logica bottone checkout ========== */
  const canDoCheckout =
    (currentUser.role === "montatore" &&
      (job.status === "in_corso" || job.status === "in_ritardo")) ||
    (isBackoffice &&
      ["assegnato", "in_corso", "in_ritardo"].includes(job.status));

  /* ========== Render ========== */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <JobHeader
        job={job}
        order={order || undefined}
        customer={customer || undefined}
      />

      {/* STATO & PROGRAMMAZIONE */}
      {isBackoffice && (
        <JobStatusEditor
          job={job}
          workers={workers}
          assignedWorkers={assignedWorkers}
          setAssignedWorkers={setAssignedWorkers}
          status={job.status}
          setStatus={(s) => setJob((j) => (j ? { ...j, status: s } : j))}
          plannedLocal={plannedLocal}
          setPlannedLocal={setPlannedLocal}
        />
      )}

      {/* PAYMENTS */}
      <JobPayments
        job={job}
        payments={payments}
        setPayments={setPayments}
        isBackoffice={isBackoffice}
        currentUserRole={
          currentUser.role as "montatore" | "backoffice" | "admin"
        }
      />

      {/* DOCUMENTI */}
      <JobDocuments
        orderDocs={orderDocs}
        docs={docs}
        setDocs={setDocs}
        currentUserId={currentUser.id}
        jobId={job.id}
        canEdit={true}
      />

      {/* NOTE INTERVENTO CORRENTI */}
      <JobNotes job={job} setJob={setJob} orderNotes={orderNotes} />

      {/* OPERATIVITÀ / CHECKOUT */}
      {canDoCheckout && (
        <div className="flex justify-center py-6">
          <Button
            onClick={() => setCheckoutOpen(true)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🚀 Apri Checkout
          </Button>
        </div>
      )}

      {/* CHECKOUT SUMMARY */}
      <div className="pt-20">
        <JobCheckoutReport job={job} docs={docs} />
      </div>

      {/* MODALE CHECKOUT */}
      {checkoutOpen && (
        <JobCheckoutModal
          job={job}
          payments={payments}
          ultimato={ultimato}
          setUltimato={setUltimato}
          finalConclusion={finalConclusion}
          setFinalConclusion={setFinalConclusion}
          setCheckoutOpen={setCheckoutOpen}
          checkingOut={checkingOut}
          setCheckingOut={setCheckingOut}
          loadData={loadData}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
