import { useState, useEffect } from "react";
import { Edit, Trash2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import type { Worker } from "../../types";

interface WorkerRow extends Worker {
  user_id: string;
  email?: string; // da Auth
}

export default function MontatoriPage() {
  const [montatori, setMontatori] = useState<WorkerRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkerRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-workers`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const json = await res.json();
      if (!res.ok) {
        console.error("Errore list-workers:", json);
        setMontatori([]);
        return;
      }

      setMontatori(json.workers || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm({ name: "", email: "", phone: "" });
    setEditing(null);
  }

  function openEditModal(m: WorkerRow) {
    setEditing(m);
    setForm({
      name: m.name,
      email: m.email ?? "",
      phone: m.phone ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!editing) return;
    if (!form.name.trim() || !form.email.trim()) return;

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            workerId: editing.user_id,
            name: form.name,
            email: form.email,
            phone: form.phone,
          }),
        }
      );

      const out = await res.json();
      if (!res.ok) {
        console.error("Errore update-user:", out);
        alert(`Errore aggiornamento: ${out.error || "sconosciuto"}`);
        return;
      }

      await load();
      setModalOpen(false);
      resetForm();
    } catch (e) {
      console.error("Errore salvataggio montatore", e);
    }
  }

  async function handleDelete(m: WorkerRow) {
    if (!window.confirm("Eliminare definitivamente questo montatore (utente + record)?")) return;

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ workerId: m.user_id }),
        }
      );
      const out = await res.json();
      if (!res.ok) {
        console.error("Errore delete-user:", out);
        alert(`Errore eliminazione: ${out.error || "sconosciuto"}`);
        return;
      }

      setMontatori((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e) {
      console.error("Errore eliminazione montatore", e);
    }
  }

  return (
    <main className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Gestione Montatori</h1>
      </div>

      {/* Desktop: tabella */}
      <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Nome</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Telefono</th>
              <th className="p-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-4 text-center">Caricamento…</td>
              </tr>
            ) : montatori.length > 0 ? (
              montatori.map((m) => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{m.name}</td>
                  <td className="p-3">{m.email}</td>
                  <td className="p-3">{m.phone}</td>
                  <td className="p-3 text-right flex gap-2 justify-end">
                    <button
                      onClick={() => openEditModal(m)}
                      className="p-2 rounded hover:bg-blue-100 text-blue-600"
                      title="Modifica"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
                      className="p-2 rounded hover:bg-red-100 text-red-600"
                      title="Elimina"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  Nessun montatore presente
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center text-gray-500">Caricamento…</div>
        ) : montatori.length > 0 ? (
          montatori.map((m) => (
            <div
              key={m.id}
              className="bg-white border rounded-lg shadow-sm p-4"
            >
              <div className="font-bold text-lg">{m.name}</div>
              <div className="text-sm text-gray-600">{m.email}</div>
              <div className="text-sm text-gray-600">📞 {m.phone ?? "-"}</div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => openEditModal(m)}
                  className="flex-1 px-3 py-2 rounded bg-blue-600 text-white text-sm"
                >
                  ✏️ Modifica
                </button>
                <button
                  onClick={() => handleDelete(m)}
                  className="flex-1 px-3 py-2 rounded bg-red-600 text-white text-sm"
                >
                  🗑️ Elimina
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500">
            Nessun montatore presente
          </div>
        )}
      </div>

      {/* Modal modifica */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Modifica Montatore</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium">Nome</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Email (Auth)</label>
                <input
                  type="email"
                  className="w-full border rounded px-3 py-2"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Telefono</label>
                <input
                  type="tel"
                  className="w-full border rounded px-3 py-2"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
