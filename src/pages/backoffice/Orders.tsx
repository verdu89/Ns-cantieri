import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jobOrderAPI } from "../../api/jobOrders";
import { customerAPI } from "../../api/customers";
import { jobAPI } from "../../api/jobs";
import type { JobOrder, Customer, Job } from "../../types";
import { useToast } from "../../context/ToastContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function Orders() {
  const [orders, setOrders] = useState<JobOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<JobOrder>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");

  const [searchCode, setSearchCode] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  // stato per confirm dialog
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    jobOrderAPI.list().then(setOrders);
    customerAPI.list().then(setCustomers);
    jobAPI.list().then(setJobs);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "address" || name === "mapsUrl") {
      setFormData({
        ...formData,
        location: { ...formData.location, [name]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSave = () => {
    if (
      !formData.code ||
      !selectedCustomer ||
      (!formData.location?.address && !formData.location?.mapsUrl)
    ) {
      showToast(
        "error",
        "Numero commessa, cliente e almeno un indirizzo o link Maps sono obbligatori ❌"
      );
      return;
    }

    if (editingId) {
      setOrders(
        orders.map((o) =>
          o.id === editingId
            ? {
                ...o,
                ...formData,
                customerId: selectedCustomer,
                id: editingId,
                location: {
                  address: formData.location?.address,
                  mapsUrl: formData.location?.mapsUrl,
                },
              }
            : o
        )
      );
      showToast("success", "Commessa aggiornata ✅");
    } else {
      const newOrder: JobOrder = {
        id: `o${Date.now()}`,
        code: formData.code!,
        customerId: selectedCustomer,
        location: {
          address: formData.location?.address,
          mapsUrl: formData.location?.mapsUrl,
        },
        notes: formData.notes ?? "",
        payments: [],
        createdAt: new Date().toISOString(),
      };
      setOrders([...orders, newOrder]);
      showToast("success", "Commessa creata ✅");
    }

    setFormData({});
    setSelectedCustomer("");
    setCustomerSearch("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (order: JobOrder) => {
    setFormData(order);
    setSelectedCustomer(order.customerId);
    setCustomerSearch(
      customers.find((c) => c.id === order.customerId)?.name ?? ""
    );
    setEditingId(order.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const hasJobs = jobs.some((j: Job) => j.jobOrderId === id);
    if (hasJobs) {
      showToast(
        "error",
        "Non puoi eliminare questa commessa perché ha interventi collegati ❌"
      );
      return;
    }
    setSelectedOrderId(id);
    setOpenConfirm(true);
  };

  const confirmDelete = () => {
    if (!selectedOrderId) return;
    setOrders(orders.filter((o) => o.id !== selectedOrderId));
    showToast("success", "Commessa eliminata ✅");
    setSelectedOrderId(null);
  };

  const getCustomerName = (id: string) =>
    customers.find((c: Customer) => c.id === id)?.name ?? "N/D";

  const filteredOrders = orders
    .filter((o) => o.code.toLowerCase().includes(searchCode.toLowerCase()))
    .filter((o) => (searchCustomer ? o.customerId === searchCustomer : true))
    .filter((o) =>
      (o.location.address ?? "")
        .toLowerCase()
        .includes(searchAddress.toLowerCase())
    )
    .sort((a, b) =>
      sortAsc ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code)
    );

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h1 className="text-lg sm:text-xl font-bold">Commesse</h1>
        <button
          onClick={() => {
            setFormData({});
            setSelectedCustomer("");
            setCustomerSearch("");
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          + Nuova Commessa
        </button>
      </div>

      {/* Filtri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <input
          type="text"
          placeholder="Cerca per numero"
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
          className="p-2 border rounded w-full"
        />
        <select
          value={searchCustomer}
          onChange={(e) => setSearchCustomer(e.target.value)}
          className="p-2 border rounded w-full"
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
          placeholder="Cerca per indirizzo"
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
          className="p-2 border rounded w-full"
        />
      </div>

      {/* Tabella desktop */}
      <div className="hidden md:block">
        <table className="w-full border-collapse bg-white shadow rounded-lg">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th
                className="p-2 cursor-pointer select-none"
                onClick={() => setSortAsc(!sortAsc)}
              >
                Numero {sortAsc ? "▲" : "▼"}
              </th>
              <th className="p-2">Cliente</th>
              <th className="p-2">Indirizzo / Maps</th>
              <th className="p-2">Note</th>
              <th className="p-2">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-2">{o.code}</td>
                <td className="p-2">{getCustomerName(o.customerId)}</td>
                <td className="p-2">
                  {o.location.address ? (
                    o.location.address
                  ) : o.location.mapsUrl ? (
                    <a
                      href={o.location.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Apri in Maps
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-2">{o.notes ?? "-"}</td>
                <td className="p-2 space-x-2">
                  <Link
                    to={`/backoffice/orders/${o.id}`}
                    className="px-2 py-1 bg-blue-600 text-white rounded"
                  >
                    Apri
                  </Link>
                  <button
                    onClick={() => handleEdit(o)}
                    className="px-2 py-1 bg-yellow-500 text-white rounded"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(o.id)}
                    className="px-2 py-1 bg-red-600 text-white rounded"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}

            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center p-4 text-gray-500">
                  Nessuna commessa trovata
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Card mobile */}
      <div className="space-y-4 md:hidden">
        {filteredOrders.map((o) => (
          <div
            key={o.id}
            className="bg-white shadow rounded-lg p-4 border border-gray-200"
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold">{o.code}</h2>
              <div className="space-x-2">
                <Link
                  to={`/backoffice/orders/${o.id}`}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Apri
                </Link>
                <button
                  onClick={() => handleEdit(o)}
                  className="px-2 py-1 bg-yellow-500 text-white rounded text-sm"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(o.id)}
                  className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-700">
              <p>
                <span className="font-semibold">Cliente:</span>{" "}
                {getCustomerName(o.customerId)}
              </p>
              <p>
                <span className="font-semibold">Indirizzo:</span>{" "}
                {o.location.address ? (
                  o.location.address
                ) : o.location.mapsUrl ? (
                  <a
                    href={o.location.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Apri in Maps
                  </a>
                ) : (
                  "-"
                )}
              </p>
              <p>
                <span className="font-semibold">Note:</span> {o.notes ?? "-"}
              </p>
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <p className="text-center text-gray-500">Nessuna commessa trovata</p>
        )}
      </div>

      {/* Modal nuova/modifica */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-bold mb-4">
              {editingId ? "Modifica Commessa" : "Nuova Commessa"}
            </h2>

            <input
              type="text"
              name="code"
              placeholder="Numero commessa (es. 25-003) *"
              value={formData.code ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded mb-2"
            />

            {/* Cliente (autocomplete) */}
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
                className="w-full p-2 border rounded"
              />
              {customerSearch && !selectedCustomer && (
                <ul className="absolute z-10 bg-white border rounded w-full shadow max-h-40 overflow-y-auto">
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
                        className="px-2 py-1 cursor-pointer hover:bg-blue-100"
                      >
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-sm text-gray-500">
                          {c.address ?? "Indirizzo non disponibile"}
                        </div>
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
              className="w-full p-2 border rounded mb-2"
            />

            <input
              type="url"
              name="mapsUrl"
              placeholder="Link Google Maps"
              value={formData.location?.mapsUrl ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded mb-2"
            />

            <textarea
              name="notes"
              placeholder="Note commessa"
              value={formData.notes ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded mb-2"
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowForm(false)}
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
        title="Elimina commessa"
        description="Sei sicuro di voler eliminare questa commessa? L'azione non può essere annullata."
        confirmText="Elimina"
        cancelText="Annulla"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
