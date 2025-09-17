import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { jobOrderAPI } from "@/api/jobOrders";
import { customerAPI } from "@/api/customers";
import { jobAPI } from "@/api/jobs";
import type { JobOrder, Customer, Job, Payment } from "@/types";

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT");
}

export default function EconomicDashboard() {
  const [orders, setOrders] = useState<
    (JobOrder & {
      customer?: Customer | null;
      jobs: Job[];
      payments: Payment[];
    })[]
  >([]);
  const [period, setPeriod] = useState<"all" | "day" | "week" | "month">("all");
  const [filterYear, setFilterYear] = useState<number | "all">("all");
  const [filterCommessa, setFilterCommessa] = useState("");
  const [filterCliente, setFilterCliente] = useState("");

  useEffect(() => {
    async function load() {
      const allOrders = await jobOrderAPI.list();
      if (!allOrders) return;

      const results: (JobOrder & {
        customer?: Customer | null;
        jobs: Job[];
        payments: Payment[];
      })[] = [];

      for (const o of allOrders) {
        const customer = await customerAPI.getById(o.customerId);
        const jobs = await jobAPI.listByOrder(o.id);
        const payments: Payment[] = jobs.flatMap((j) =>
          (j.payments ?? []).map((p) => ({ ...p, jobId: j.id }))
        );

        results.push({ ...o, customer, jobs, payments });
      }

      setOrders(results);
    }
    load();
  }, []);

  // 🔹 Estrai anni disponibili
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    orders.forEach((o) => {
      if (o.createdAt) {
        years.add(new Date(o.createdAt).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  // 🔹 Filtraggio
  const filteredOrders = useMemo(() => {
    const now = new Date();

    return orders.filter((o) => {
      const matchCommessa =
        !filterCommessa ||
        o.code.toLowerCase().includes(filterCommessa.toLowerCase());
      const matchCliente =
        !filterCliente ||
        (o.customer?.name ?? "")
          .toLowerCase()
          .includes(filterCliente.toLowerCase());

      let matchPeriodo = true;
      if (period !== "all" && o.createdAt) {
        const created = new Date(o.createdAt);
        if (period === "day") {
          matchPeriodo = created.toDateString() === now.toDateString();
        } else if (period === "week") {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 7);
          matchPeriodo = created >= startOfWeek && created < endOfWeek;
        } else if (period === "month") {
          matchPeriodo =
            created.getMonth() === now.getMonth() &&
            created.getFullYear() === now.getFullYear();
        }
      }

      let matchYear = true;
      if (filterYear !== "all" && o.createdAt) {
        const created = new Date(o.createdAt);
        matchYear = created.getFullYear() === filterYear;
      }

      return matchCommessa && matchCliente && matchPeriodo && matchYear;
    });
  }, [orders, filterCommessa, filterCliente, period, filterYear]);

  // 🔹 Totali
  const totals = useMemo(() => {
    const expected = filteredOrders.reduce(
      (s, o) => s + o.payments.reduce((ss, p) => ss + (p.amount ?? 0), 0),
      0
    );
    const collected = filteredOrders.reduce(
      (s, o) =>
        s +
        o.payments.reduce((ss, p) => {
          if (p.collected) return ss + (p.amount ?? 0);
          if ((p as any).partial) return ss + ((p as any).collectedAmount ?? 0);
          return ss;
        }, 0),
      0
    );
    return {
      expected,
      collected,
      pending: expected - collected,
    };
  }, [filteredOrders]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">💰 Gestione Economica</h1>

      {/* Filtri */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
        <div>
          <label className="block text-sm font-medium">Periodo</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">Tutto</option>
            <option value="day">Oggi</option>
            <option value="week">Settimana</option>
            <option value="month">Mese</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Anno</label>
          <select
            value={filterYear}
            onChange={(e) =>
              setFilterYear(
                e.target.value === "all" ? "all" : Number(e.target.value)
              )
            }
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">Tutti</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Commessa</label>
          <input
            type="text"
            value={filterCommessa}
            onChange={(e) => setFilterCommessa(e.target.value)}
            placeholder="Codice commessa"
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Cliente</label>
          <input
            type="text"
            value={filterCliente}
            onChange={(e) => setFilterCliente(e.target.value)}
            placeholder="Nome cliente"
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* Totali */}
      <div className="bg-white shadow rounded-lg p-4 flex flex-col md:flex-row gap-4 justify-around text-center">
        <div>
          <div className="text-sm text-gray-500">Totale previsto</div>
          <div className="text-lg font-bold text-blue-700">
            {totals.expected.toLocaleString("it-IT", {
              style: "currency",
              currency: "EUR",
            })}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Totale incassato</div>
          <div className="text-lg font-bold text-green-600">
            {totals.collected.toLocaleString("it-IT", {
              style: "currency",
              currency: "EUR",
            })}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Residuo</div>
          <div
            className={`text-lg font-bold ${
              totals.pending > 0 ? "text-red-700" : "text-green-700"
            }`}
          >
            {totals.pending.toLocaleString("it-IT", {
              style: "currency",
              currency: "EUR",
            })}
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full border text-sm bg-white rounded-lg shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Cliente</th>
              <th className="p-2 text-left">Commessa</th>
              <th className="p-2 text-left">Data</th>
              <th className="p-2 text-right">Previsto</th>
              <th className="p-2 text-right">Incassato</th>
              <th className="p-2 text-right">Residuo</th>
              <th className="p-2 text-center">Stato</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => {
              const totalExpected = o.payments.reduce(
                (s, p) => s + (p.amount ?? 0),
                0
              );
              const totalCollected = o.payments.reduce((s, p) => {
                if (p.collected) return s + (p.amount ?? 0);
                if ((p as any).partial)
                  return s + ((p as any).collectedAmount ?? 0);
                return s;
              }, 0);
              const pending = totalExpected - totalCollected;

              return (
                <tr key={o.id} className="border-t hover:bg-orange-50">
                  <td className="p-2">
                    <Link
                      to={`/backoffice/orders/${o.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {o.customer?.name ?? "N/D"}
                    </Link>
                  </td>
                  <td className="p-2">{o.code}</td>
                  <td className="p-2">{formatDate(o.createdAt)}</td>
                  <td className="p-2 text-right font-bold text-blue-700">
                    {totalExpected.toLocaleString("it-IT", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </td>
                  <td className="p-2 text-right font-bold text-green-600">
                    {totalCollected.toLocaleString("it-IT", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </td>
                  <td
                    className={`p-2 text-right font-bold ${
                      pending > 0 ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    {pending.toLocaleString("it-IT", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </td>
                  <td className="p-2 text-center">
                    {pending > 0 ? "❌ Aperto" : "✅ Saldato"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {filteredOrders.map((o) => {
          const totalExpected = o.payments.reduce(
            (s, p) => s + (p.amount ?? 0),
            0
          );
          const totalCollected = o.payments.reduce((s, p) => {
            if (p.collected) return s + (p.amount ?? 0);
            if ((p as any).partial)
              return s + ((p as any).collectedAmount ?? 0);
            return s;
          }, 0);
          const pending = totalExpected - totalCollected;

          return (
            <div key={o.id} className="border rounded-lg p-3 bg-white shadow">
              <div>
                <strong>Cliente:</strong> {o.customer?.name ?? "N/D"}
              </div>
              <div>
                <strong>Commessa:</strong> {o.code}
              </div>
              <div>
                <strong>Data:</strong> {formatDate(o.createdAt)}
              </div>
              <div>
                <strong>Previsto:</strong>{" "}
                {totalExpected.toLocaleString("it-IT", {
                  style: "currency",
                  currency: "EUR",
                })}
              </div>
              <div className="text-green-600">
                <strong>Incassato:</strong>{" "}
                {totalCollected.toLocaleString("it-IT", {
                  style: "currency",
                  currency: "EUR",
                })}
              </div>
              <div
                className={
                  pending > 0
                    ? "text-red-700 font-bold"
                    : "text-green-700 font-bold"
                }
              >
                <strong>Residuo:</strong>{" "}
                {pending.toLocaleString("it-IT", {
                  style: "currency",
                  currency: "EUR",
                })}
              </div>
              <div>
                <strong>Stato:</strong>{" "}
                {pending > 0 ? "❌ Aperto" : "✅ Saldato"}
              </div>

              {/* Link dettaglio */}
              <Link
                to={`/backoffice/orders/${o.id}`}
                className="mt-2 inline-block px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Apri dettaglio
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
