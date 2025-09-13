import { useEffect, useState } from "react";
import { jobOrderAPI } from "../../api/jobOrders";
import { jobAPI } from "../../api/jobs";
import { customerAPI } from "../../api/customers";
import { workerAPI } from "../../api/workers";
import type { JobOrder, Job, Customer, Worker, Payment } from "../../types";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return d;
}

export default function ReportPage() {
  const [orders, setOrders] = useState<JobOrder[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    jobOrderAPI.list().then(setOrders);
    jobAPI.list().then(setJobs);
    customerAPI.list().then(setCustomers);
    workerAPI.list().then(setWorkers);
  }, []);

  // Calcolo settimana
  const now = new Date();
  const currentWeekStart = startOfWeek(now);
  const currentWeek = new Date(
    currentWeekStart.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000
  );
  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);

  // Filtri
  const jobsThisWeek = jobs.filter((j) => {
    if (!j.plannedDate) return false;
    const d = new Date(j.plannedDate);
    return d >= weekStart && d <= weekEnd;
  });

  const ordersThisWeek = orders.filter((o) =>
    jobsThisWeek.some((j) => j.jobOrderId === o.id)
  );

  // KPI pagamenti
  const paymentsThisWeek: Payment[] = jobsThisWeek.flatMap(
    (j) => j.payments ?? []
  );
  const totalePrevisto = paymentsThisWeek.reduce(
    (s, p) => s + (p.amount ?? 0),
    0
  );
  const totaleIncassato = paymentsThisWeek.reduce((s, p) => {
    if (p.collected) return s + (p.amount ?? 0);
    if ((p as any).partial) return s + ((p as any).collectedAmount ?? 0);
    return s;
  }, 0);
  const totaleResiduo = totalePrevisto - totaleIncassato;

  // KPI lavori
  const completati = jobsThisWeek.filter(
    (j) => j.status === "completato"
  ).length;
  const completionRate = jobsThisWeek.length
    ? Math.round((completati / jobsThisWeek.length) * 100)
    : 0;

  // Grafico per montatore
  const jobsByWorker = workers.map((w) => ({
    name: w.name.length > 12 ? w.name.substring(0, 12) + "..." : w.name,
    count: jobsThisWeek.filter((j) => j.assignedWorkers.includes(w.id)).length,
  }));

  // Grafico per stato
  const statusList: Job["status"][] = [
    "in_corso",
    "assegnato",
    "in_attesa_programmazione",
    "completato",
    "da_completare",
    "annullato",
  ];
  const statusCounts = statusList.map((status) => ({
    name: status,
    value: jobsThisWeek.filter((j) => j.status === status).length,
  }));
  const COLORS = [
    "#22c55e",
    "#3b82f6",
    "#eab308",
    "#10b981",
    "#f97316",
    "#ef4444",
  ];

  return (
    <main className="p-4 sm:p-6 space-y-6">
      {/* Header + navigazione settimane */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h1 className="text-2xl font-bold">Reportistica Settimanale</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            ◀️
          </button>
          <div className="font-medium">
            {weekStart.toLocaleDateString("it-IT")} –{" "}
            {weekEnd.toLocaleDateString("it-IT")}
          </div>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            ▶️
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Interventi</p>
          <p className="text-xl font-bold">{jobsThisWeek.length}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Completati</p>
          <p className="text-xl font-bold">
            {completati} ({completionRate}%)
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Previsto</p>
          <p className="text-xl font-bold">{totalePrevisto.toFixed(2)}€</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Incassato</p>
          <p className="text-xl font-bold text-green-600">
            {totaleIncassato.toFixed(2)}€
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Residuo</p>
          <p
            className={`text-xl font-bold ${
              totaleResiduo > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {totaleResiduo.toFixed(2)}€
          </p>
        </div>
      </div>

      {/* Grafici */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Montatori */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">
            Interventi per Montatore
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={jobsByWorker}
              layout="vertical" // orizzontale, più leggibile su mobile
              margin={{ left: 50 }}
            >
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stati */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">
            Distribuzione Stati Lavori
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusCounts}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label
              >
                {statusCounts.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Riepilogo commesse */}
      <div className="bg-white shadow rounded-lg p-4 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Riepilogo Commesse</h2>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Cliente</th>
              <th className="p-2">Commessa</th>
              <th className="p-2">Interventi</th>
              <th className="p-2">Completati</th>
              <th className="p-2">Previsto</th>
              <th className="p-2">Incassato</th>
              <th className="p-2">Residuo</th>
            </tr>
          </thead>
          <tbody>
            {ordersThisWeek.map((o) => {
              const relatedJobs = jobsThisWeek.filter(
                (j) => j.jobOrderId === o.id
              );
              const relatedPayments = relatedJobs.flatMap(
                (j) => j.payments ?? []
              );
              const previsto = relatedPayments.reduce(
                (s, p) => s + (p.amount ?? 0),
                0
              );
              const incassato = relatedPayments.reduce((s, p) => {
                if (p.collected) return s + (p.amount ?? 0);
                if ((p as any).partial)
                  return s + ((p as any).collectedAmount ?? 0);
                return s;
              }, 0);

              return (
                <tr key={o.id} className="border-t">
                  <td className="p-2">
                    {customers.find((c) => c.id === o.customerId)?.name ??
                      "N/D"}
                  </td>
                  <td className="p-2">{o.code}</td>
                  <td className="p-2">{relatedJobs.length}</td>
                  <td className="p-2">
                    {
                      relatedJobs.filter((j) => j.status === "completato")
                        .length
                    }
                  </td>
                  <td className="p-2">{previsto.toFixed(2)}€</td>
                  <td className="p-2 text-green-600">
                    {incassato.toFixed(2)}€
                  </td>
                  <td
                    className={`p-2 font-bold ${
                      previsto - incassato > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {(previsto - incassato).toFixed(2)}€
                  </td>
                </tr>
              );
            })}
            {ordersThisWeek.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Nessuna commessa questa settimana
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
