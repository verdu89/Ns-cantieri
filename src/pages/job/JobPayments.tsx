import { Button } from "@/components/ui/Button";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { Job, Payment } from "@/types";
import { toast } from "react-hot-toast";

interface JobPaymentsProps {
  job: Job;
  payments: Payment[];
  setPayments: (p: Payment[]) => void;
  isBackoffice: boolean;
  currentUserRole: string; // "admin" | "backoffice" | "worker"
  readOnly?: boolean;
}

export default function JobPayments({
  job,
  payments,
  setPayments,
  isBackoffice,
  currentUserRole,
  readOnly = false,
}: JobPaymentsProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editing]);

  const updatePayment = (id: string, changes: Partial<Payment>) => {
    if (readOnly) return;
    setPayments(payments.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  };

  const removePayment = (id: string) => {
    if (readOnly) return;
    setPayments(payments.filter((p) => p.id !== id));
  };

  const addPayment = () => {
    if (readOnly) return;
    const row: Payment = {
      id: `tmp-${Date.now()}`,
      jobId: job.id,
      label: "Nuovo pagamento",
      amount: 0,
      collected: false,
      partial: false,
      collectedAmount: 0,
    };
    setPayments([...payments, row]);
  };

  // 💾 salva lato backoffice
  const savePayments = async () => {
    if (readOnly) return;
    try {
      setSaving(true);
      await supabase.from("payments").delete().eq("job_id", job.id);

      if (payments.length > 0) {
        const rows = payments.map((p) => ({
          job_id: job.id,
          label: p.label,
          amount: p.amount,
          collected: p.collected,
          partial: p.partial,
          collected_amount: p.collected ? p.amount : p.collectedAmount ?? 0,
        }));
        const { error } = await supabase.from("payments").insert(rows);
        if (error) throw error;
      }

      const { data: fresh, error: loadError } = await supabase
        .from("payments")
        .select("*")
        .eq("job_id", job.id);
      if (loadError) throw loadError;

      const mapped: Payment[] = (fresh || []).map((r: any) => ({
        id: r.id,
        jobId: r.job_id,
        label: r.label,
        amount: r.amount,
        collected: r.collected,
        partial: r.partial,
        collectedAmount: r.collected ? r.amount : r.collected_amount ?? 0,
      }));

      setPayments(mapped);
      setEditing(false);
      toast.success("Pagamenti aggiornati ✅");
    } catch (err) {
      console.error(err);
      toast.error("Errore nel salvataggio ❌");
    } finally {
      setSaving(false);
    }
  };

  // 💾 update immediato lato worker
  const updatePaymentDirect = async (id: string, changes: Partial<Payment>) => {
    if (readOnly) return;
    try {
      const updated = payments.map((p) =>
        p.id === id ? { ...p, ...changes } : p
      );
      setPayments(updated);

      const row = updated.find((p) => p.id === id);
      if (row) {
        const { error } = await supabase
          .from("payments")
          .update({
            collected: row.collected,
            partial: row.partial,
            collected_amount: row.collected
              ? row.amount
              : row.collectedAmount ?? 0,
          })
          .eq("id", row.id);
        if (error) throw error;
      }
    } catch (err) {
      console.error(err);
      toast.error("Errore aggiornamento pagamento ❌");
    }
  };

  const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalCollected = payments.reduce(
    (s, p) =>
      s + (p.collected ? p.amount : p.partial ? p.collectedAmount ?? 0 : 0),
    0
  );

  const renderSummary = () => (
    <div className="border-t pt-3 text-sm space-y-1">
      <div>
        <strong>Totale previsto:</strong>{" "}
        {total.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
      </div>
      <div className="text-green-600">
        <strong>Totale incassato:</strong>{" "}
        {totalCollected.toLocaleString("it-IT", {
          style: "currency",
          currency: "EUR",
        })}
      </div>
      <div
        className={
          total - totalCollected > 0
            ? "text-red-700 font-bold"
            : "text-green-700 font-bold"
        }
      >
        <strong>Residuo:</strong>{" "}
        {(total - totalCollected).toLocaleString("it-IT", {
          style: "currency",
          currency: "EUR",
        })}
      </div>
    </div>
  );

  return (
    <Card className="scroll-on-open">
      <CardHeader>
        <CardTitle>💰 Pagamenti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* BACKOFFICE (view) */}
        {isBackoffice && !editing && (
          <div className="space-y-3">
            {payments.length === 0 ? (
              <div className="text-sm text-gray-500">
                Nessun pagamento registrato.
              </div>
            ) : (
              <>
                {/* Desktop tabella */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Etichetta</th>
                        <th className="p-2 text-right">Importo</th>
                        <th className="p-2 text-center">Stato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="p-2 font-medium">{p.label}</td>
                          <td className="p-2 font-bold text-blue-700 text-right">
                            {p.amount.toLocaleString("it-IT", {
                              style: "currency",
                              currency: "EUR",
                            })}
                          </td>
                          <td className="p-2 text-center">
                            {p.collected ? (
                              <span className="text-green-700 font-semibold">
                                ✅ Incassato
                              </span>
                            ) : p.partial ? (
                              <span className="text-yellow-600 font-semibold">
                                ⚠️ Parziale
                              </span>
                            ) : (
                              <span className="text-red-600 font-semibold">
                                ❌ Non incassato
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="border rounded-lg p-3 shadow-sm bg-white"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{p.label}</span>
                        <span className="font-bold text-blue-700">
                          {p.amount.toLocaleString("it-IT", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </span>
                      </div>
                      <div className="mt-1 text-sm">
                        {p.collected ? (
                          <span className="text-green-700 font-semibold">
                            ✅ Incassato
                          </span>
                        ) : p.partial ? (
                          <span className="text-yellow-600 font-semibold">
                            ⚠️ Parziale
                          </span>
                        ) : (
                          <span className="text-red-600 font-semibold">
                            ❌ Non incassato
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {payments.length > 0 && renderSummary()}

            {!readOnly && (
              <Button
                onClick={() => setEditing(true)}
                className="mt-3 w-full sm:w-auto px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                ✏️ Modifica
              </Button>
            )}
          </div>
        )}

        {/* BACKOFFICE EDITING */}
        {isBackoffice && editing && !readOnly && (
          <div ref={editRef} className="space-y-3">
            {payments.map((p) => (
              <div
                key={p.id}
                className="border rounded-lg p-3 shadow-sm bg-white flex flex-col gap-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  {/* Importo */}
                  <input
                    type="number"
                    value={p.amount}
                    onChange={(e) =>
                      updatePayment(p.id, {
                        amount: parseFloat(e.target.value || "0"),
                      })
                    }
                    className="border rounded p-2 w-full sm:w-32 font-bold text-blue-700"
                  />

                  {/* Label */}
                  <input
                    value={p.label}
                    onChange={(e) =>
                      updatePayment(p.id, { label: e.target.value })
                    }
                    className="border rounded p-2 flex-1"
                  />
                </div>

                {/* Stato */}
                <div className="flex flex-col gap-1 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={p.collected}
                      onChange={(e) =>
                        updatePayment(p.id, {
                          collected: e.target.checked,
                          partial: false,
                          collectedAmount: e.target.checked ? p.amount : 0,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                    />
                    Incassato
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={p.partial && !p.collected}
                      onChange={(e) =>
                        updatePayment(p.id, {
                          collected: false,
                          partial: e.target.checked,
                          collectedAmount: e.target.checked
                            ? p.collectedAmount
                            : 0,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                    />
                    Parziale
                  </label>

                  {p.partial && !p.collected && (
                    <input
                      type="number"
                      value={p.collectedAmount ?? ""}
                      placeholder="Importo incassato"
                      onChange={(e) =>
                        updatePayment(p.id, {
                          collectedAmount: parseFloat(e.target.value || "0"),
                        })
                      }
                      className="border rounded p-2 text-sm w-full sm:w-32"
                    />
                  )}

                  {!p.collected && !p.partial && (
                    <div className="text-gray-500 italic">❌ Non incassato</div>
                  )}
                </div>

                {/* Elimina */}
                <Button
                  onClick={() => removePayment(p.id)}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  🗑️ Elimina
                </Button>
              </div>
            ))}

            <Button
              onClick={addPayment}
              className="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              ➕ Aggiungi pagamento
            </Button>

            {payments.length > 0 && renderSummary()}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => setEditing(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Annulla
              </Button>
              <Button
                onClick={savePayments}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "⏳" : "💾 Salva"}
              </Button>
            </div>
          </div>
        )}

        {/* WORKER */}
        {currentUserRole === "worker" && !isBackoffice && (
          <div className="space-y-3">
            {payments.length === 0 && (
              <div className="text-sm text-gray-500">
                Nessun pagamento previsto
              </div>
            )}

            {/* Desktop tabella */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Etichetta</th>
                    <th className="p-2 text-right">Importo</th>
                    <th className="p-2 text-center">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2">{p.label}</td>
                      <td className="p-2 font-bold text-blue-700 text-right">
                        {p.amount.toLocaleString("it-IT", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </td>
                      <td className="p-2 text-center">
                        {readOnly ? (
                          <span>
                            {p.collected
                              ? "✅ Incassato"
                              : p.partial
                              ? "⚠️ Parziale"
                              : "❌ Non incassato"}
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1 text-sm items-start sm:items-center">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={p.collected}
                                onChange={(e) =>
                                  updatePaymentDirect(p.id, {
                                    collected: e.target.checked,
                                    partial: false,
                                    collectedAmount: e.target.checked
                                      ? p.amount
                                      : 0,
                                  })
                                }
                                className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                              />
                              Incassato
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={p.partial && !p.collected}
                                onChange={(e) =>
                                  updatePaymentDirect(p.id, {
                                    collected: false,
                                    partial: e.target.checked,
                                    collectedAmount: e.target.checked
                                      ? p.collectedAmount
                                      : 0,
                                  })
                                }
                                className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                              />
                              Parziale
                            </label>
                            {p.partial && !p.collected && (
                              <input
                                type="number"
                                value={p.collectedAmount ?? ""}
                                placeholder="Importo incassato"
                                onChange={(e) =>
                                  updatePaymentDirect(p.id, {
                                    collectedAmount: parseFloat(
                                      e.target.value || "0"
                                    ),
                                  })
                                }
                                className="border rounded p-2 text-sm w-32"
                              />
                            )}
                            {!p.collected && !p.partial && (
                              <div className="text-gray-500 italic">
                                ❌ Non incassato
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="border rounded-lg p-3 shadow-sm bg-white"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{p.label}</span>
                    <span className="font-bold text-blue-700">
                      {p.amount.toLocaleString("it-IT", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1 text-sm">
                    {readOnly ? (
                      <span>
                        {p.collected
                          ? "✅ Incassato"
                          : p.partial
                          ? "⚠️ Parziale"
                          : "❌ Non incassato"}
                      </span>
                    ) : (
                      <>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={p.collected}
                            onChange={(e) =>
                              updatePaymentDirect(p.id, {
                                collected: e.target.checked,
                                partial: false,
                                collectedAmount: e.target.checked
                                  ? p.amount
                                  : 0,
                              })
                            }
                            className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                          />
                          Incassato
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={p.partial && !p.collected}
                            onChange={(e) =>
                              updatePaymentDirect(p.id, {
                                collected: false,
                                partial: e.target.checked,
                                collectedAmount: e.target.checked
                                  ? p.collectedAmount
                                  : 0,
                              })
                            }
                            className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                          />
                          Parziale
                        </label>
                        {p.partial && !p.collected && (
                          <input
                            type="number"
                            value={p.collectedAmount ?? ""}
                            placeholder="Importo incassato"
                            onChange={(e) =>
                              updatePaymentDirect(p.id, {
                                collectedAmount: parseFloat(
                                  e.target.value || "0"
                                ),
                              })
                            }
                            className="border rounded p-2 text-sm w-full"
                          />
                        )}
                        {!p.collected && !p.partial && (
                          <div className="text-gray-500 italic">
                            ❌ Non incassato
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {payments.length > 0 && renderSummary()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
