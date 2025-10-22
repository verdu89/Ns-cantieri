// OrderDetail.tsx
// Pagina dettaglio commessa — stile allineato con Customers/Orders (2025-10)
// - Intestazione pulita con cliente e località
// - Box Note con salva (bottoni coerenti con Customers, icone Lucide)
// - Allegati in card semplici con upload su Supabase Storage
// - Pagamenti lasciati "as-is" (scelta A)
// - Interventi: card mobile + tabella desktop, righe cliccabili, azioni icone (Edit/Trash)
// - Nuovo intervento: inserimento + evidenziazione pulse blu per 10s (coerenza con nuove logiche)
// - Emoji solo nei TITOLI sezione; nelle celle/bottoni usiamo icone Lucide o testo

import { Button } from "@/components/ui/Button";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { jobOrderAPI } from "../../api/jobOrders";
import { customerAPI } from "../../api/customers";
import { jobAPI } from "../../api/jobs";
import { workerAPI } from "../../api/workers";
import { documentAPI } from "../../api/documentAPI";
import { supabase } from "../../supabaseClient";

import type {
  JobOrder,
  Customer,
  Job,
  Documento,
  Payment,
  Worker,
} from "../../types";
import { formatDocumento } from "../../utils/documenti";
import { STATUS_CONFIG, getEffectiveStatus } from "@/config/statusConfig";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { formatDateTime, toDbDate } from "@/utils/date";

// Lucide icons (azioni e dettagli)
import {
  Plus,
  Save,
  X,
  Edit,
  Trash2,
  Calendar,
  Users,
  MapPin,
  FileText,
  Link as LinkIcon,
} from "lucide-react";

const TYPE_LABELS: Record<Job["title"], string> = {
  consegna: "Consegna",
  montaggio: "Montaggio",
  consegna_montaggio: "Consegna + Montaggio",
  assistenza: "Assistenza",
  altro: "Altro",
};

// 🔹 Tipologia payload per creazione job
type JobCreate = Omit<
  Job,
  "id" | "events" | "customer" | "team" | "payments" | "docs"
>;

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ===== Stato base pagina =====
  const [order, setOrder] = useState<JobOrder | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [documenti, setDocumenti] = useState<Documento[]>([]);
  const [notes, setNotes] = useState("");

  // ===== UI: modale nuovo/modifica job =====
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Job>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  // ===== UI: conferma eliminazione =====
  const [openConfirm, setOpenConfirm] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  // ===== UI: stato allegati =====
  const [loadingDocs, setLoadingDocs] = useState(false);

  // ===== UI: evidenziazione ultimo intervento creato =====
  const [lastCreatedJobId, setLastCreatedJobId] = useState<string | null>(null);

  // ==============================
  // Caricamento dati
  // ==============================
  useEffect(() => {
    if (!id) return;

    async function loadData() {
      try {
        const o = await jobOrderAPI.getById(id ?? "");
        if (!o) return;
        setOrder(o);
        setNotes(o.notes ?? "");

        const c = await customerAPI.getById(o.customerId);
        setCustomer(c ?? null);

        const j = await jobAPI.listByOrder(o.id);
        setJobs(j ?? []);

        const docs = await documentAPI.listByOrder(o.id);
        setDocumenti(docs ?? []);
      } catch (err) {
        console.error("Errore caricamento dettaglio commessa:", err);
        toast.error("Errore nel caricamento della commessa ❌");
      }
    }

    loadData();
  }, [id]);

  // Workers (una tantum)
  useEffect(() => {
    workerAPI.list().then((w) => setWorkers(w ?? []));
  }, []);

  if (order === null) {
    return <div className="p-4 text-gray-500">⏳ Caricamento commessa...</div>;
  }

  // ==============================
  // Helpers
  // ==============================
  const reloadJobs = async () => {
    if (!order) return;
    const fresh = await jobAPI.listByOrder(order.id);
    setJobs(fresh ?? []);
  };

  const getStoragePath = (fileUrl: string): string => {
    const url = new URL(fileUrl);
    return decodeURIComponent(url.pathname.split("/").slice(3).join("/"));
  };

  // Pagamenti aggregati (come da tua versione)
  const allPayments: Payment[] = jobs.flatMap((j) =>
    (j.payments ?? []).map((p) => ({ ...p, jobId: j.id }))
  );
  const totalExpected = allPayments.reduce(
    (sum, p) => sum + (p.amount ?? 0),
    0
  );
  const totalCollected = allPayments.reduce((sum, p) => {
    if (p.collected) return sum + (p.amount ?? 0);
    if ((p as any).partial) return sum + ((p as any).collectedAmount ?? 0);
    return sum;
  }, 0);
  const totalPending = totalExpected - totalCollected;

  // Ordinamento jobs: per createdAt desc, con precedenza al job appena creato (senza useMemo)
  const sortedJobs = [...jobs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .sort((a, b) => {
      if (lastCreatedJobId === a.id) return -1;
      if (lastCreatedJobId === b.id) return 1;
      return 0;
    });

  // ==============================
  // Azioni: note commessa
  // ==============================
  const handleSaveNotes = async () => {
    if (!order) return;
    try {
      const updated: JobOrder = { ...order, notes };
      await jobOrderAPI.update(order.id, updated);
      setOrder(updated);
      toast.success("Note commessa aggiornate ✅");
    } catch (err) {
      console.error("Errore aggiornamento note:", err);
      toast.error("Errore durante l'aggiornamento delle note ❌");
    }
  };

  // ==============================
  // Azioni: interventi (jobs)
  // ==============================
  const handleSaveJob = async () => {
    if (!formData.title) {
      return toast.error("La tipologia intervento è obbligatoria ❌");
    }

    try {
      if (editingId) {
        // Update job esistente
        const payload: Partial<Job> = {
          title: formData.title as Job["title"],
          plannedDate: (formData.plannedDate as string | null) ?? null,
          assignedWorkers: formData.assignedWorkers ?? [],
          notes: formData.notes ?? "",
        };
        if (typeof formData.status === "string") {
          payload.status = formData.status as Job["status"];
        }

        const updated = await jobAPI.update(editingId, payload);
        if (updated) {
          toast.success("Intervento aggiornato ✅");
          await reloadJobs();
        }
      } else {
        // Creazione job nuovo
        const newJobPayload: JobCreate = {
          jobOrderId: order.id,
          createdAt: toDbDate(new Date()),
          title: formData.title as Job["title"],
          notes: formData.notes ?? "",
          status: "in_attesa_programmazione",
          files: [],
          location: order.location ?? {},
          customer: customer ?? { id: "", name: "" },
          team: [],
          payments: [],
          docs: [],
          events: [],
        } as unknown as JobCreate;

        const created = await jobAPI.create(newJobPayload);
        if (!created) {
          toast.error("Errore durante il salvataggio dell'intervento ❌");
          return;
        }

        // Evidenzia in cima per 10s
        setLastCreatedJobId(created.id);
        setTimeout(() => setLastCreatedJobId(null), 10000);

        toast.success("Intervento creato ✅");
        await reloadJobs();
      }

      // Reset form
      setFormData({});
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error("Errore salvataggio intervento:", err);
      toast.error("Errore durante il salvataggio dell'intervento ❌");
    }
  };

  const handleEdit = (job: Job) => {
    setFormData(job);
    setEditingId(job.id);
    setShowForm(true);
  };

  const handleDelete = (jobId: string) => {
    setJobToDelete(jobId);
    setOpenConfirm(true);
  };

  const confirmDelete = async () => {
    if (!jobToDelete) return;
    try {
      await jobAPI.remove(jobToDelete);
      toast.success("Intervento eliminato ✅");
      await reloadJobs();
    } catch (err) {
      console.error("Errore eliminazione intervento:", err);
      toast.error("Errore durante l'eliminazione dell'intervento ❌");
    } finally {
      setJobToDelete(null);
    }
  };

  // ==============================
  // Azioni: allegati (Supabase Storage)
  // ==============================
  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !order) return;
    const files = Array.from(e.target.files);

    setLoadingDocs(true);
    try {
      for (const file of files) {
        const filePath = `${order.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("order-files")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("order-files")
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        await documentAPI.addToOrder(order.id, {
          fileName: file.name,
          fileUrl: publicUrl,
          uploadedBy: "Backoffice",
        });
      }

      const docs = await documentAPI.listByOrder(order.id);
      setDocumenti(docs);

      toast.success(`Caricati ${files.length} file ✅`);
    } catch (err) {
      console.error("Errore upload file:", err);
      toast.error("Errore durante il caricamento dei file ❌");
    } finally {
      setLoadingDocs(false);
      e.target.value = "";
    }
  };

  const handleDeleteFile = async (docId: string, fileUrl: string) => {
    if (!order) return;
    setLoadingDocs(true);
    try {
      const path = getStoragePath(fileUrl);
      const { error: storageError } = await supabase.storage
        .from("order-files")
        .remove([path]);

      if (storageError) throw storageError;

      await documentAPI.deleteFromOrder(docId);

      const docs = await documentAPI.listByOrder(order.id);
      setDocumenti(docs);
      toast.success("File eliminato ✅");
    } catch (err) {
      console.error("Errore eliminazione file:", err);
      toast.error("Errore durante l'eliminazione del file ❌");
    } finally {
      setLoadingDocs(false);
    }
  };

  // ==============================
  // Render
  // ==============================
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ===== Intestazione commessa ===== */}
      <div className="bg-white shadow rounded-lg p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold mb-2">
          Commessa {order.code}
        </h1>

        <p className="text-sm md:text-base flex items-center gap-2">
          <span className="font-semibold">Cliente:</span>
          {customer ? (
            <Link
              to={`/backoffice/customers/${customer.id}`}
              className="text-blue-600 underline hover:text-blue-700"
            >
              {customer.name}
            </Link>
          ) : (
            "N/D"
          )}
        </p>

        <p className="text-sm md:text-base mt-1 flex items-center gap-2">
          <span className="font-semibold">Località:</span>
          {order.location?.address ? (
            <>
              <MapPin size={16} className="opacity-70" />
              <span>{order.location.address}</span>
            </>
          ) : (
            <span>-</span>
          )}
          {order.location?.mapsUrl && (
            <a
              href={order.location.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-700 flex items-center gap-1 ml-2"
            >
              <LinkIcon size={16} /> Apri in Maps
            </a>
          )}
        </p>
      </div>

      {/* ===== Box Note Commessa ===== */}
      <div className="bg-white shadow rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-2">📝 Note commessa</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Annota qui informazioni utili..."
          className="w-full p-2 border rounded-lg mb-3"
          rows={4}
        />
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button
            onClick={() => {
              setNotes(order?.notes ?? "");
            }}
            className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 flex items-center justify-center gap-2"
            title="Annulla modifiche"
          >
            <X size={16} />
            Annulla
          </Button>
          <Button
            onClick={handleSaveNotes}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Salva Note
          </Button>
        </div>
      </div>

      {/* ===== Allegati ===== */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">📎 Allegati commessa</h2>

        <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-gray-500 cursor-pointer hover:border-blue-500 hover:text-blue-500 transition">
          <input
            key={documenti.length}
            type="file"
            multiple
            onChange={handleUploadFiles}
            className="hidden"
            disabled={loadingDocs}
          />
          <span className="text-sm">
            {loadingDocs
              ? "⏳ Caricamento in corso..."
              : "Trascina file o clicca per caricare"}
          </span>
        </label>

        {loadingDocs && (
          <div className="flex items-center gap-2 text-blue-600 text-sm mt-3">
            ⏳ Caricamento in corso...
          </div>
        )}

        {documenti.length === 0 ? (
          <p className="text-gray-500 mt-4">Nessun documento caricato</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200">
            {documenti.map((doc) => {
              const d = formatDocumento(doc);
              return (
                <li
                  key={d.id}
                  className="flex justify-between items-center py-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={22} className="opacity-70" />
                    <div>
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline hover:text-blue-700"
                      >
                        {d.fileName}
                      </a>
                      <div className="text-xs text-gray-400">
                        {d.formattedDate}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteFile(d.id, d.fileUrl)}
                    className="p-2 hover:text-red-600"
                    title="Elimina file"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ===== Riepilogo Pagamenti (A: as-is) ===== */}
      <div className="bg-white shadow rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-2">
          💰 Riepilogo pagamenti
        </h2>
        {allPayments.length === 0 ? (
          <p className="text-gray-500">Nessun pagamento registrato</p>
        ) : (
          <>
            <ul className="space-y-2 mb-4">
              {allPayments.map((p) => {
                const job = jobs.find((j) => j.id === p.jobId);
                return (
                  <li
                    key={p.id}
                    className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 border p-2 rounded-lg"
                  >
                    <span className="text-sm md:text-base">
                      {p.label} — {p.amount.toFixed(2)} € —{" "}
                      <span
                        className={
                          p.collected ? "text-green-600" : "text-red-600"
                        }
                      >
                        {p.collected ? "Incassato" : "Da incassare"}
                      </span>{" "}
                      {job && (
                        <span className="text-gray-500 ml-0 md:ml-2 block md:inline">
                          (Intervento: {TYPE_LABELS[job.title] ?? job.title})
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="border-t pt-3 text-sm md:text-base space-y-1">
              <div>
                <strong>Totale previsto:</strong> {totalExpected.toFixed(2)} €
              </div>
              <div className="text-green-600">
                <strong>Totale incassato:</strong> {totalCollected.toFixed(2)} €
              </div>
              <div
                className={
                  totalPending > 0
                    ? "text-red-700 font-bold"
                    : "text-green-700 font-bold"
                }
              >
                <strong>Residuo:</strong> {totalPending.toFixed(2)} €
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== Interventi (Jobs) ===== */}
      <div className="bg-white shadow rounded-lg p-4 md:p-6">
        {/* Header lista interventi */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
          <h2 className="text-lg md:text-xl font-bold">
            👷 Interventi ({sortedJobs.length})
          </h2>
          <Button
            onClick={() => {
              setFormData({});
              setEditingId(null);
              setShowForm(true);
            }}
            className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Nuovo Intervento
          </Button>
        </div>

        {/* Mobile: card compatte */}
        <div className="md:hidden space-y-2">
          {sortedJobs.length === 0 ? (
            <p className="text-gray-500">Nessun intervento presente</p>
          ) : (
            sortedJobs.map((j) => {
              const st = getEffectiveStatus(j.status, j.plannedDate);
              const cfg = STATUS_CONFIG[st];
              const isLateRow = j.plannedDate && st === "in_ritardo";
              const highlight = lastCreatedJobId === j.id;

              const renderType = (title: string) => {
                switch (title) {
                  case "consegna":
                    return "📦 Consegna";
                  case "montaggio":
                    return "🔧 Montaggio";
                  case "consegna_montaggio":
                    return "🚚🔧 Consegna + Montaggio";
                  case "assistenza":
                    return "🛠️ Assistenza";
                  case "altro":
                    return "📝 Altro";
                  default:
                    return title;
                }
              };

              return (
                <div
                  key={j.id}
                  className={`bg-white border rounded-xl p-3 shadow-sm cursor-pointer transition flex flex-col gap-1
            ${
              highlight
                ? "bg-green-100 animate-pulse"
                : "active:bg-gray-100 hover:bg-gray-50"
            }
            ${isLateRow ? "ring-1 ring-red-300" : ""}`}
                  onClick={() => navigate(`/backoffice/jobs/${j.id}`)}
                >
                  {/* Data + Tipo */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm flex items-center gap-2 text-gray-700">
                      <Calendar size={14} className="opacity-70" />
                      {j.plannedDate ? formatDateTime(j.plannedDate) : "-"}
                    </div>
                    <div className="font-semibold text-sm">
                      {renderType(j.title)}
                    </div>
                  </div>

                  {/* Squadra */}
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    <Users size={14} className="opacity-70" />
                    {j.assignedWorkers?.length
                      ? j.assignedWorkers
                          .map((wid) => workers.find((w) => w.id === wid)?.name)
                          .join(", ")
                      : "-"}
                  </div>

                  {/* Stato */}
                  <div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        cfg?.color ?? "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {cfg?.icon} {cfg?.label ?? st}
                    </span>
                  </div>

                  {/* Notes */}
                  {j.notes && (
                    <div className="text-xs text-gray-600 truncate">
                      📝 {j.notes}
                    </div>
                  )}

                  {/* Azioni */}
                  <div className="flex gap-1 mt-1 justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(j);
                      }}
                      className="p-1 rounded-md hover:bg-yellow-100 text-yellow-600"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(j.id);
                      }}
                      className="p-1 rounded-md hover:bg-red-100 text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop: tabella */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden text-sm">
            <thead className="bg-gray-100 text-left text-gray-600 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="p-3">Data programmata</th>
                <th className="p-3">Tipologia</th>
                <th className="p-3">Squadra</th>
                <th className="p-3">Stato</th>
                <th className="p-3">Note</th>
                <th className="p-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.map((j) => {
                const st = getEffectiveStatus(j.status, j.plannedDate);
                const cfg = STATUS_CONFIG[st];
                const isLateRow = j.plannedDate && st === "in_ritardo";
                const highlight = lastCreatedJobId === j.id;

                return (
                  <tr
                    key={j.id}
                    className={`border-t cursor-pointer transition-colors ${
                      highlight
                        ? "bg-green-100 animate-pulse"
                        : "hover:bg-gray-50"
                    } ${isLateRow ? "bg-red-50" : ""}`}
                    onClick={() => navigate(`/backoffice/jobs/${j.id}`)}
                  >
                    {/* Data */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="opacity-70" />
                        <span>
                          {j.plannedDate ? formatDateTime(j.plannedDate) : "-"}
                        </span>
                      </div>
                    </td>

                    {/* Tipologia con emoji inline */}
                    <td className="p-3">
                      {(() => {
                        switch (j.title) {
                          case "consegna":
                            return "🚚 Consegna";
                          case "montaggio":
                            return "🔧 Montaggio";
                          case "consegna_montaggio":
                            return "🚚🔧 Consegna + Montaggio";
                          case "assistenza":
                            return "🛠️ Assistenza";
                          case "altro":
                            return "📝 Altro";
                          default:
                            return j.title;
                        }
                      })()}
                    </td>

                    {/* Squadra */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="opacity-70" />
                        <span>
                          {j.assignedWorkers?.length
                            ? j.assignedWorkers
                                .map(
                                  (wid) =>
                                    workers.find((w) => w.id === wid)?.name
                                )
                                .join(", ")
                            : "-"}
                        </span>
                      </div>
                    </td>

                    {/* Stato */}
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          cfg?.color ?? "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {cfg?.icon} {cfg?.label ?? st}
                      </span>
                    </td>

                    {/* Note */}
                    <td className="p-3 text-gray-600 truncate max-w-[260px]">
                      {j.notes || "-"}
                    </td>

                    {/* Azioni */}
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          title="Modifica"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(j);
                          }}
                          className="p-2 rounded-lg hover:bg-yellow-100 text-yellow-600"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          title="Elimina"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(j.id);
                          }}
                          className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sortedJobs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center p-4 text-gray-500 italic"
                  >
                    Nessun intervento presente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Modale Nuovo/Modifica Intervento ===== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg md:text-xl font-bold mb-4">
              {editingId ? "✏️ Modifica Intervento" : "➕ Nuovo Intervento"}
            </h2>

            {/* Tipologia */}
            <label className="text-sm text-gray-600 mb-1 block">
              Tipologia *
            </label>
            <select
              name="type"
              value={formData.title ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  title: e.target.value as Job["title"],
                })
              }
              className="w-full p-2 border rounded-lg mb-3"
            >
              <option value="">Seleziona tipo *</option>
              <option value="consegna">🚚 Consegna</option>
              <option value="montaggio">🔧 Montaggio</option>
              <option value="consegna_montaggio">
                🚚🔧 Consegna + Montaggio
              </option>
              <option value="assistenza">🛠️ Assistenza</option>
              <option value="altro">📝 Altro</option>
            </select>

            {/* Note */}
            <label className="text-sm text-gray-600 mb-1 block">Note</label>
            <textarea
              name="notes"
              placeholder="Note interne"
              value={formData.notes ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full p-2 border rounded-lg mb-4"
              rows={3}
            />

            <div className="flex flex-col md:flex-row md:justify-end gap-2">
              <Button
                onClick={() => {
                  setShowForm(false);
                  setFormData({});
                  setEditingId(null);
                }}
                className="w-full md:w-auto px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 flex items-center justify-center gap-2"
              >
                <X size={16} />
                Annulla
              </Button>
              <Button
                onClick={handleSaveJob}
                className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Salva
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Conferma eliminazione intervento ===== */}
      <ConfirmDialog
        open={openConfirm}
        setOpen={setOpenConfirm}
        title="Elimina intervento"
        description="Sei sicuro di voler eliminare questo intervento? L'azione non può essere annullata."
        confirmText="Elimina"
        cancelText="Annulla"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
