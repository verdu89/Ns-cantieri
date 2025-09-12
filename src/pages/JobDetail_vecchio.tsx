// File: JobDetail.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2,
  MapPin,
  Phone,
  Copy,
  Edit3,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Info,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge, type Tone } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { DocumentList } from "../components/files/DocumentList";
import { UploadArea } from "../components/files/UploadArea";
import { jobAPI } from "../api/jobs";
import { workerAPI } from "../api/workers";
import { jobOrderAPI } from "../api/jobOrders";

import type { Job, Worker, Payment, JobDocument } from "../types";

/* ===== Tipi ===== */
type JobStatus = Job["status"];
type Mode = "auto" | "manual";

/* ===== Tone mapping compatibile col Badge ===== */
const statusBadgeTone: Record<JobStatus, Tone> = {
  in_attesa_programmazione: "yellow",
  assegnato: "blue",
  in_corso: "blue",
  da_completare: "red",
  completato: "green",
  annullato: "gray",
};

/* ===== Helpers stato ===== */
function computeStatusAuto(hasDate: boolean, hasWorkers: boolean, prev: JobStatus): JobStatus {
  if (prev === "annullato" || prev === "completato") return prev;
  if (hasDate && hasWorkers) return "assegnato";
  return "in_attesa_programmazione";
}
function resolveStatus(mode: Mode, manual: JobStatus, hasDate: boolean, hasWorkers: boolean, prev: JobStatus): JobStatus {
  return mode === "manual" ? manual : computeStatusAuto(hasDate, hasWorkers, prev);
}

/* ===== Utils datetime-local ===== */
const toDateTimeLocal = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromDateTimeLocal = (val: string) => (val ? new Date(val).toISOString() : "");

/* ===== Normalizzatori commessa ===== */
function normalizeOrderDocs(input: any): JobDocument[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw: any, idx: number): JobDocument | null => {
      const id = raw?.id ?? raw?.uuid ?? raw?.fileId ?? `orderDoc-${idx}`;
      const name = raw?.name ?? raw?.filename ?? raw?.originalName ?? "Documento";
      const url = raw?.url ?? raw?.fileUrl ?? raw?.publicUrl ?? raw?.path ?? null;
      if (!url) return null;
      const type = (raw?.type ?? raw?.mimeType ?? "documento") as JobDocument["type"];
      const uploadedBy = raw?.uploadedBy ?? raw?.owner ?? "backoffice";
      const uploadedAt = raw?.uploadedAt ?? raw?.createdAt ?? new Date().toISOString();
      return { id: String(id), name: String(name), url: String(url), type, uploadedBy, uploadedAt };
    })
    .filter(Boolean) as JobDocument[];
}

function extractOrderNotes(order: any): string {
  return (
    order?.notesBackoffice ??
    order?.notes ??
    order?.note ??
    order?.descrizione ??
    ""
  );
}

/* ===== Component ===== */
export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const jobId = id ?? "";

  const { user } = useAuth();
  const isBackoffice = user?.role === "backoffice" || user?.role === "admin";

  // Fallback robusto per nome utente
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

  const LS_KEY = useMemo(() => (jobId ? `job:${jobId}:draft` : ""), [jobId]);

  // ===== Stato dati JOB =====
  const [job, setJob] = useState<Job | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===== Dati COMMESSA collegata (sola lettura) =====
  const [orderDocs, setOrderDocs] = useState<JobDocument[]>([]);
  const [orderNotes, setOrderNotes] = useState<string>("");

  // Salvataggi
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error"; message: string }>(
    {
      show: false,
      type: "success",
      message: "",
    }
  );
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ show: true, type, message });
    window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 2500);
  };

  // ===== Stato locale (montatore) =====
  const [payments, setPayments] = useState<Payment[]>([]); // pagamenti INTERVENTO
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [finalConclusion, setFinalConclusion] = useState("");

  // Checkout UI
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ultimato, setUltimato] = useState<"si" | "no" | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  // ===== BO/admin =====
  const [notesBackoffice, setNotesBackoffice] = useState(""); // note INTERVENTO
  const [docs, setDocs] = useState<JobDocument[]>([]); // documenti INTERVENTO
  const [editing, setEditing] = useState(false);
  const [assignedWorkers, setAssignedWorkers] = useState<string[]>([]);

  // Stato editor "Stato & Programmazione"
  const [statusMode, setStatusMode] = useState<Mode>("auto");
  const [statusManual, setStatusManual] = useState<JobStatus>("in_attesa_programmazione");
  const [plannedLocal, setPlannedLocal] = useState<string>("");
  const [notifyTeam, setNotifyTeam] = useState<boolean>(false);

  // Bozza server
  const [savingDraft, setSavingDraft] = useState(false);

  /* ========== Load ========== */
  const loadOrderData = useCallback(async (orderId?: string) => {
    if (!orderId) {
      setOrderDocs([]);
      setOrderNotes("");
      return;
    }
    try {
      const o: any = await jobOrderAPI.getById(orderId);
      setOrderDocs(normalizeOrderDocs(o?.files ?? o?.documents ?? o?.docs));
      setOrderNotes(extractOrderNotes(o));
    } catch (e) {
      // In caso di errore azzera i dati per evitare UI "vuote" non aggiornate
      setOrderDocs([]);
      setOrderNotes("");
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!jobId) {
      setError("ID intervento non valido.");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);

      const [j, w] = await Promise.all([jobAPI.getById(jobId), workerAPI.list()]);
      if (!j) {
        setError("Intervento non trovato.");
        setJob(null);
        return;
      }
      setJob(j);
      setPayments(j.payments ?? []);
      setNotesBackoffice(j.notesBackoffice ?? "");
      setDocs(j.docs ?? []);
      setAssignedWorkers(j.assignedWorkers ?? []);
      setWorkers(w);

      setStatusMode("auto");
      setStatusManual(j.status);
      setPlannedLocal(toDateTimeLocal(j.plannedDate));

      // Carica COMMESSA collegata (sola lettura)
      await loadOrderData((j as any)?.orderId);
    } catch (e: any) {
      setError(e?.message ?? "Errore di caricamento");
    } finally {
      setLoading(false);
    }
  }, [jobId, loadOrderData]);

  useEffect(() => { loadData(); }, [loadData]);

  // 🔔 aggiornamenti globali + focus/visibility
  useEffect(() => {
    const onUpdated = () => loadData();
    const onFocus = () => loadData();
    const onVisibility = () => { if (document.visibilityState === "visible") loadData(); };
    window.addEventListener("jobs:updated", onUpdated);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("jobs:updated", onUpdated);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadData]);

  /* ========== Bozza montatore (localStorage) ========== */
  useEffect(() => {
    if (!job || !LS_KEY || currentUser.role !== "montatore") return;
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPayments(parsed.payments ?? job.payments ?? []);
        setNote(parsed.note ?? "");
        setFinalConclusion(parsed.finalConclusion ?? "");
      } catch {}
    }
  }, [job, LS_KEY, currentUser.role]);

  useEffect(() => {
    if (!job || !LS_KEY || currentUser.role !== "montatore") return;
    const draft = { payments, note, finalConclusion, updatedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(draft));
  }, [payments, note, finalConclusion, LS_KEY, job, currentUser.role]);

  /* ========== Helpers locali ========== */
  function updatePayment(id: string, changes: Partial<Payment>) {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }
  function addPayment() {
    setPayments((prev) => [...prev, { id: `p${Date.now()}`, label: "Nuovo pagamento", amount: 0, collected: false, partial: false }]);
  }

  // Documenti BO (intervento)
  function handleUploadDoc(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const file = e.target.files[0];
    const newDoc: JobDocument = {
      id: `d${Date.now()}`,
      name: file.name,
      type: "documento",
      url: URL.createObjectURL(file),
      uploadedBy: "backoffice",
      uploadedAt: new Date().toISOString(),
    };
    setDocs((prev) => [...prev, newDoc]);
  }
  function handleDeleteDoc(docId: string) {
    setDocs((prev) => prev.filter((d) => d.id !== docId));
  }

  // Notifica squadra (placeholder integrabile)
  async function notifyAssignedTeam(theJob: Job, whenISO?: string) {
    try {
      const assigned = theJob.assignedWorkers ?? [];
      if (!assigned.length) return;
      console.log("🔔 Notifica squadra", {
        jobId: theJob.id,
        assigned,
        plannedDate: whenISO ?? theJob.plannedDate,
      });
    } catch (e) {
      console.warn("Notify team fallita:", e);
    }
  }

  // Salva scheda generale (BO)
  async function handleSave() {
    if (!job) return;
    try {
      setSavingGeneral(true);
      const effectiveAssigned = editing ? assignedWorkers : (job.assignedWorkers ?? []);
      const team = workers.filter((w) => effectiveAssigned.includes(w.id)).map((w) => ({ id: w.id, name: w.name }));

      const patch: Partial<Job> = { payments, docs, notesBackoffice, assignedWorkers: effectiveAssigned, team };
      const updated = await jobAPI.update(job.id, patch);
      setJob((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditing(false);

      window.dispatchEvent(new CustomEvent("jobs:updated"));
      showToast("success", "Modifiche salvate");
    } catch (e: any) {
      setError(e?.message ?? "Errore durante il salvataggio");
      showToast("error", "Errore salvataggio");
    } finally {
      setSavingGeneral(false);
    }
  }

  /* ========== Stato & Programmazione ========== */
  const hasDate = !!job?.plannedDate;
  const workersForStatus = (editing ? assignedWorkers : job?.assignedWorkers) ?? [];
  const hasWorkersForStatus = workersForStatus.length > 0;

  const effectiveStatusPreview = job
    ? resolveStatus(statusMode, statusManual, hasDate, hasWorkersForStatus, job.status)
    : ("in_attesa_programmazione" as JobStatus);

  function snapTo(which: "today-08" | "today-14" | "tomorrow-08"): string {
    const d = new Date();
    if (which.startsWith("tomorrow")) d.setDate(d.getDate() + 1);
    const hour = which.endsWith("14") ? 14 : 8;
    d.setHours(hour, 0, 0, 0);
    return toDateTimeLocal(d.toISOString());
  }

  async function applyStatusWithPlan() {
    if (!job) return;

    const next = effectiveStatusPreview;
    let planISO = plannedLocal ? fromDateTimeLocal(plannedLocal) : "";

    if (statusMode === "manual" && next === "assegnato" && !plannedLocal) {
      showToast("error", "Imposta data/ora per segnare 'Assegnato'.");
      return;
    }
    if (statusMode === "manual" && next === "in_corso" && !planISO) {
      planISO = new Date().toISOString();
      setPlannedLocal(toDateTimeLocal(planISO));
    }
    if (!hasWorkersForStatus && (next === "assegnato" || next === "in_corso")) {
      const ok = confirm("Non ci sono tecnici assegnati. Vuoi procedere comunque?");
      if (!ok) return;
    }
    if ((next === "annullato" || next === "completato") && !confirm(`Confermi lo stato “${next.replaceAll("_"," ")}?`)) {
      return;
    }

    try {
      setSavingStatus(true);
      const patch: Partial<Job> = { status: next };
      if (statusMode === "manual" && (next === "assegnato" || next === "in_corso")) {
        patch.plannedDate = planISO;
      }
      const updated = await jobAPI.update(job.id, patch);
      setJob((prev) => (prev ? { ...prev, ...updated } : prev));
      if (patch.plannedDate) setPlannedLocal(toDateTimeLocal(patch.plannedDate));
      window.dispatchEvent(new CustomEvent("jobs:updated"));
      showToast("success", `Aggiornato: ${next.replaceAll("_", " ")}`);

      if (notifyTeam && (next === "assegnato" || next === "in_corso")) {
        await notifyAssignedTeam(updated as Job, patch.plannedDate);
        showToast("success", "Squadra notificata");
      }
    } catch (e: any) {
      setError(e?.message ?? "Errore aggiornamento stato");
      showToast("error", "Errore aggiornamento stato");
    } finally {
      setSavingStatus(false);
    }
  }

  async function quickSetStatusWithPlan(next: JobStatus) {
    if (!job) return;

    let planISO = "";
    if (next === "in_corso") {
      planISO = new Date().toISOString();
      setPlannedLocal(toDateTimeLocal(planISO));
    } else if (next === "assegnato") {
      const fallback = plannedLocal || snapTo("today-08");
      setPlannedLocal(fallback);
      planISO = fromDateTimeLocal(fallback);
    }

    if (!hasWorkersForStatus && (next === "assegnato" || next === "in_corso")) {
      const ok = confirm("Non ci sono tecnici assegnati. Vuoi procedere comunque?");
      if (!ok) return;
    }
    if ((next === "annullato" || next === "completato") && !confirm(`Confermi lo stato “${next.replaceAll("_", " ")}?`)) return;

    try {
      setSavingStatus(true);
      const patch: Partial<Job> = { status: next };
      if (next === "in_corso" || next === "assegnato") patch.plannedDate = planISO;
      const updated = await jobAPI.update(job.id, patch);
      setJob((prev) => (prev ? { ...prev, ...updated } : prev));
      setStatusMode("manual");
      setStatusManual(next);
      if (patch.plannedDate) setPlannedLocal(toDateTimeLocal(patch.plannedDate));
      window.dispatchEvent(new CustomEvent("jobs:updated"));
      showToast("success", `Aggiornato: ${next.replaceAll("_", " ")}`);

      if (notifyTeam && (next === "assegnato" || next === "in_corso")) {
        await notifyAssignedTeam(updated as Job, patch.plannedDate);
        showToast("success", "Squadra notificata");
      }
    } catch (e: any) {
      setError(e?.message ?? "Errore aggiornamento stato");
      showToast("error", "Errore aggiornamento stato");
    } finally {
      setSavingStatus(false);
    }
  }

  /* ========== Salva BOZZA lato server (montatore) ========== */
  async function handleSaveDraft() {
    if (!job) return;
    try {
      setSavingDraft(true);
      const draft = {
        note,
        finalConclusion,
        payments,
        // Se implementi upload immediato in UploadArea, aggiungi fileIds: [...]
        updatedAt: new Date().toISOString(),
      };
      const updated = await jobAPI.update(job.id, { reportDraft: draft } as any);
      setJob((prev) => (prev ? { ...prev, ...updated } : prev));
      showToast("success", "Bozza salvata");
    } catch (e) {
      showToast("error", "Errore nel salvataggio bozza");
    } finally {
      setSavingDraft(false);
    }
  }

  /* ========== Checkout (montatore) ========== */
  async function handleConfirmCheckout() {
    if (!job) return;
    if (!ultimato) {
      alert("Seleziona se il lavoro è stato ultimato (Sì/No).");
      return;
    }

    try {
      setCheckingOut(true);
      const statusAfter: JobStatus = ultimato === "si" ? "completato" : "da_completare";
      const closedAt = new Date().toISOString();

      const report = {
        jobId: job.id,
        title: job.title,
        customer: job.customer?.name ?? "",
        address: job.location?.address ?? "",
        closedAt,
        ultimato,
        finalConclusion,
        notes: note,
        payments,
        filesCount: files?.length ?? 0,
        assignedWorkers: job.assignedWorkers ?? [],
      };

      const updated = await jobAPI.update(job.id, {
        status: statusAfter,
        report,
        closedAt,
      } as Partial<Job>);

      setJob((prev) => (prev ? { ...prev, ...updated } : prev));
      if (LS_KEY) localStorage.removeItem(LS_KEY);
      setCheckoutOpen(false);
      window.dispatchEvent(new CustomEvent("jobs:updated"));

      if (currentUser.role === "montatore") {
        navigate("/agenda", { replace: true });
      } else {
        navigate("/backoffice/home", { replace: true });
      }
    } catch (e) {
      console.error("Errore durante il checkout:", e);
      alert("Errore durante il checkout. Riprova.");
    } finally {
      setCheckingOut(false);
    }
  }

  /* ========== UX extra ========== */
  const copy = async (txt: string, ok = "Copiato!") => {
    try { await navigator?.clipboard?.writeText(txt); showToast("success", ok); }
    catch { showToast("error", "Copia non riuscita"); }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (isSave && editing && !savingGeneral) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, savingGeneral]);

  // ⚠️ Calcoli NON con Hook dopo eventuali early-return
  const mapsHref = job?.location?.mapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job?.location?.address ?? "")}`;
  const telHref = job?.customer?.phone ? `tel:${job.customer.phone}` : "";
  const formattedPlannedDate = job?.plannedDate
    ? new Date(job.plannedDate).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Non programmato";

  /* ========== Guard ======== */
  if (loading && !job) return <div className="p-6">Caricamento intervento...</div>;
  if (error && !job) return <div className="p-6 text-red-600">{error}</div>;
  if (!job) return <div className="p-6 text-red-600">Intervento non trovato</div>;

  /* ========== Render ========== */
  return (
    <div className="space-y-6">
      {/* HERO (semplificata) */}
      <div className="rounded-3xl border bg-white p-4 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Info principali */}
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge tone={statusBadgeTone[job.status]}>{job.status.replaceAll("_", " ")}</Badge>
              <span className="text-sm text-gray-600">{formattedPlannedDate}</span>
            </div>

            <h1 className="mt-2 text-xl md:text-2xl font-semibold truncate">
              Intervento #{job.id} · {job.title}
            </h1>

            <div className="mt-2 grid gap-1.5 text-sm text-gray-700">
              {/* Cliente */}
              <div className="truncate">
                👤 <span className="font-medium">{job.customer?.name ?? "—"}</span>
              </div>

              {/* Indirizzo (link a Maps + copia) */}
              <div className="flex items-center gap-2 min-w-0">
                <MapPin size={14} className="shrink-0 text-gray-600" />
                {job.location?.address ? (
                  <>
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate underline decoration-dotted hover:decoration-solid"
                      title="Apri in Google Maps"
                    >
                      {job.location.address}
                    </a>
                    <button
                      type="button"
                      onClick={() => copy(job.location!.address!, "Indirizzo copiato")}
                      className="p-1 rounded-md border hover:bg-gray-50"
                      title="Copia indirizzo"
                      aria-label="Copia indirizzo"
                    >
                      <Copy size={14} />
                    </button>
                  </>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </div>

              {/* Telefono (tap-to-call + copia) */}
              <div className="flex items-center gap-2 min-w-0">
                <Phone size={14} className="shrink-0 text-gray-600" />
                {job.customer?.phone ? (
                  <>
                    <a
                      href={telHref}
                      className="underline decoration-dotted hover:decoration-solid"
                      title="Chiama"
                    >
                      {job.customer.phone}
                    </a>
                    <button
                      type="button"
                      onClick={() => copy(job.customer!.phone!, "Telefono copiato")}
                      className="p-1 rounded-md border hover:bg-gray-50"
                      title="Copia telefono"
                      aria-label="Copia telefono"
                    >
                      <Copy size={14} />
                    </button>
                  </>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Azioni essenziali (solo BO/Admin) */}
          <div className="flex items-start gap-2 shrink-0">
            {isBackoffice && !editing && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Edit3 size={16} className="mr-1" /> Modifica
              </Button>
            )}
            {isBackoffice && editing && (
              <>
                <Button variant="secondary" onClick={() => setEditing(false)} disabled={savingGeneral}>
                  {savingGeneral && <Loader2 className="mr-1 inline-block animate-spin" size={16} />}
                  <X size={16} className="mr-1" /> Annulla
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={savingGeneral}>
                  {savingGeneral ? <Loader2 className="mr-1 inline-block animate-spin" size={16} /> : <Save size={16} className="mr-1" />} Salva
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* GRID 2 COLONNE (desktop), 1 colonna su mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* STATO & PROGRAMMAZIONE (solo BO/Admin) */}
        {isBackoffice && (
          <Card>
            <CardHeader><CardTitle>Stato & Programmazione</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Modalità */}
              <div className="flex flex-wrap gap-3 items-center">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={statusMode === "auto"}
                    onChange={() => setStatusMode("auto")}
                    disabled={savingStatus}
                  />
                  Automatico
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={statusMode === "manual"}
                    onChange={() => setStatusMode("manual")}
                    disabled={savingStatus}
                  />
                  Manuale
                </label>

                <div className="ml-auto text-sm">
                  Anteprima:&nbsp;
                  <Badge tone={statusBadgeTone[effectiveStatusPreview]}>
                    {effectiveStatusPreview.replaceAll("_", " ")}
                  </Badge>
                </div>
              </div>

              {/* Selezione stato manuale + programmazione */}
              {statusMode === "manual" && (
                <div className="space-y-3">
                  <div className="grid lg:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-600 block">Stato</label>
                      <select
                        value={statusManual}
                        onChange={(e) => setStatusManual(e.target.value as JobStatus)}
                        className="border rounded-lg px-3 py-2"
                        disabled={savingStatus}
                      >
                        <option value="in_attesa_programmazione">In attesa di programmazione</option>
                        <option value="assegnato">Assegnato</option>
                        <option value="in_corso">In corso</option>
                        <option value="da_completare">Da completare</option>
                        <option value="completato">Completato</option>
                        <option value="annullato">Annullato</option>
                      </select>
                    </div>

                    {(statusManual === "assegnato" || statusManual === "in_corso") && (
                      <div className="space-y-2">
                        <label className="text-xs text-gray-600 block">
                          Data/Ora pianificazione {statusManual === "in_corso" ? "(default: adesso)" : ""}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="datetime-local"
                            value={plannedLocal}
                            onChange={(e) => setPlannedLocal(e.target.value)}
                            className="border rounded-lg px-3 py-2 w-full"
                            disabled={savingStatus}
                          />
                        </div>
                        {/* Quick picks */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <button
                            type="button"
                            className="px-2 py-1 rounded-lg border bg-white hover:bg-gray-50"
                            onClick={() => setPlannedLocal(snapTo("today-08"))}
                            disabled={savingStatus}
                          >Oggi 08:00</button>
                          <button
                            type="button"
                            className="px-2 py-1 rounded-lg border bg-white hover:bg-gray-50"
                            onClick={() => setPlannedLocal(snapTo("today-14"))}
                            disabled={savingStatus}
                          >Oggi 14:00</button>
                          <button
                            type="button"
                            className="px-2 py-1 rounded-lg border bg-white hover:bg-gray-50"
                            onClick={() => setPlannedLocal(snapTo("tomorrow-08"))}
                            disabled={savingStatus}
                          >Domani 08:00</button>
                          <button
                            type="button"
                            className="px-2 py-1 rounded-lg border bg-white hover:bg-gray-50"
                            onClick={() => setPlannedLocal("")}
                            disabled={savingStatus}
                          >Svuota</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Avvisi coerenza */}
                  {(statusManual === "assegnato" || statusManual === "in_corso") && !hasWorkersForStatus && (
                    <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
                      <Info size={14} className="mt-0.5 shrink-0" />
                      <span>Nessun tecnico assegnato. Puoi comunque procedere, ma verrà richiesto conferma.</span>
                    </div>
                  )}
                  {statusManual === "assegnato" && !plannedLocal && (
                    <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 text-xs">
                      <Info size={14} className="mt-0.5 shrink-0" />
                      <span>Per impostare <b>Assegnato</b> devi indicare data/ora.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notifica squadra */}
              {(statusMode === "manual" && (statusManual === "assegnato" || statusManual === "in_corso")) && (
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={notifyTeam} onChange={(e) => setNotifyTeam(e.target.checked)} />
                  <Bell size={14} /> Notifica squadra al salvataggio
                </label>
              )}

              {/* Azioni */}
              <div className="flex flex-wrap gap-2 items-center">
                <Button variant="primary" onClick={applyStatusWithPlan} disabled={savingStatus}>
                  {savingStatus && <Loader2 className="mr-1 inline-block animate-spin" size={16} />} Applica
                </Button>
                <div className="text-xs text-gray-500">
                  {statusMode === "auto"
                    ? <>Automatico: <code>assegnato</code> se ha <b>data</b> e <b>tecnici</b>, altrimenti <code>in attesa di programmazione</code>.</>
                    : <>Se scegli <b>Assegnato</b> imposta anche la data/ora.</>
                  }
                </div>
              </div>

              {/* Azioni rapide */}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => quickSetStatusWithPlan("in_corso")} disabled={savingStatus}>
                  <CheckCircle2 size={14} className="mr-1" /> In corso (adesso)
                </Button>
                <Button variant="secondary" onClick={() => quickSetStatusWithPlan("da_completare")} disabled={savingStatus}>
                  <AlertTriangle size={14} className="mr-1" /> Da completare
                </Button>
                <Button variant="secondary" onClick={() => quickSetStatusWithPlan("assegnato")} disabled={savingStatus}>
                  Segna assegnato
                </Button>
                <Button variant="secondary" onClick={() => quickSetStatusWithPlan("completato")} disabled={savingStatus}>
                  Completa
                </Button>
                <Button variant="secondary" onClick={() => quickSetStatusWithPlan("annullato")} disabled={savingStatus}>
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SQUADRA (solo BO/admin) */}
        {isBackoffice && (
          <Card>
            <CardHeader><CardTitle>👷 Squadra</CardTitle></CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  {workers.map((w) => {
                    const checked = (assignedWorkers ?? []).includes(w.id);
                    return (
                      <label key={w.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setAssignedWorkers((prev) =>
                              e.target.checked ? [...prev, w.id] : prev.filter((id) => id !== w.id)
                            )
                          }
                          disabled={savingGeneral}
                        />
                        {w.name}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <ul className="list-disc pl-5">
                  {(assignedWorkers ?? []).length ? (
                    assignedWorkers.map((wid) => (
                      <li key={wid}>👷 {workers.find((w) => w.id === wid)?.name ?? "N/D"}</li>
                    ))
                  ) : (
                    <li className="text-gray-500">Nessun tecnico assegnato</li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* PAGAMENTI (solo INTERVENTO) */}
        <Card>
          <CardHeader><CardTitle>💰 Pagamenti (intervento)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="border rounded-lg p-3">
                {isBackoffice && editing ? (
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input
                      value={p.label}
                      onChange={(e) => updatePayment(p.id, { label: e.target.value })}
                      className="w-full border p-2 rounded-lg"
                    />
                    <input
                      type="number"
                      value={Number.isFinite(p.amount as number) ? (p.amount as number) : 0}
                      onChange={(e) => updatePayment(p.id, { amount: parseFloat(e.target.value || "0") || 0 })}
                      className="w-full border p-2 rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>{p.label}</span>
                    <span>{(p.amount ?? 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</span>
                  </div>
                )}
              </div>
            ))}

            {isBackoffice && editing ? (
              <Button variant="secondary" onClick={addPayment} disabled={savingGeneral}>
                ➕ Aggiungi pagamento
              </Button>
            ) : payments.length === 0 ? (
              <div className="text-sm text-gray-500">Nessun pagamento per l’intervento.</div>
            ) : null}

            {/* Totale intervento */}
            {payments.length > 0 && !editing && (
              <div className="px-3 py-2 flex justify-between bg-gray-50 border rounded-xl">
                <span>Totale</span>
                <span className="font-semibold">
                  {payments.reduce((s, p) => s + (p.amount ?? 0), 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DOCUMENTI (Commessa + Intervento) */}
        <Card>
          <CardHeader><CardTitle>Documenti</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* COMMESSA (sola lettura) */}
            <div>
              <div className="font-medium mb-2">Documenti commessa</div>
              {orderDocs?.length ? (
                <DocumentList docs={orderDocs} />
              ) : (
                <div className="text-sm text-gray-500">Nessun documento in commessa.</div>
              )}
            </div>

            {/* INTERVENTO */}
            <div>
              <div className="font-medium mb-2">Documenti intervento</div>
              {docs?.length ? (
                <DocumentList docs={docs} />
              ) : (
                <div className="text-sm text-gray-500">Nessun documento per l’intervento.</div>
              )}

              {isBackoffice && editing && (
                <div className="mt-3">
                  <input type="file" onChange={handleUploadDoc} disabled={savingGeneral} />
                  <ul className="mt-2 text-sm">
                    {docs.map((d) => (
                      <li key={d.id} className="flex justify-between items-center py-1">
                        <span className="truncate">{d.name}</span>
                        <button onClick={() => handleDeleteDoc(d.id)} className="text-red-600 text-xs" disabled={savingGeneral}>
                          Elimina
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* NOTE (Commessa + Intervento) */}
        <Card>
          <CardHeader><CardTitle>Note Backoffice</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* COMMESSA */}
            <div>
              <div className="font-medium mb-1">Note commessa</div>
              {orderNotes ? (
                <p className="whitespace-pre-wrap text-sm">{orderNotes}</p>
              ) : (
                <p className="text-sm text-gray-500">Nessuna nota registrata sulla commessa.</p>
              )}
            </div>

            {/* INTERVENTO */}
            <div>
              <div className="font-medium mb-1">Note intervento</div>
              {isBackoffice && editing ? (
                <textarea
                  value={notesBackoffice}
                  onChange={(e) => setNotesBackoffice(e.target.value)}
                  className="w-full border p-3 rounded-lg min-h-[120px]"
                  disabled={savingGeneral}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm">{notesBackoffice || "—"}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SEZIONE Operatività (solo montatore) */}
        {currentUser.role === "montatore" && (
          <Card>
            <CardHeader><CardTitle>Operatività</CardTitle></CardHeader>
            <CardContent>
              <UploadArea initialNote={note} onNoteChange={setNote} onChange={setFiles} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* STICKY ACTION BAR — solo montatore */}
      {currentUser.role === "montatore" && !checkoutOpen && (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-3 md:px-0">
          <div className="w-full max-w-2xl bg-white border shadow-xl rounded-2xl p-2 flex items-center justify-between gap-2">
            <div className="text-xs text-gray-500 px-2 truncate">
              Bozza locale attiva {files?.length ? `· ${files.length} file selezionati` : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                title="Salva bozza sul server"
              >
                {savingDraft ? "Salvataggio…" : "Salva bozza"}
              </Button>
              <Button
                variant="primary"
                onClick={() => setCheckoutOpen(true)}
                title="Apri riepilogo e chiusura"
              >
                🔒 Checkout cantiere
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL Checkout (riepilogo + conferma) */}
      {checkoutOpen && currentUser.role === "montatore" && job && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full space-y-5">
            <h2 className="text-xl font-semibold">Conferma chiusura cantiere</h2>

            {/* Riepilogo sintetico */}
            <div className="text-sm bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1">
              <div><span className="text-gray-500">Intervento:</span> <b>#{job.id}</b> · {job.title}</div>
              <div><span className="text-gray-500">Cliente:</span> {job.customer?.name ?? "—"}</div>
              <div><span className="text-gray-500">Indirizzo:</span> {job.location?.address ?? "—"}</div>
              <div>
                <span className="text-gray-500">Data prevista:</span>{" "}
                {job.plannedDate ? new Date(job.plannedDate).toLocaleString("it-IT") : "Non programmato"}
              </div>
              <div>
                <span className="text-gray-500">Tecnici:</span>{" "}
                {(job.team?.length ? job.team.map((t) => t.name).join(", ") : "—")}
              </div>
            </div>

            {/* Pagamenti intervento */}
            <div className="text-sm">
              <div className="font-medium mb-1">Pagamenti</div>
              <div className="border rounded-xl divide-y">
                {(payments ?? []).length ? (
                  payments.map((p) => (
                    <div key={p.id} className="px-3 py-2 flex justify-between">
                      <span className="truncate pr-2">{p.label}</span>
                      <span className="font-medium">
                        {(p.amount ?? 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-500">Nessun pagamento inserito</div>
                )}
                <div className="px-3 py-2 flex justify-between bg-gray-50 rounded-b-xl">
                  <span>Totale</span>
                  <span className="font-semibold">
                    {(payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Allegati */}
            <div className="text-sm">
              <div className="font-medium mb-1">Allegati</div>
              <div className="border rounded-xl px-3 py-2">
                {(files?.length ?? 0) > 0 ? `${files.length} file pronti al caricamento` : "Nessun file selezionato"}
              </div>
            </div>

            {/* Esito / Note finali */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Esito</div>
              <div className="flex items-center gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" checked={ultimato === "si"} onChange={() => setUltimato("si")} />
                  ✅ Ultimato
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" checked={ultimato === "no"} onChange={() => setUltimato("no")} />
                  ❌ Da completare
                </label>
              </div>

              <textarea
                value={finalConclusion}
                onChange={(e) => setFinalConclusion(e.target.value)}
                className="w-full border rounded-lg p-2"
                placeholder="Note finali per il report (opzionale)…"
              />
            </div>

            {/* Azioni */}
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setCheckoutOpen(false)} disabled={checkingOut}>
                Annulla
              </Button>
              <Button variant="primary" onClick={handleConfirmCheckout} disabled={!ultimato || checkingOut}>
                {checkingOut ? "Sto chiudendo…" : "Conferma e genera report"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div
          className={`fixed bottom-4 right-4 z-[1000] px-4 py-3 rounded-xl shadow ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
