import { Button } from "@/components/ui/Button";
// File: pages/backoffice/DocumentiPage.tsx
import { useEffect, useState, useRef } from "react";
import { Upload, Trash2, Download, Search } from "lucide-react";
import { jobOrderAPI } from "../../api/jobOrders";
import { documentAPI } from "../../api/documentAPI";
import { jobAPI } from "../../api/jobs";
import type { JobOrder, Documento } from "../../types";
import { formatDocumento } from "../../utils/documenti";
import { supabase } from "../../supabaseClient";
import toast, { Toaster } from "react-hot-toast";

interface DocumentoExtended extends Documento {
  source: "commessa" | "job";
  commessaCode?: string;
}

export default function DocumentiPage() {
  const [commesse, setCommesse] = useState<JobOrder[]>([]);
  const [documenti, setDocumenti] = useState<DocumentoExtended[]>([]);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCommessa, setUploadCommessa] = useState<string>("");

  // Ref per resettare input file
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 🔎 Filtri
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("");

  // 🔹 Modale eliminazione
  const [confirmDelete, setConfirmDelete] = useState<DocumentoExtended | null>(
    null
  );

  // 🔹 Carico commesse e documenti
  useEffect(() => {
    async function loadData() {
      const c = await jobOrderAPI.list();
      setCommesse(c);

      const docsOrder = await Promise.all(
        c.map(async (commessa) => {
          const d = await documentAPI.listByOrder(commessa.id);
          return d.map((doc) => ({
            ...doc,
            source: "commessa" as const,
            commessaCode: commessa.code,
          }));
        })
      );

      const docsJob = await Promise.all(
        c.map(async (commessa) => {
          const jobs = await jobAPI.listByOrder(commessa.id);
          const allDocs: DocumentoExtended[] = [];
          for (const job of jobs) {
            const d = await documentAPI.listByJob(job.id);
            allDocs.push(
              ...d.map((doc) => ({
                ...doc,
                source: "job" as const,
                commessaCode: commessa.code,
              }))
            );
          }
          return allDocs;
        })
      );

      // 🔹 Rimuovo duplicati
      setDocumenti(
        [...docsOrder.flat(), ...docsJob.flat()].filter(
          (doc, index, self) =>
            index ===
            self.findIndex((d) => d.id === doc.id && d.source === doc.source)
        )
      );
    }

    loadData();
  }, []);

  // 🔹 Upload documento su commessa
  async function handleUpload() {
    if (!uploadFile || !uploadCommessa) {
      toast.error("Seleziona una commessa e un file ❌");
      return;
    }

    const commessa = commesse.find((c) => c.id === uploadCommessa);
    if (!commessa) {
      toast.error("Commessa non valida ❌");
      return;
    }

    try {
      const filePath = `${commessa.id}/${Date.now()}-${uploadFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("order-files")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("order-files")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      await documentAPI.addToOrder(commessa.id, {
        fileName: uploadFile.name,
        fileUrl: publicUrl,
        uploadedBy: "Backoffice",
      });

      const docs = await documentAPI.listByOrder(commessa.id);

      // 🔹 Aggiungo e deduplico
      setDocumenti((prev) => {
        const nuoviDocs = docs.map((doc) => ({
          ...doc,
          source: "commessa" as const,
          commessaCode: commessa.code,
        }));

        const unione = [...prev, ...nuoviDocs];

        return unione.filter(
          (doc, index, self) =>
            index ===
            self.findIndex((d) => d.id === doc.id && d.source === doc.source)
        );
      });

      // 🔹 Reset commessa e file
      setUploadCommessa("");
      setUploadFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success("Documento caricato con successo ✅");
    } catch (err) {
      console.error("Errore durante upload:", err);
      toast.error("Errore durante il caricamento ❌");
    }
  }

  // 🔹 Conferma eliminazione
  async function confirmDeleteDoc(doc: DocumentoExtended) {
    try {
      if (doc.source === "commessa") {
        await documentAPI.deleteFromOrder(doc.id);
      } else {
        await documentAPI.deleteFromJob(doc.id);
      }

      setDocumenti((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("Documento eliminato ✅");
    } catch (err) {
      console.error("Errore eliminazione:", err);
      toast.error("Errore durante eliminazione ❌");
    } finally {
      setConfirmDelete(null);
    }
  }

  // 🔎 Applico filtri
  const documentiFiltrati = documenti.filter((doc) => {
    const d = formatDocumento(doc);
    return (
      (!filterTipo || doc.source === filterTipo) &&
      (!search ||
        d.fileName.toLowerCase().includes(search.toLowerCase()) ||
        (doc.commessaCode ?? "").toLowerCase().includes(search.toLowerCase()))
    );
  });

  // 🔹 Recupero codice commessa selezionata
  const commessaSelezionata = commesse.find((c) => c.id === uploadCommessa);

  return (
    <main className="p-4 md:p-6 space-y-6">
      <Toaster position="top-right" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold">📂 Archivio Documenti</h1>

        {/* Barra ricerca */}
        <div className="flex items-center border rounded-lg px-3 py-2 w-full md:w-80 bg-white">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="🔍 Cerca documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm"
          />
        </div>
      </div>

      {/* Filtro tipo documento */}
      <div>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="border px-3 py-2 rounded-lg w-full md:w-48"
        >
          <option value="">Tutti i tipi</option>
          <option value="commessa">Commessa</option>
          <option value="job">Intervento</option>
        </select>
      </div>

      {/* Form caricamento */}
      <div className="bg-white shadow rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Carica nuovo documento su commessa</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 🔹 Campo ricerca commessa */}
          <div className="relative">
            <input
              type="text"
              value={commessaSelezionata?.code || uploadCommessa}
              onChange={(e) => setUploadCommessa(e.target.value)}
              placeholder="Inserisci codice commessa..."
              className="border px-3 py-2 rounded-lg w-full"
            />
            {uploadCommessa.length > 0 && !commessaSelezionata && (
              <div className="absolute z-10 bg-white border rounded-lg shadow mt-1 max-h-40 overflow-y-auto w-full">
                {commesse
                  .filter((c) =>
                    c.code.toLowerCase().includes(uploadCommessa.toLowerCase())
                  )
                  .map((c) => (
                    <div
                      key={c.id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => setUploadCommessa(c.id)}
                    >
                      {c.code}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <input
            key={documenti.length} // 👈 forza reset dell’input dopo upload
            type="file"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="border px-3 py-2 rounded-lg w-full"
          />

          <Button
            onClick={handleUpload}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full md:w-auto"
          >
            <Upload className="w-5 h-5" /> Carica
          </Button>
        </div>
      </div>

      {/* Lista Documenti */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Nome file</th>
                <th className="p-3">Commessa</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Caricato da</th>
                <th className="p-3">Data</th>
                <th className="p-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {documentiFiltrati.map((doc) => {
                const d = formatDocumento(doc);
                return (
                  <tr
                    key={`desktop-${doc.source}-${d.id}`}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-3 flex items-center gap-2">
                      {d.icon} {d.fileName}
                    </td>
                    <td className="p-3">{doc.commessaCode ?? "-"}</td>
                    <td className="p-3">
                      {doc.source === "commessa" ? "Commessa" : "Intervento"}
                    </td>
                    <td className="p-3">{d.uploadedBy}</td>
                    <td className="p-3">{d.formattedDate}</td>
                    <td className="p-3 text-right flex gap-2 justify-end">
                      <a
                        href={d.fileUrl}
                        download
                        className="p-2 rounded-lg hover:bg-green-100 text-green-600"
                        title="Scarica"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                      <Button
                        onClick={() => setConfirmDelete(doc)}
                        className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                        title="Elimina"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {documentiFiltrati.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Nessun documento trovato
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y">
          {documentiFiltrati.map((doc) => {
            const d = formatDocumento(doc);
            return (
              <div
                key={`mobile-${doc.source}-${d.id}`}
                className="p-4 flex flex-col space-y-2"
              >
                <div className="flex items-center gap-2">
                  {d.icon} <span className="font-medium">{d.fileName}</span>
                </div>
                <p className="text-sm text-gray-600">
                  <strong>Commessa:</strong> {doc.commessaCode ?? "-"}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Tipo:</strong>{" "}
                  {doc.source === "commessa" ? "Commessa" : "Intervento"}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Caricato da:</strong> {d.uploadedBy}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Data:</strong> {d.formattedDate}
                </p>
                <div className="flex gap-2 mt-3">
                  <a
                    href={d.fileUrl}
                    download
                    className="flex-1 text-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    ⬇️ Scarica
                  </a>
                  <Button
                    onClick={() => setConfirmDelete(doc)}
                    className="flex-1 text-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    🗑️ Elimina
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modale conferma */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96 space-y-4">
            <h2 className="text-lg font-semibold">Conferma eliminazione</h2>
            <p className="text-sm text-gray-600">
              Sei sicuro di voler eliminare{" "}
              <span className="font-medium">{confirmDelete.fileName}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Annulla
              </Button>
              <Button
                onClick={() => confirmDeleteDoc(confirmDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Elimina
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
