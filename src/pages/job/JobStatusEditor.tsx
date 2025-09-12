import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { Job, Worker } from "@/types";
import { supabase } from "@/supabaseClient"; // 👈 controlla il path corretto
import { STATUS_CONFIG } from "@/config/statusConfig";

interface JobStatusEditorProps {
  job: Job;
  workers: Worker[];
  assignedWorkers: string[];
  setAssignedWorkers: (ids: string[]) => void;
  status: Job["status"];
  setStatus: (s: Job["status"]) => void;
  plannedLocal: string;
  setPlannedLocal: (val: string) => void;
  showToast?: (type: "success" | "error", msg: string) => void;
}

export default function JobStatusEditor({
  job,
  workers,
  assignedWorkers,
  setAssignedWorkers,
  status,
  setStatus,
  plannedLocal,
  setPlannedLocal,
  showToast,
}: JobStatusEditorProps) {
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Job["status"]>(status);

  const cfg = STATUS_CONFIG[status] ?? {
    badge: "bg-gray-200 text-gray-700",
    label: "Stato sconosciuto",
    icon: "❓",
  };

  // Salva modifiche su Supabase
  const handleSave = async (updates: Record<string, any>, successMsg: string) => {
    try {
      setSaving(true);
      const { error } = await supabase.from("jobs").update(updates).eq("id", job.id);

      if (error) throw error;

      if (updates.status) setStatus(updates.status);
      if (updates.planned_date) setPlannedLocal(updates.planned_date);
      if (updates.assigned_workers) setAssignedWorkers(updates.assigned_workers);

      showToast?.("success", successMsg);
    } catch (err: any) {
      console.error(err);
      showToast?.("error", "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = () => {
    if (!plannedLocal || assignedWorkers.length === 0) {
      showToast?.("error", "Seleziona data e almeno un montatore");
      return;
    }

    handleSave(
      {
        status: "assegnato",
        planned_date: plannedLocal ? plannedLocal + ":00" : null, // 👈 datetime-local -> stringa completa
        assigned_workers: assignedWorkers,
      },
      "Lavoro assegnato con successo"
    );

    setShowAssignForm(false);
  };

  const handleSaveOverride = () => {
    handleSave({ status: selectedStatus }, "Stato aggiornato con successo");
    setShowOverride(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stato & Assegnazioni</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stato attuale */}
        <div>
          <span className={`px-3 py-1 rounded-full text-sm ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
        </div>

        {/* Squadra attuale */}
        <div className="text-sm">
          <div className="font-medium mb-1">Squadra assegnata</div>
          {assignedWorkers.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {assignedWorkers.map((wid) => {
                const worker = workers.find((w) => w.id === wid);
                return <li key={wid}>👷 {worker?.name ?? wid}</li>;
              })}
            </ul>
          ) : (
            <div className="text-gray-500">Nessun tecnico assegnato</div>
          )}
        </div>

        {/* Azioni */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setShowAssignForm(!showAssignForm);
              setShowOverride(false);
            }}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
          >
            📌 Assegna lavoro
          </button>
          <button
            onClick={() => {
              setShowOverride(!showOverride);
              setShowAssignForm(false);
            }}
            className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md text-sm hover:bg-orange-200"
          >
            📝 Modifica stato
          </button>
        </div>

        {/* Form assegnazione */}
        {showAssignForm && (
          <div className="space-y-4 border rounded-md p-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Data programmata
              </label>
              <input
                type="datetime-local"
                value={plannedLocal}
                onChange={(e) => setPlannedLocal(e.target.value)}
                className="w-full rounded-md border-gray-300 text-sm p-2"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Montatori assegnati
              </label>
              <div className="flex flex-col gap-1">
                {workers.map((w) => (
                  <label key={w.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={assignedWorkers.includes(w.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssignedWorkers([...assignedWorkers, w.id]);
                        } else {
                          setAssignedWorkers(
                            assignedWorkers.filter((id) => id !== w.id)
                          );
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    {w.name}
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={handleAssign}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "⏳ Salvataggio..." : "Conferma assegnazione"}
            </button>
          </div>
        )}

        {/* Override stato */}
        {showOverride && (
          <div className="space-y-2 border rounded-md p-4">
            <label className="block text-sm font-medium text-gray-700">
              Seleziona nuovo stato
            </label>
            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as Job["status"])
              }
              className="w-full rounded-md border-gray-300 text-sm p-2"
            >
              {(Object.entries(STATUS_CONFIG) as [Job["status"], any][]).map(
                ([key, val]) => (
                  <option key={key} value={key}>
                    {val.icon} {val.label}
                  </option>
                )
              )}
            </select>
            <button
              onClick={handleSaveOverride}
              disabled={saving}
              className="mt-2 px-4 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 disabled:opacity-50"
            >
              {saving ? "⏳ Salvataggio..." : "Salva stato"}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
