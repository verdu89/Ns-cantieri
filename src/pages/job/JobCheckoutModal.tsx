import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import type { Job, Payment } from "@/types";
import { supabase } from "@/supabaseClient";
import { documentAPI } from "@/api/documentAPI";
import { jobAPI } from "@/api/jobs"; // 👈 import aggiunto
import { toast } from "react-hot-toast";

/* ===================== Helpers ===================== */

// 🔹 Upload allegati fine lavoro con toast descrittivi
async function uploadFineLavoro(
  jobId: string,
  files: File[],
  userId: string,
  checkoutIndex: number
) {
  const BUCKET = "order-files";
  const today = new Date().toISOString().split("T")[0];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split(".").pop();
    const newName = `fine_lavoro_${checkoutIndex}_${today}.${ext}`;

    try {
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(`jobs/${jobId}/${newName}`, file, { upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(`jobs/${jobId}/${newName}`);

      await documentAPI.addToJob(jobId, {
        fileName: newName,
        fileUrl: urlData.publicUrl,
        uploadedBy: userId,
      });

      toast.success(`✅ ${file.name} caricato correttamente`);
    } catch (err: any) {
      console.error("Errore upload file:", file.name, err);
      toast.error(`❌ Errore durante il caricamento di ${file.name}`);
      throw err; // blocco l’intero checkout
    }
  }
}

// 🔹 Crea evento di checkout con report completo
async function addCheckoutEvent(
  jobId: string,
  stato: string,
  job: Job,
  payments: Payment[],
  finalConclusion: string
) {
  const report = `--- CHECKOUT REPORT ---
Data: ${new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" })}
Esito: ${stato.toUpperCase()}
Tecnici: ${job.team?.map((t) => t.name).join(", ") || "-"}

💰 Pagamenti:
${
  payments.length > 0
    ? payments
        .map((p) => {
          if (p.collected) {
            return `✅ ${p.label} - ${p.amount.toFixed(2)} € (Incassato)`;
          }
          if (p.partial && p.collectedAmount > 0 && !p.collected) {
            return `🟨 ${p.label} - Incassato ${p.collectedAmount.toFixed(
              2
            )} € / Totale ${p.amount.toFixed(2)} € (Rimane ${(
              p.amount - p.collectedAmount
            ).toFixed(2)} €)`;
          }
          return `⬜ ${p.label} - Da incassare ${p.amount.toFixed(2)} €`;
        })
        .join("\n")
    : "Nessun pagamento registrato"
}

Note intervento:
${job.notes || "-"}

Note finali:
${finalConclusion || "-"}
------------------------------`;

  const { error } = await supabase.from("job_events").insert({
    job_id: jobId,
    date: new Date().toISOString(),
    type:
      stato === "completato"
        ? "check_out_completato"
        : "check_out_da_completare",
    notes: report,
  });

  if (error) throw error;
}

/* ===================== Component ===================== */
export default function JobCheckoutModal({
  job: initialJob, // 👈 lo rinominiamo perché lo ricarichiamo
  payments,
  ultimato,
  setUltimato,
  finalConclusion,
  setFinalConclusion,
  setCheckoutOpen,
  checkingOut,
  setCheckingOut,
  loadData,
  currentUser,
}: {
  job: Job;
  payments: Payment[];
  ultimato: "si" | "no" | null;
  setUltimato: (v: "si" | "no") => void;
  finalConclusion: string;
  setFinalConclusion: (v: string) => void;
  setCheckoutOpen: (v: boolean) => void;
  checkingOut: boolean;
  setCheckingOut: (v: boolean) => void;
  loadData?: () => Promise<void>;
  currentUser: { id: string; name: string; role: string };
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [completed, setCompleted] = useState(false);
  const [job, setJob] = useState<Job>(initialJob);

  // 🔹 quando apro il modal, ricarico il job completo con team
  useEffect(() => {
    (async () => {
      try {
        const fullJob = await jobAPI.getById(initialJob.id);
        if (fullJob) setJob(fullJob);
      } catch (err) {
        console.error("Errore caricamento job completo:", err);
        toast.error("Errore caricamento dati job");
      }
    })();
  }, [initialJob.id]);

  // ✅ calcolo numero checkout successivo
  const checkoutIndex =
    (job.events?.filter(
      (ev) =>
        ev.type === "check_out_completato" ||
        ev.type === "check_out_da_completare"
    ).length || 0) + 1;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const confirmCheckout = async () => {
    if (!ultimato) {
      toast.error("⚠️ Seleziona un esito prima di procedere");
      return;
    }

    const stato = ultimato === "si" ? "completato" : "da_completare";

    setCheckingOut(true);
    try {
      // 1) Upload allegati con indice checkout (con toast descrittivi)
      if (files.length > 0) {
        await uploadFineLavoro(job.id, files, currentUser.id, checkoutIndex);
      }

      // 2) Salva evento checkout con report
      await addCheckoutEvent(job.id, stato, job, payments, finalConclusion);

      // 3) Aggiorna stato del job e azzera le note correnti
      await supabase
        .from("jobs")
        .update({ status: stato, notes: "" })
        .eq("id", job.id);

      // 4) Refresh UI
      await loadData?.();
      setCompleted(true);
      toast.success("✅ Checkout effettuato con successo!");
    } catch (err: any) {
      console.error("Errore nel checkout:", err);
      toast.error(err.message || "Errore durante il checkout");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-lg max-w-3xl mx-auto w-full p-6 space-y-6 overflow-y-auto max-h-[95vh]">
        {!completed ? (
          <>
            <h2 className="text-xl font-semibold">Checkout intervento</h2>

            {/* Cliente & Location */}
            <div className="border p-3 rounded-md bg-gray-50 text-sm">
              <p>
                <strong>Cliente:</strong> {job.customer?.name || "-"}
              </p>
              <p>
                <strong>Indirizzo:</strong> {job.location?.address || "N/D"}
              </p>
            </div>

            {/* Squadra */}
            <div>
              <h3 className="font-medium mb-2">👷 Squadra</h3>
              <p className="text-sm">
                {job.team?.map((t) => t.name).join(", ") || "-"}
              </p>
            </div>

            {/* Pagamenti */}
            <div>
              <h3 className="font-medium mb-2">💰 Pagamenti</h3>
              {payments.length > 0 ? (
                <ul className="divide-y rounded-md border bg-gray-50">
                  {payments.map((p) => {
                    const isCollected = p.collected;
                    const isPartial =
                      p.partial && p.collectedAmount > 0 && !p.collected;
                    const remaining = isCollected
                      ? 0
                      : isPartial
                      ? p.amount - p.collectedAmount
                      : p.amount;

                    return (
                      <li
                        key={p.id}
                        className="flex justify-between items-center p-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {isCollected ? (
                            <span className="text-green-600">✅</span>
                          ) : isPartial ? (
                            <span className="text-yellow-500">🟨</span>
                          ) : (
                            <span className="text-gray-400">⬜</span>
                          )}
                          <span>{p.label}</span>
                        </div>

                        <div className="text-right">
                          {isCollected ? (
                            <span className="font-medium text-green-600">
                              Incassato {p.amount.toFixed(2)} €
                            </span>
                          ) : isPartial ? (
                            <>
                              <span className="block text-yellow-600 font-medium">
                                Incassato {p.collectedAmount.toFixed(2)} €
                              </span>
                              <span className="block text-gray-600 text-xs">
                                Rimane {remaining.toFixed(2)} €
                              </span>
                            </>
                          ) : (
                            <span className="font-medium text-red-600">
                              Da incassare {p.amount.toFixed(2)} €
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">
                  Nessun pagamento registrato
                </p>
              )}
            </div>

            {/* Allegati */}
            <div>
              <h3 className="font-medium mb-2">📎 Allegati fine lavoro</h3>
              <div className="flex gap-2 mb-3">
                <label className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-center cursor-pointer hover:bg-blue-700">
                  📷 Scatta foto
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <label className="w-full sm:w-auto px-4 py-2 bg-gray-100 rounded-lg text-center cursor-pointer hover:bg-gray-200">
                  📎 Allega file
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {files.length > 0 && (
                <ul className="mt-2 text-sm space-y-1">
                  {files.map((f) => {
                    const ext = f.name.split(".").pop();
                    return (
                      <li
                        key={f.name}
                        className="flex justify-between items-center border p-2 rounded-md bg-gray-50"
                      >
                        <div>
                          {`fine_lavoro_${checkoutIndex}_${
                            new Date().toISOString().split("T")[0]
                          }.${ext}`}
                          <span className="ml-2 text-xs text-gray-500">
                            {(f.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <Button
                          onClick={() => removeFile(f.name)}
                          className="w-full sm:w-auto px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs"
                        >
                          🗑️ Rimuovi
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Note intervento */}
            {job.notes && (
              <div>
                <h3 className="font-medium mb-2">📝 Note intervento</h3>
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-md">
                  {job.notes}
                </pre>
              </div>
            )}

            {/* Esito */}
            <div>
              <h3 className="font-medium mb-2">Esito intervento</h3>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="si"
                  checked={ultimato === "si"}
                  onChange={() => setUltimato("si")}
                  className="accent-blue-600"
                />
                Completato
              </label>
              <label className="flex items-center gap-2 text-sm mt-1">
                <input
                  type="radio"
                  value="no"
                  checked={ultimato === "no"}
                  onChange={() => setUltimato("no")}
                  className="accent-blue-600"
                />
                Da completare
              </label>
            </div>

            {/* Note finali */}
            <div>
              <h3 className="font-medium mb-2">📝 Note finali</h3>
              <textarea
                value={finalConclusion}
                onChange={(e) => setFinalConclusion(e.target.value)}
                className="w-full rounded-md border-gray-300 text-sm p-2"
                rows={3}
                placeholder="Inserisci note di chiusura..."
              />
            </div>

            {/* Azioni */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button
                onClick={() => setCheckoutOpen(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Annulla
              </Button>
              <Button
                onClick={confirmCheckout}
                disabled={checkingOut}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {checkingOut ? "⏳ Conferma..." : "Conferma"}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold text-green-600">
              ✅ Checkout completato!
            </h2>
            <Button
              onClick={() => setCheckoutOpen(false)}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Chiudi
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
