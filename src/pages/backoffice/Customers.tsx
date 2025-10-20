import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { customerAPI } from "../../api/customers";
import type { Customer } from "../../types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "react-hot-toast";
import { Edit, Trash2 } from "lucide-react"; // <== importa icone

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const navigate = useNavigate(); // <== inizializza navigate

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  // ricerca + ordinamento
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  // conferma eliminazione
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      toast.error("Il nome cliente è obbligatorio ❌");
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

        // Inserisci in cima alla lista
        setCustomers([created, ...customers]);
        setLastCreatedId(created.id);

        // Rimuovi evidenziazione dopo 10s
        setTimeout(() => {
          setLastCreatedId(null);
        }, 10000);
      }

      setFormData({});
      setEditingId(null);
      setShowForm(false);
      toast.success("Cliente salvato con successo ✅");
    } catch (err) {
      console.error("❌ Errore salvataggio cliente:", err);
      toast.error("Errore durante il salvataggio del cliente ❌");
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
      toast.success("Cliente eliminato con successo ✅");
    } catch (err) {
      console.error("❌ Errore eliminazione cliente:", err);
      toast.error("Errore durante l'eliminazione del cliente ❌");
    } finally {
      setSelectedId(null);
    }
  };

  const filteredCustomers = customers
    .filter((c) =>
      [c.name, c.phone, c.email, c.notes]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (lastCreatedId === a.id) return -1; // nuovo in cima
      if (lastCreatedId === b.id) return 1;
      return sortAsc
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    });

  // ✅ BLOCCO AVATAR INSERITO QUI
  const getColorFromName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const AvatarCircle = ({ name }: { name: string }) => (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
      style={{ backgroundColor: getColorFromName(name) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
  // ✅ FINE BLOCCO AVATAR

  if (loading) {
    return <div className="p-6 text-gray-600">⏳ Caricamento clienti...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-center mb-4">
        <h1 className="text-xl font-bold">Clienti</h1>
        <Button
          onClick={() => {
            setFormData({});
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          ➕ Nuovo Cliente
        </Button>
      </div>

      {/* Ricerca */}
      <input
        type="text"
        placeholder="🔍 Cerca cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full p-2 border rounded-lg"
      />

      {/* Desktop: tabella */}
      <div className="hidden md:block">
        <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden text-sm">
          <thead className="bg-gray-100 text-left text-gray-600 uppercase text-xs font-semibold tracking-wider">
            <tr>
              <th
                className="p-3 cursor-pointer select-none"
                onClick={() => setSortAsc(!sortAsc)}
              >
                Cliente {sortAsc ? "▲" : "▼"}
              </th>
              <th className="p-3">Contatti</th>
              <th className="p-3">Note</th>
              <th className="p-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c) => (
              <tr
                key={c.id}
                className={`border-t hover:bg-gray-50 transition-colors cursor-pointer ${
                  lastCreatedId === c.id ? "bg-green-100 animate-pulse" : ""
                }`}
                onClick={() => navigate(`/backoffice/customers/${c.id}`)}
              >
                <td className="p-3 flex items-center gap-3">
                  <AvatarCircle name={c.name} />
                  <span className="font-medium">{c.name}</span>
                </td>
                <td className="p-3 text-gray-700">
                  <div>📞 {c.phone ?? "-"}</div>
                  <div>✉️ {c.email ?? "-"}</div>
                </td>
                <td className="p-3 text-gray-600">{c.notes ?? "-"}</td>
                <td className="p-3 flex gap-2 justify-end">
                  <button
                    title="Modifica"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(c);
                    }}
                    className="p-2 rounded-lg hover:bg-yellow-100 text-yellow-600"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    title="Elimina"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(c.id);
                    }}
                    className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}

            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-500">
                  Nessun cliente trovato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {filteredCustomers.map((c) => (
          <div
            key={c.id}
            className={`bg-white border rounded-xl p-3 flex items-center justify-between shadow-sm active:bg-gray-100 transition ${
              lastCreatedId === c.id ? "bg-green-100 animate-pulse" : ""
            }`}
            onClick={() => navigate(`/backoffice/customers/${c.id}`)}
          >
            {/* Avatar + Info */}
            <div className="flex items-center gap-3">
              <AvatarCircle name={c.name} />
              <div className="flex flex-col">
                <span className="font-semibold">{c.name}</span>
                <span className="text-xs text-gray-600">{c.phone ?? "-"}</span>
                <span className="text-xs text-gray-600">{c.email ?? "-"}</span>
              </div>
            </div>

            {/* Azioni */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(c);
                }}
                className="p-1 rounded-md hover:bg-yellow-100 text-yellow-600"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(c.id);
                }}
                className="p-1 rounded-md hover:bg-red-100 text-red-600"
              >
                <Trash2 size={16} />
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-bold mb-4">
              {editingId ? "✏️ Modifica Cliente" : "➕ Nuovo Cliente"}
            </h2>

            <input
              type="text"
              name="name"
              placeholder="Nome / Ragione sociale *"
              value={formData.name ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg mb-2"
            />
            <input
              type="text"
              name="phone"
              placeholder="Telefono"
              value={formData.phone ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg mb-2"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg mb-2"
            />
            <textarea
              name="notes"
              placeholder="Note interne"
              value={formData.notes ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg mb-2"
            />

            <div className="flex justify-end gap-2 mt-3">
              <Button
                onClick={() => {
                  setShowForm(false);
                  setFormData({});
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salva
              </Button>
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
