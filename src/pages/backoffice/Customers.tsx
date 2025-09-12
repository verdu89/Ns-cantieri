import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { customerAPI } from "../../api/customers";
import type { Customer } from "../../types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "../../context/ToastContext";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  // ricerca + ordinamento
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  // conferma eliminazione
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { showToast } = useToast();

  // 🔹 caricamento dati dal backend
  useEffect(() => {
    customerAPI.list().then((data) => {
      setCustomers(data);
      setLoading(false);
    });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.name) {
      showToast("error", "Il nome cliente è obbligatorio ❌");
      return;
    }

    try {
      if (editingId) {
        const updated = await customerAPI.update(editingId, formData);
        setCustomers(customers.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const created = await customerAPI.create(
          formData as Omit<Customer, "id">
        );
        setCustomers([...customers, created]);
      }

      setFormData({});
      setEditingId(null);
      setShowForm(false);
      showToast("success", "Cliente salvato con successo ✅");
    } catch (err) {
      console.error("❌ Errore salvataggio cliente:", err);
      showToast("error", "Errore durante il salvataggio del cliente ❌");
    }
  };

  const handleEdit = (customer: Customer) => {
    setFormData(customer);
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setSelectedId(id);
    setOpenConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedId) return;
    try {
      await customerAPI.remove(selectedId);
      setCustomers(customers.filter((c) => c.id !== selectedId));
      showToast("success", "Cliente eliminato con successo ✅");
    } catch (err) {
      console.error("❌ Errore eliminazione cliente:", err);
      showToast("error", "Errore durante l'eliminazione del cliente ❌");
    } finally {
      setSelectedId(null);
    }
  };

  const filteredCustomers = customers
    .filter((c) =>
      [c.name, c.phone, c.email, c.notes]
        .filter(Boolean)
        .some((field) =>
          field!.toLowerCase().includes(search.toLowerCase())
        )
    )
    .sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );

  if (loading) {
    return <div className="p-6">Caricamento clienti...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-center mb-4">
        <h1 className="text-xl font-bold">Clienti</h1>
        <button
          onClick={() => {
            setFormData({});
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          + Nuovo Cliente
        </button>
      </div>

      {/* Ricerca */}
      <input
        type="text"
        placeholder="Cerca cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full p-2 border rounded"
      />

      {/* Desktop: tabella */}
      <div className="hidden md:block">
        <table className="w-full border-collapse bg-white shadow rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th
                className="p-2 cursor-pointer select-none"
                onClick={() => setSortAsc(!sortAsc)}
              >
                Nome {sortAsc ? "▲" : "▼"}
              </th>
              <th className="p-2">Telefono</th>
              <th className="p-2">Email</th>
              <th className="p-2">Note</th>
              <th className="p-2">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.phone ?? "-"}</td>
                <td className="p-2">{c.email ?? "-"}</td>
                <td className="p-2">{c.notes ?? "-"}</td>
                <td className="p-2 space-x-2">
                  <Link
                    to={`/backoffice/customers/${c.id}`}
                    className="px-2 py-1 bg-blue-600 text-white rounded"
                  >
                    Apri
                  </Link>
                  <button
                    onClick={() => handleEdit(c)}
                    className="px-2 py-1 bg-yellow-500 text-white rounded"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="px-2 py-1 bg-red-600 text-white rounded"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}

            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center p-4 text-gray-500">
                  Nessun cliente trovato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {filteredCustomers.map((c) => (
          <div
            key={c.id}
            className="border rounded-lg shadow-sm p-3 bg-white"
          >
            <div className="font-bold text-lg">{c.name}</div>
            <div className="text-sm text-gray-600">
              📞 {c.phone ?? "-"} | ✉️ {c.email ?? "-"}
            </div>
            {c.notes && (
              <div className="text-sm mt-1 text-gray-700">
                📝 {c.notes}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <Link
                to={`/backoffice/customers/${c.id}`}
                className="flex-1 text-center px-2 py-1 bg-blue-600 text-white rounded"
              >
                Apri
              </Link>
              <button
                onClick={() => handleEdit(c)}
                className="flex-1 text-center px-2 py-1 bg-yellow-500 text-white rounded"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="flex-1 text-center px-2 py-1 bg-red-600 text-white rounded"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="text-center p-4 text-gray-500">
            Nessun cliente trovato
          </div>
        )}
      </div>

      {/* Modal nuovo/modifica cliente */}
      {showForm && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-bold mb-4">
              {editingId ? "Modifica Cliente" : "Nuovo Cliente"}
            </h2>

            <input
              type="text"
              name="name"
              placeholder="Nome / Ragione sociale *"
              value={formData.name ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded mb-2"
            />
            <input
              type="text"
              name="phone"
              placeholder="Telefono"
              value={formData.phone ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded mb-2"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded mb-2"
            />
            <textarea
              name="notes"
              placeholder="Note interne"
              value={formData.notes ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded mb-2"
            />

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormData({});
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conferma eliminazione */}
      <ConfirmDialog
        open={openConfirm}
        setOpen={setOpenConfirm}
        title="Elimina cliente"
        description="Sei sicuro di voler eliminare questo cliente? L'azione non può essere annullata."
        confirmText="Elimina"
        cancelText="Annulla"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
