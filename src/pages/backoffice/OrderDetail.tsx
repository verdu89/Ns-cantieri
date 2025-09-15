import { Button } from "@/components/ui/Button";
import { useParams, Link } from "react-router-dom";
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
import { STATUS_CONFIG } from "@/config/statusConfig";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import toast from "react-hot-toast";

// 🔹 Per creare un job
type JobCreate = Omit<
  Job,
  "id" | "events" | "customer" | "team" | "payments" | "docs"
>;

/** ========= Stato visuale (NON scrive su DB) ========= */
function getEffectiveStatus(
  job: Pick<Job, "status" | "plannedDate" | "assignedWorkers">
): Job["status"] {
  if (job.status === "in_ritardo") return "in_ritardo";
  if (["completato", "da_completare", "annullato"].includes(job.status)) {
    return job.status as Job["status"];
  }
  const hasTeam =
    Array.isArray(job.assignedWorkers) && job.assignedWorkers.length > 0;
  if (!job.plannedDate || !hasTeam) return "in_attesa_programmazione";

  const planned = new Date(job.plannedDate);
  const now = new Date();

  if (now < planned) return "assegnato";
  if (now >= planned) {
    if (job.status === "in_corso" && planned.getTime() < now.getTime()) {
      return "in_ritardo";
    }
    return "in_corso";
  }
  return job.status;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<JobOrder | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [documenti, setDocumenti] = useState<Documento[]>([]);
  const [notes, setNotes] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Job>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loadingDocs, setLoadingDocs] = useState(false);

  // conferma eliminazione
  const [openConfirm, setOpenConfirm] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  // 🔹 carica dati commessa
  useEffect(() => {
    if (!id) return;

    async function loadData() {
      const o = await jobOrderAPI.getById(id as string);
      if (!o) return;

      setOrder(o);
      setNotes(o.notes ?? "");

      const c = await customerAPI.getById(o.customerId);
      setCustomer(c ?? null);

      const j = await jobAPI.listByOrder(o.id);
      setJobs(j ?? []);

      const docs = await documentAPI.listByOrder(o.id);
      setDocumenti(docs ?? []);
    }

    loadData();
  }, [id]);

  // 🔹 carica workers
  useEffect(() => {
    workerAPI.list().then((w) => setWorkers(w ?? []));
  }, []);

  if (!order) {
    return <div className="p-4 md:p-6 text-red-600">Commessa non trovata</div>;
  }

  // 🔹 salva note commessa
  const handleSaveNotes = async () => {
    if (!order) return;
    try {
      const updated: JobOrder = { ...order, notes };
      await jobOrderAPI.update(order.id, updated);
      setOrder(updated);
      toast.success("📝 Note commessa aggiornate con successo");
    } catch (err) {
      console.error("Errore aggiornamento note:", err);
      toast.error("Errore durante l'aggiornamento delle note ❌");
    }
  };

  const reloadJobs = async () => {
    if (!order) return;
    const fresh = await jobAPI.listByOrder(order.id);
    setJobs(fresh ?? []);
  };

  // 🔹 salvataggio intervento
  const handleSaveJob = async () => {
    if (!formData.title) {
      return toast.error("La tipologia intervento è obbligatoria ❌");
    }

    try {
      if (editingId) {
        const payload: Partial<Job> = {
          title: formData.title,
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
        const newJobPayload: JobCreate = {
          jobOrderId: order.id,
          createdAt: new Date().toISOString(),
          plannedDate: (formData.plannedDate as string) || null,
          title: formData.title!,
          notes: formData.notes ?? "",
          assignedWorkers: formData.assignedWorkers ?? [],
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
        toast.success("Intervento creato ✅");
        await reloadJobs();
      }

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

  // 🔹 elimina intervento (apre dialog)
  const handleDelete = (jobId: string) => {
    setJobToDelete(jobId);
    setOpenConfirm(true);
  };

  const confirmDelete = async () => {
    if (!jobToDelete) return;
    try {
      await jobAPI.remove(jobToDelete);
      toast.success("Intervento eliminato 🗑️");
      await reloadJobs();
    } catch (err) {
      console.error("Errore eliminazione intervento:", err);
      toast.error("Errore durante l'eliminazione dell'intervento ❌");
    } finally {
      setJobToDelete(null);
    }
  };

  const getStoragePath = (fileUrl: string): string => {
    const url = new URL(fileUrl);
    return decodeURIComponent(url.pathname.split("/").slice(3).join("/"));
  };

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

      toast.success(`📤 Caricati ${files.length} file correttamente`);
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
      toast.success("File eliminato 🗑️");
    } catch (err) {
      console.error("Errore eliminazione file:", err);
      toast.error("Errore durante l'eliminazione del file ❌");
    } finally {
      setLoadingDocs(false);
    }
  };

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

  const sortedJobs = [...jobs].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* intestazione commessa */}
      <div className="bg-white shadow rounded-lg p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold mb-2">
          Commessa {order.code}
        </h1>
        <p className="text-sm md:text-base">
          <strong>Cliente:</strong>{" "}
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
        <p className="text-sm md:text-base mt-1">
          <strong>Località:</strong>{" "}
          {order.location?.address && <>{order.location.address} </>}
          {order.location?.mapsUrl && (
            <a
              href={order.location.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-700 ml-2"
            >
              Apri in Maps
            </a>
          )}
        </p>
      </div>

      {/* Note */}
      <div className="bg-white shadow rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold mb-2">📝 Note commessa</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Annota qui informazioni utili..."
          className="w-full p-2 border rounded-lg mb-2"
          rows={4}
        />
        <Button
          onClick={handleSaveNotes}
          className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Salva Note
        </Button>
      </div>

      {/* Allegati */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          📎 Allegati commessa
        </h2>

        <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-gray-500 cursor-pointer hover:border-blue-500 hover:text-blue-500 transition">
          <input
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
                    <span className="text-2xl">{d.icon}</span>
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
                  <Button
                    onClick={() => handleDeleteFile(d.id, d.fileUrl)}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    🗑️ Elimina
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagamenti */}
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
                          (Intervento: {job.title})
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

      {/* Interventi */}
      <div className="bg-white shadow rounded-lg p-4 md:p-6">
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
            className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ➕ Nuovo Intervento
          </Button>
        </div>

        {/* Mobile */}
        <div className="space-y-4 md:hidden">
          {sortedJobs.map((j) => {
            const st = getEffectiveStatus(j);
            const cfg = STATUS_CONFIG[st];
            const isLateRow = j.plannedDate && st === "in_ritardo";

            return (
              <div
                key={j.id}
                className={`border rounded-lg p-4 shadow-sm bg-white ${
                  isLateRow ? "ring-1 ring-red-300" : ""
                }`}
              >
                <div className="text-sm text-gray-500">
                  📅{" "}
                  {j.plannedDate
                    ? new Date(j.plannedDate).toLocaleString("it-IT")
                    : "-"}
                </div>
                <div className="font-semibold mt-1">{j.title}</div>
                <div className="text-sm mt-1">
                  👷{" "}
                  {j.assignedWorkers?.length
                    ? j.assignedWorkers
                        .map((wid) => workers.find((w) => w.id === wid)?.name)
                        .join(", ")
                    : "-"}
                </div>
                <div className="mt-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      cfg?.color ?? "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {cfg?.icon} {cfg?.label ?? st}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1 truncate">
                  📝 {j.notes || "-"}
                </div>
                <div className="flex gap-2 mt-3">
                  <Link
                    to={`/backoffice/jobs/${j.id}`}
                    className="flex-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm text-center"
                  >
                    Apri
                  </Link>
                  <Button
                    onClick={() => handleEdit(j)}
                    className="flex-1 px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                  >
                    ✏️
                  </Button>
                  <Button
                    onClick={() => handleDelete(j.id)}
                    className="flex-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full border-collapse bg-white">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2">Data programmata 📅</th>
                <th className="p-2">Tipologia</th>
                <th className="p-2">Squadra 👷</th>
                <th className="p-2">Stato</th>
                <th className="p-2">Note</th>
                <th className="p-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.map((j) => {
                const st = getEffectiveStatus(j);
                const cfg = STATUS_CONFIG[st];
                const isLateRow = j.plannedDate && st === "in_ritardo";

                return (
                  <tr
                    key={j.id}
                    className={`border-t ${isLateRow ? "bg-red-50" : ""}`}
                  >
                    <td className="p-2">
                      {j.plannedDate
                        ? new Date(j.plannedDate).toLocaleString("it-IT")
                        : "-"}
                    </td>
                    <td className="p-2">{j.title}</td>
                    <td className="p-2">
                      {j.assignedWorkers?.length
                        ? j.assignedWorkers
                            .map(
                              (wid) => workers.find((w) => w.id === wid)?.name
                            )
                            .join(", ")
                        : "-"}
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          cfg?.color ?? "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {cfg?.icon} {cfg?.label ?? st}
                      </span>
                    </td>
                    <td className="p-2 text-sm text-gray-600 truncate max-w-[200px]">
                      {j.notes || "-"}
                    </td>
                    <td className="p-2 flex gap-2">
                      <Link
                        to={`/backoffice/jobs/${j.id}`}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Apri
                      </Link>
                      <Button
                        onClick={() => handleEdit(j)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                      >
                        ✏️
                      </Button>
                      <Button
                        onClick={() => handleDelete(j.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        🗑️
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nuovo/modifica intervento */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg md:text-xl font-bold mb-4">
              {editingId ? "✏️ Modifica Intervento" : "➕ Nuovo Intervento"}
            </h2>

            <input
              type="text"
              name="title"
              placeholder="Tipologia intervento *"
              value={formData.title ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full p-2 border rounded-lg mb-2"
            />

            <label className="block font-semibold mb-1">
              Data e ora programmate
            </label>
            <input
              type="datetime-local"
              name="plannedDate"
              value={(formData.plannedDate as string) ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, plannedDate: e.target.value })
              }
              className="w-full p-2 border rounded-lg mb-2"
            />

            <label className="block font-semibold mb-1">Assegna squadra</label>
            <div className="space-y-1 mb-2 max-h-48 overflow-auto pr-1">
              {workers.map((w) => (
                <label key={w.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.assignedWorkers?.includes(w.id) ?? false}
                    onChange={(e) => {
                      const current = formData.assignedWorkers ?? [];
                      setFormData({
                        ...formData,
                        assignedWorkers: e.target.checked
                          ? [...current, w.id]
                          : current.filter((id) => id !== w.id),
                      });
                    }}
                  />
                  <span>{w.name}</span>
                </label>
              ))}
            </div>

            <textarea
              name="notes"
              placeholder="Note interne"
              value={formData.notes ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full p-2 border rounded-lg mb-2"
            />

            <div className="flex flex-col md:flex-row md:justify-end gap-2">
              <Button
                onClick={() => {
                  setShowForm(false);
                  setFormData({});
                  setEditingId(null);
                }}
                className="w-full md:w-auto px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSaveJob}
                className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salva
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conferma eliminazione intervento */}
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
