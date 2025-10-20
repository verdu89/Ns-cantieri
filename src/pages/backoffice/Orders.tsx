import { Button } from "@/components/ui/Button";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobOrderAPI } from "../../api/jobOrders";
import { customerAPI } from "../../api/customers";
import { jobAPI } from "../../api/jobs";
import type { JobOrder, Customer, Job } from "../../types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "react-hot-toast";
import { Edit, Trash2 } from "lucide-react";

export default function Orders() {
  const navigate = useNavigate();

  // Data
  const [orders, setOrders] = useState<JobOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  // Evidenziazione nuova commessa
  const [lastCreatedOrderId, setLastCreatedOrderId] = useState<string | null>(
    null
  );

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<JobOrder>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  // Autocomplete cliente nel form
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");

  // Filtri lista
  const [searchCode, setSearchCode] = useState("");
  const [searchCustomer, setSearchCustomer] = useState(""); // filtro select
  const [searchAddress, setSearchAddress] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  // Conferma eliminazione
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Load iniziale
  useEffect(() => {
    (async () => {
      try {
        const [o, c, j] = await Promise.all([
          jobOrderAPI.list(),
          customerAPI.list(),
          jobAPI.list(),
        ]);
        setOrders(o);
        setCustomers(c);
        setJobs(j);
      } catch (err) {
        console.error("Errore caricamento dati:", err);
        toast.error("Errore nel caricamento dati ❌");
      }
    })();
  }, []);

  // Helpers
  const getCustomerName = (id: string) =>
    customers.find((c) => c.id === id)?.name ?? "N/D";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "address" || name === "mapsUrl") {
      setFormData((prev) => ({
        ...prev,
        location: { ...(prev.location ?? {}), [name]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (
      !formData.code ||
      !selectedCustomer ||
      (!formData.location?.address && !formData.location?.mapsUrl)
    ) {
      toast.error("Numero, cliente e indirizzo/Maps sono obbligatori ❌");
      return;
    }

    try {
      if (editingId) {
        const updated = await jobOrderAPI.update(editingId, {
          code: formData.code,
          customerId: selectedCustomer,
          location: {
            address: formData.location?.address ?? "",
            mapsUrl: formData.location?.mapsUrl ?? "",
          },
          notes: formData.notes,
          notesBackoffice: formData.notesBackoffice,
        });
        setOrders((prev) =>
          prev.map((o) => (o.id === editingId ? updated : o))
        );
        toast.success("Commessa aggiornata ✅");
      } else {
        const created = await jobOrderAPI.create({
          code: formData.code!,
          customerId: selectedCustomer,
          location: {
            address: formData.location?.address ?? "",
            mapsUrl: formData.location?.mapsUrl ?? "",
          },
          notes: formData.notes,
          notesBackoffice: formData.notesBackoffice,
          payments: [], // se il tipo lo prevede, altrimenti rimuovi
        } as Omit<JobOrder, "id" | "createdAt">);

        // in cima + evidenziazione verde per 10s
        setOrders((prev) => [created, ...prev]);
        setLastCreatedOrderId(created.id);
        setTimeout(() => setLastCreatedOrderId(null), 10000);

        toast.success("Commessa creata ✅");
      }

      // reset form
      setFormData({});
      setSelectedCustomer("");
      setCustomerSearch("");
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error("Errore salvataggio commessa:", err);
      toast.error("Errore durante il salvataggio ❌");
    }
  };

  const handleEdit = (order: JobOrder) => {
    setFormData(order);
    setSelectedCustomer(order.customerId);
    setCustomerSearch(getCustomerName(order.customerId));
    setEditingId(order.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const hasJobs = jobs.some((j) => j.jobOrderId === id);
    if (hasJobs) {
      toast.error("Non puoi eliminare la commessa: ha interventi collegati ❌");
      return;
    }
    setSelectedOrderId(id);
    setOpenConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedOrderId) return;
    try {
      await jobOrderAPI.remove(selectedOrderId);
      setOrders((prev) => prev.filter((o) => o.id !== selectedOrderId));
      toast.success("Commessa eliminata ✅");
    } catch (err) {
      console.error("Errore eliminazione commessa:", err);
      toast.error("Errore durante l'eliminazione ❌");
    } finally {
      setSelectedOrderId(null);
    }
  };

  // Lista filtrata + sort (manteniamo in cima l'ultima creata)
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => o.code.toLowerCase().includes(searchCode.toLowerCase()))
      .filter((o) => (searchCustomer ? o.customerId === searchCustomer : true))
      .filter((o) =>
        (o.location.address ?? "")
          .toLowerCase()
          .includes(searchAddress.toLowerCase())
      )
      .sort((a, b) => {
        if (lastCreatedOrderId === a.id) return -1;
        if (lastCreatedOrderId === b.id) return 1;
        return sortAsc
          ? a.code.localeCompare(b.code)
          : b.code.localeCompare(a.code);
      });
  }, [
    orders,
    searchCode,
    searchCustomer,
    searchAddress,
    sortAsc,
    lastCreatedOrderId,
  ]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl font-bold">Commesse</h1>
        <Button
          onClick={() => {
            setFormData({});
            setSelectedCustomer("");
            setCustomerSearch("");
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          ➕ Nuova Commessa
        </Button>
      </div>

      {/* Filtri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="🔍 Cerca per numero"
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
          className="p-2 border rounded-lg w-full"
        />
        <select
          value={searchCustomer}
          onChange={(e) => setSearchCustomer(e.target.value)}
          className="p-2 border rounded-lg w-full"
        >
          <option value="">Tutti i clienti</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="🔍 Cerca per indirizzo"
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
          className="p-2 border rounded-lg w-full"
        />
      </div>

      {/* Desktop: tabella */}
      <div className="hidden md:block">
        {filteredOrders.length === 0 ? (
          <p className="text-gray-500">Nessuna commessa trovata</p>
        ) : (
          <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden text-sm">
            <thead className="bg-gray-100 text-left text-gray-600 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th
                  className="p-3 cursor-pointer select-none"
                  onClick={() => setSortAsc(!sortAsc)}
                >
                  Numero {sortAsc ? "▲" : "▼"}
                </th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Indirizzo / Maps</th>
                <th className="p-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr
                  key={o.id}
                  className={`border-t hover:bg-gray-50 transition-colors cursor-pointer ${
                    lastCreatedOrderId === o.id
                      ? "bg-green-100 animate-pulse"
                      : ""
                  }`}
                  onClick={() => navigate(`/backoffice/orders/${o.id}`)}
                >
                  <td className="p-3">{o.code}</td>
                  <td className="p-3">{getCustomerName(o.customerId)}</td>
                  <td className="p-3">
                    {o.location.address ? (
                      o.location.address
                    ) : o.location.mapsUrl ? (
                      <a
                        href={o.location.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 underline"
                      >
                        Apri in Maps
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3 flex gap-2 justify-end">
                    <button
                      title="Modifica"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(o);
                      }}
                      className="p-2 rounded-lg hover:bg-yellow-100 text-yellow-600"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      title="Elimina"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(o.id);
                      }}
                      className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <p className="text-gray-500">Nessuna commessa trovata</p>
        ) : (
          filteredOrders.map((o) => (
            <div
              key={o.id}
              className={`border rounded-lg shadow-sm p-4 bg-white hover:bg-gray-50 transition cursor-pointer ${
                lastCreatedOrderId === o.id ? "bg-green-100 animate-pulse" : ""
              }`}
              onClick={() => navigate(`/backoffice/orders/${o.id}`)}
            >
              <div className="font-bold text-lg">{o.code}</div>
              <div className="text-sm text-gray-600 mt-1">
                👤 {getCustomerName(o.customerId)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                📍{" "}
                {o.location.address ? (
                  o.location.address
                ) : o.location.mapsUrl ? (
                  <a
                    href={o.location.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 underline"
                  >
                    Apri in Maps
                  </a>
                ) : (
                  "-"
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(o);
                  }}
                  className="p-2 rounded-lg hover:bg-red-100 text-yellow-600"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(o.id);
                  }}
                  className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal nuova/modifica */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-bold mb-4">
              {editingId ? "✏️ Modifica Commessa" : "➕ Nuova Commessa"}
            </h2>

            <input
              type="text"
              name="code"
              placeholder="Numero commessa (es. 25-003) *"
              value={formData.code ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg mb-2"
            />

            {/* Cliente (autocomplete semplice, solo nome) */}
            <div className="mb-2 relative">
              <input
                type="text"
                placeholder="Cerca cliente *"
                value={
                  selectedCustomer
                    ? customers.find((c) => c.id === selectedCustomer)?.name ??
                      ""
                    : customerSearch
                }
                onChange={(e) => {
                  setSelectedCustomer("");
                  setCustomerSearch(e.target.value);
                }}
                className="w-full p-2 border rounded-lg"
              />
              {customerSearch && !selectedCustomer && (
                <ul className="absolute z-10 bg-white border rounded-lg w-full shadow max-h-48 overflow-y-auto">
                  {customers
                    .filter((c) =>
                      c.name
                        .toLowerCase()
                        .includes(customerSearch.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((c) => (
                      <li
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c.id);
                          setCustomerSearch(c.name);
                        }}
                        className="px-2 py-2 cursor-pointer hover:bg-blue-50"
                      >
                        <div className="font-medium">{c.name}</div>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <input
              type="text"
              name="address"
              placeholder="Indirizzo lavoro"
              value={formData.location?.address ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg mb-2"
            />

            <input
              type="url"
              name="mapsUrl"
              placeholder="Link Google Maps"
              value={formData.location?.mapsUrl ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg mb-2"
            />

            <textarea
              name="notes"
              placeholder="Note commessa"
              value={formData.notes ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg mb-2"
            />

            <div className="flex justify-end gap-2 mt-3">
              <Button
                onClick={() => {
                  setShowForm(false);
                  setFormData({});
                  setSelectedCustomer("");
                  setCustomerSearch("");
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
        title="Elimina commessa"
        description="Sei sicuro di voler eliminare questa commessa? L'azione non può essere annullata."
        confirmText="Elimina"
        cancelText="Annulla"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
