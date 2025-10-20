import { Button } from "@/components/ui/Button";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { customerAPI } from "../../api/customers";
import { jobOrderAPI } from "../../api/jobOrders";
import { jobAPI } from "../../api/jobs";
import type { Customer, JobOrder, Job } from "../../types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "react-hot-toast";
import { Edit, Trash2 } from "lucide-react";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lastCreatedOrderId, setLastCreatedOrderId] = useState<string | null>(
    null
  );

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<JobOrder[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<JobOrder>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const [searchCode, setSearchCode] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const [openConfirm, setOpenConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function loadData(customerId: string) {
      const c = await customerAPI.getById(customerId);
      setCustomer(c ?? null);

      const o = await jobOrderAPI.listByCustomer(customerId);
      setOrders(o);

      const j = await jobAPI.list();
      setJobs(j);
    }
    loadData(id);
  }, [id]);

  if (!customer) {
    return <div className="p-6 text-red-600">Cliente non trovato ❌</div>;
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "address" || name === "mapsUrl") {
      setFormData({
        ...formData,
        location: { ...(formData.location ?? {}), [name]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSave = async () => {
    if (
      !formData.code ||
      (!formData.location?.address && !formData.location?.mapsUrl)
    ) {
      toast.error(
        "La commessa deve avere un indirizzo o un link Google Maps ❌"
      );
      return;
    }

    try {
      if (editingId) {
        const updated = await jobOrderAPI.update(editingId, {
          code: formData.code,
          customerId: customer.id,
          location: {
            address: formData.location?.address ?? "",
            mapsUrl: formData.location?.mapsUrl ?? "",
          },
          notes: formData.notes,
        });
        setOrders(orders.map((o) => (o.id === editingId ? updated : o)));
        toast.success("Commessa aggiornata con successo ✅");
      } else {
        const created = await jobOrderAPI.create({
          code: formData.code!,
          customerId: customer.id,
          location: {
            address: formData.location?.address ?? "",
            mapsUrl: formData.location?.mapsUrl ?? "",
          },
          notes: formData.notes,
        });

        setOrders([created, ...orders]);
        setLastCreatedOrderId(created.id);
        setTimeout(() => setLastCreatedOrderId(null), 10000);

        toast.success("Commessa creata con successo ✅");
      }

      setFormData({});
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error("❌ Errore salvataggio commessa:", err);
      toast.error("Errore durante il salvataggio della commessa ❌");
    }
  };

  const handleEdit = (order: JobOrder) => {
    setFormData(order);
    setEditingId(order.id);
    setShowForm(true);
  };

  const handleDelete = (orderId: string) => {
    const hasJobs = jobs.some((j: Job) => j.jobOrderId === orderId);
    if (hasJobs) {
      toast.error(
        "Non puoi eliminare questa commessa perché ha interventi collegati ❌"
      );
      return;
    }
    setOrderToDelete(orderId);
    setOpenConfirm(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      await jobOrderAPI.remove(orderToDelete);
      setOrders(orders.filter((o) => o.id !== orderToDelete));
      toast.success("Commessa eliminata con successo ✅");
    } catch (err) {
      console.error("❌ Errore eliminazione commessa:", err);
      toast.error("Errore durante l'eliminazione della commessa ❌");
    } finally {
      setOrderToDelete(null);
    }
  };

  const filteredOrders = orders
    .filter((o) => o.code.toLowerCase().includes(searchCode.toLowerCase()))
    .filter((o) =>
      (o.location.address ?? "")
        .toLowerCase()
        .includes(searchAddress.toLowerCase())
    )
    .sort((a, b) =>
      sortAsc ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code)
    );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Intestazione cliente */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2">{customer.name}</h1>
        <p>
          <strong>📞 Telefono:</strong> {customer.phone ?? "-"}
        </p>
        <p>
          <strong>✉️ Email:</strong> {customer.email ?? "-"}
        </p>
        {customer.notes && (
          <p className="mt-2 text-gray-600">
            <strong>📝 Note:</strong> {customer.notes}
          </p>
        )}
      </div>

      {/* Lista commesse */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-center mb-4">
          <h2 className="text-xl font-bold">📂 Commesse</h2>
          <Button
            onClick={() => {
              setFormData({});
              setEditingId(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ➕ Nuova Commessa
          </Button>
        </div>

        {/* Filtri */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          <input
            type="text"
            placeholder="🔍 Cerca per numero"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="p-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="🔍 Cerca per indirizzo"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            className="p-2 border rounded-lg"
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
                  lastCreatedOrderId === o.id
                    ? "bg-green-100 animate-pulse"
                    : ""
                }`}
                onClick={() => navigate(`/backoffice/orders/${o.id}`)}
              >
                <div className="font-bold text-lg">{o.code}</div>
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
      </div>

      {/* Modal nuova/modifica commessa */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 z-50">
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
        title="Elimina commessa"
        description="Sei sicuro di voler eliminare questa commessa? L'azione non può essere annullata."
        confirmText="Elimina"
        cancelText="Annulla"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
