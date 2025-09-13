import { useState } from "react";
import type { Job } from "@/types";
import { jobAPI } from "@/api/jobs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { toast } from "react-hot-toast";

interface JobNotesProps {
  job: Job;
  setJob: React.Dispatch<React.SetStateAction<Job | null>>; // ✅ tip corretto
  orderNotes?: string; // note commessa (solo lettura)
}

export default function JobNotes({ job, setJob, orderNotes }: JobNotesProps) {
  const [notes, setNotes] = useState(job.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await jobAPI.update(job.id, { notes });
      if (updated) {
        setJob((prev) =>
          prev ? { ...prev, ...updated, events: prev.events } : updated
        );
        toast.success("📝 Note intervento aggiornate");
        setEditing(false);
      }
    } catch (err) {
      console.error("Errore salvataggio note:", err);
      toast.error("Errore durante il salvataggio delle note ❌");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📝 Note</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* NOTE COMMESSA */}
        <div>
          <h3 className="text-md font-semibold mb-2 pt-8">📋 Note commessa</h3>
          <div className="text-gray-700 whitespace-pre-line min-h-[60px] bg-gray-50 rounded-md p-2">
            {orderNotes && orderNotes.trim() !== ""
              ? orderNotes
              : "Nessuna nota presente."}
          </div>
        </div>

        {/* NOTE INTERVENTO */}
        <div>
          <h3 className="text-md font-semibold mb-2 pt-2">
            🛠️ Note intervento corrente
          </h3>

          {!editing ? (
            <>
              <div className="text-gray-700 whitespace-pre-line min-h-[60px]">
                {job.notes && job.notes.trim() !== ""
                  ? job.notes
                  : "Nessuna nota presente."}
              </div>
              <button
                onClick={() => {
                  setNotes(job.notes ?? "");
                  setEditing(true);
                }}
                className="mt-3 px-4 py-2 bg-yellow-500 text-white rounded-lg"
              >
                ✏️ Modifica
              </button>
            </>
          ) : (
            <>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scrivi le note dell'intervento..."
                className="w-full p-2 border rounded mb-2"
                rows={4}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  {saving ? "⏳ Salvataggio..." : "Salva"}
                </button>
                <button
                  onClick={() => {
                    setNotes(job.notes ?? "");
                    setEditing(false);
                  }}
                  className="px-4 py-2 bg-gray-300 rounded-lg"
                >
                  Annulla
                </button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
