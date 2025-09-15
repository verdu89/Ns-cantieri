import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { Documento } from "@/types";
import { supabase } from "@/supabaseClient";
import { documentAPI } from "@/api/documentAPI";
import { toast } from "react-hot-toast";

interface JobDocumentsProps {
  orderDocs: Documento[];
  docs: Documento[];
  setDocs: (v: Documento[]) => void;
  currentUserId: string;
  jobId: string;
  canEdit: boolean;
}

export default function JobDocuments({
  orderDocs,
  docs,
  setDocs,
  currentUserId,
  jobId,
  canEdit,
}: JobDocumentsProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Documento | null>(null);

  const BUCKET = "order-files" as const;

  const normalizeUrl = (url: string) =>
    url?.startsWith("http://") ? url.replace("http://", "https://") : url;

  const isImage = (fileName: string) =>
    /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

  // Upload multiplo
  const handleUploadDocs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newDocs: Documento[] = [];

      for (const file of Array.from(files)) {
        const path = `jobs/${jobId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file);
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(path);
        const publicUrl = urlData.publicUrl;

        const added = await documentAPI.addToJob(jobId, {
          fileName: file.name,
          fileUrl: publicUrl,
          uploadedBy: currentUserId,
        } as any);

        newDocs.push(added);
      }

      setDocs([...docs, ...newDocs]);
      toast.success(`📤 Caricati ${files.length} file correttamente`);
    } catch (err) {
      console.error("Upload documenti job fallito:", err);
      toast.error("Errore durante il caricamento dei file");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  };

  // Eliminazione documento
  const handleDeleteDoc = async (doc: Documento) => {
    setDeletingId(doc.id);
    try {
      const u = new URL(doc.fileUrl);
      const parts = decodeURIComponent(u.pathname).split("/");
      const publicIdx = parts.findIndex((p) => p === "public");
      const key = parts.slice(publicIdx + 2).join("/");

      const { error: stErr } = await supabase.storage
        .from(BUCKET)
        .remove([key]);
      if (stErr) throw stErr;

      await documentAPI.deleteFromJob(doc.id);
      setDocs(docs.filter((d) => d.id !== doc.id));

      toast.success("🗑️ Documento eliminato");
    } catch (err) {
      console.error("Eliminazione documento job fallita:", err);
      toast.error("Errore durante l'eliminazione");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <Card className="scroll-on-open">
        <CardHeader>
          <CardTitle>📂 Documenti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Documenti commessa */}
          <div>
            <div className="font-medium mb-2">Documenti commessa</div>
            {orderDocs?.length ? (
              <ul className="mt-2 text-sm divide-y">
                {orderDocs.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-col md:flex-row md:justify-between md:items-center py-2 gap-1"
                  >
                    <a
                      href={normalizeUrl(d.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={d.fileName}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="truncate break-all text-blue-600 hover:underline"
                    >
                      {d.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">
                Nessun documento per la commessa.
              </div>
            )}
          </div>

          {/* Documenti job */}
          <div>
            <div className="font-medium mb-2">Documenti intervento</div>

            {docs?.length ? (
              <ul className="mt-2 text-sm divide-y">
                {docs.map((d) => {
                  const isFineLavoro = d.fileName?.startsWith("fine_lavoro_");
                  const img = isImage(d.fileName);

                  return (
                    <li
                      key={d.id}
                      className="flex flex-col md:flex-row md:justify-between md:items-center py-2 gap-2"
                    >
                      <div className="flex items-center gap-3 max-w-full">
                        {img && (
                          <img
                            src={normalizeUrl(d.fileUrl)}
                            alt={d.fileName}
                            className="w-10 h-10 object-cover rounded border"
                          />
                        )}
                        <div className="flex flex-col min-w-0">
                          <a
                            href={normalizeUrl(d.fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={d.fileName}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="truncate break-all text-blue-600 hover:underline"
                          >
                            {d.fileName}
                          </a>
                          {isFineLavoro && (
                            <span className="mt-1 inline-block text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full w-fit">
                              Fine lavoro
                            </span>
                          )}
                        </div>
                      </div>

                      {canEdit && (
                        <Button
                          onClick={() => setConfirmDelete(d)}
                          disabled={deletingId === d.id}
                          className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingId === d.id
                            ? "⏳ Eliminazione..."
                            : "🗑️ Elimina"}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">
                Nessun documento per l’intervento.
              </div>
            )}

            {canEdit && (
              <div className="mt-6">
                <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-gray-500 cursor-pointer hover:border-blue-500 hover:text-blue-500 transition text-center text-sm">
                  <input
                    type="file"
                    multiple
                    onChange={handleUploadDocs}
                    disabled={uploading}
                    className="hidden"
                  />
                  {uploading
                    ? "⏳ Caricamento in corso..."
                    : "📤 Trascina file o clicca per caricare"}
                </label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modale conferma eliminazione */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96 space-y-4">
            <h2 className="text-lg font-semibold">Conferma eliminazione</h2>
            <p className="text-sm text-gray-600">
              Sei sicuro di voler eliminare{" "}
              <span className="font-medium">{confirmDelete.fileName}</span>?
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                onClick={() => setConfirmDelete(null)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Annulla
              </Button>
              <Button
                onClick={() => handleDeleteDoc(confirmDelete)}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Elimina
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
