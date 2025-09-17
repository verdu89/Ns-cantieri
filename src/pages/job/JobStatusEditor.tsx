// src/pages/job/JobStatusEditor.tsx
import { Button } from "@/components/ui/Button";
import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { Job, Worker } from "@/types";
import { supabase } from "@/supabaseClient";
import { STATUS_CONFIG } from "@/config/statusConfig";
import { toast } from "react-hot-toast";
import { toDbDate, toInputDateTime } from "@/utils/date";

interface JobStatusEditorProps {
  job: Job;
  setJob: (job: Job) => void;
  workers: Worker[];
  assignedWorkers: string[];
  setAssignedWorkers: (ids: string[]) => void;
  status: Job["status"];
  setStatus: (s: Job["status"]) => void;
  plannedLocal: string;
  setPlannedLocal: (val: string) => void;
}

export default function JobStatusEditor({
  job,
  setJob,
  workers,
  assignedWorkers,
  setAssignedWorkers,
  status,
  setStatus,
  plannedLocal,
  setPlannedLocal,
}: JobStatusEditorProps) {
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Job["status"]>(status);

  const formRef = useRef<HTMLDivElement>(null);

  // 🔹 scroll automatico quando appare un form
  useEffect(() => {
    if ((showAssignForm || showOverride) && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showAssignForm, showOverride]);

  // 🔹 usa direttamente lo stato reale del job (senza ricalcolare)
  const cfg = STATUS_CONFIG[status] ?? {
    color: "bg-gray-200 text-gray-700",
    label: "Stato sconosciuto",
    icon: "❓",
  };

  const teamWorkers = useMemo(
    () => workers.filter((w) => assignedWorkers.includes(w.id)),
    [workers, assignedWorkers]
  );

  const handleSave = async (
    updates: Record<string, any>,
    successMsg: string
  ) => {
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", job.id)
        .select()
        .single();

      if (error) throw error;

      // 🔹 aggiorna subito il job completo dal DB
      if (data) {
        setJob(data);
      }

      // 🔹 aggiorna stati locali per consistenza UI
      if (updates.status !== undefined) {
        setStatus(updates.status);
      }

      if (updates.planned_date !== undefined) {
        setPlannedLocal(
          updates.planned_date ? toInputDateTime(updates.planned_date) : ""
        );
      }

      if (updates.assigned_workers !== undefined) {
        setAssignedWorkers(updates.assigned_workers ?? []);
      }

      toast.success(successMsg);
    } catch (err: any) {
      console.error(err);
      toast.error("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = () => {
    if (!plannedLocal || assignedWorkers.length === 0) {
      toast.error("Seleziona data e almeno un montatore");
      return;
    }

    handleSave(
      {
        status: "assegnato",
        planned_date: toDbDate(plannedLocal),
        assigned_workers: assignedWorkers,
      },
      "Lavoro assegnato con successo"
    );

    setShowAssignForm(false);
  };

  const handleSaveOverride = () => {
    const keepPlanning: Job["status"][] = [
      "assegnato",
      "in_corso",
      "in_ritardo",
    ];
    const updates: Record<string, any> = { status: selectedStatus };

    if (!keepPlanning.includes(selectedStatus)) {
      updates.planned_date = null;
      updates.assigned_workers = [];
    }

    handleSave(updates, "Stato aggiornato con successo");
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
          {teamWorkers.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {teamWorkers.map((w) => (
                <li key={w.id}>👷 {w.name}</li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">Nessun tecnico assegnato</div>
          )}
        </div>

        {/* Azioni */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => {
              setShowAssignForm(!showAssignForm);
              setShowOverride(false);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            📌 Assegna lavoro
          </Button>
          <Button
            onClick={() => {
              setShowOverride(!showOverride);
              setShowAssignForm(false);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            📝 Modifica stato
          </Button>
        </div>

        {/* Form assegnazione */}
        {showAssignForm && (
          <div ref={formRef} className="space-y-4 border rounded-md p-4">
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
                      className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                    />
                    {w.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => setShowAssignForm(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Annulla
              </Button>
              <Button
                onClick={handleAssign}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "⏳ Salvataggio..." : "Conferma assegnazione"}
              </Button>
            </div>
          </div>
        )}

        {/* Override stato */}
        {showOverride && (
          <div ref={formRef} className="space-y-2 border rounded-md p-4">
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
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <Button
                onClick={() => setShowOverride(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSaveOverride}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
              >
                {saving ? "⏳ Salvataggio..." : "Salva stato"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
