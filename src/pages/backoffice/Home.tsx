import { Button } from "@/components/ui/Button";
// src/pages/backoffice/JobsList.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Calendar,
  Users,
  MapPin,
  Filter,
  ArrowDownUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { jobAPI } from "../../api/jobs";
import { jobOrderAPI } from "../../api/jobOrders";
import { customerAPI } from "../../api/customers";
import { workerAPI } from "../../api/workers";

import type { Job, JobOrder, Customer, Worker } from "../../types";
import { STATUS_CONFIG } from "@/config/statusConfig";

const JOB_BASE_PATH = "/backoffice/jobs";

type EffectiveStatus = Job["status"] | "in_ritardo";

function normalizeStatus(s: string): Job["status"] {
  return s.replace(/\s+/g, "_") as Job["status"];
}

function getEffectiveStatus(job: Job): EffectiveStatus {
  const current = normalizeStatus(job.status);
  if (
    (current === "in_corso" || current === "assegnato") &&
    job.plannedDate &&
    new Date(job.plannedDate).getTime() < Date.now()
  ) {
    return "in_ritardo";
  }
  return current;
}

export default function JobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [orders, setOrders] = useState<JobOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const [loading, setLoading] = useState(false);

  // Filtri
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<EffectiveStatus | "all">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const navigate = useNavigate();

  const loadAll = async () => {
    try {
      setLoading(true);
      const [j, o, c, w] = await Promise.all([
        jobAPI.list(),
        jobOrderAPI.list(),
        customerAPI.list(),
        workerAPI.list(),
      ]);
      setJobs(
        j.map((job) => ({ ...job, status: normalizeStatus(job.status) }))
      );
      setOrders(o);
      setCustomers(c);
      setWorkers(w);
    } catch (e: any) {
      console.error("Errore caricamento lavori:", e);
      toast.error(e?.message ?? "Errore durante il caricamento dei lavori ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Helpers
  const getOrder = (job: Job) => orders.find((o) => o.id === job.jobOrderId);
  const getCustomer = (job: Job) => {
    const order = getOrder(job);
    return customers.find((c) => c.id === order?.customerId);
  };
  const getWorkersNames = (job: Job) => {
    if (job.team?.length) return job.team.map((t) => t.name).join(", ");
    if (job.assignedWorkers?.length) {
      return workers
        .filter((w) => job.assignedWorkers?.includes(w.id))
        .map((w) => w.name)
        .join(", ");
    }
    return "—";
  };

  // Filtrati
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let res = jobs.map((j) => ({
      ...j,
      effectiveStatus: getEffectiveStatus(j),
    }));

    if (status !== "all") {
      res = res.filter((j) => j.effectiveStatus === status);
    }

    if (ql) {
      res = res.filter((j) => {
        const order = getOrder(j);
        const customer = getCustomer(j);
        return (
          j.id?.toLowerCase().includes(ql) ||
          order?.code?.toLowerCase().includes(ql) ||
          customer?.name?.toLowerCase().includes(ql) ||
          order?.location?.address?.toLowerCase().includes(ql)
        );
      });
    }

    res.sort((a, b) => {
      const aTime = a.plannedDate
        ? new Date(a.plannedDate).getTime()
        : Infinity;
      const bTime = b.plannedDate
        ? new Date(b.plannedDate).getTime()
        : Infinity;
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });

    return res;
  }, [jobs, status, q, sortOrder, orders, customers]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lavori</h1>
      </div>

      {/* Filtri */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          type="text"
          placeholder="Cerca cliente, commessa o indirizzo"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="p-2 border rounded-xl min-w-0"
        />

        {/* Sort per data */}
        <Button
          onClick={() =>
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
          }
          className="flex items-center gap-1 px-3 py-2 rounded-xl border text-sm hover:bg-gray-100"
        >
          <ArrowDownUp size={16} />
          {sortOrder === "asc" ? "Data ↑" : "Data ↓"}
        </Button>

        {/* Filtro stato */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60">
            <Filter size={16} />
          </span>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as EffectiveStatus | "all")
            }
            className="p-2 border rounded-xl w-full pl-9"
            title="Filtra per stato"
          >
            <option value="all">Tutti gli stati</option>
            {(
              [
                "in_attesa_programmazione",
                "assegnato",
                "in_corso",
                "in_ritardo",
                "da_completare",
                "completato",
                "annullato",
              ] as EffectiveStatus[]
            ).map((key) => {
              const cfg = STATUS_CONFIG[key];
              return (
                <option key={key} value={key}>
                  {cfg?.icon} {cfg?.label ?? key}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex md:justify-end">
          <Button
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
            onClick={loadAll}
          >
            <RefreshCw size={16} /> Aggiorna
          </Button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading && (
          <div className="p-4 text-center text-gray-500 bg-white border rounded-xl">
            <Loader2 className="animate-spin inline" size={16} /> Caricamento…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-4 text-center text-gray-500 bg-white border rounded-xl">
            Nessun lavoro trovato
          </div>
        )}
        {!loading &&
          filtered.map((job) => {
            const order = getOrder(job);
            const customer = getCustomer(job);
            const cfg = STATUS_CONFIG[job.effectiveStatus];
            return (
              <Button
                key={job.id}
                onClick={() => navigate(`${JOB_BASE_PATH}/${job.id}`)}
                className="bg-white border rounded-2xl p-3 w-full text-left active:scale-[0.99] transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm truncate max-w-[70%]">
                    {customer?.name ?? "—"}
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${cfg?.color}`}
                  >
                    {cfg?.icon} {cfg?.label ?? job.effectiveStatus}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Commessa {order?.code ?? "—"}
                </div>

                <div className="mt-2 text-sm flex items-center gap-2">
                  <Calendar size={14} />{" "}
                  {job.plannedDate
                    ? new Date(job.plannedDate).toLocaleString("it-IT")
                    : "—"}
                </div>

                <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                  <Users size={14} /> {getWorkersNames(job)}
                </div>

                {order?.location?.address && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                    <MapPin size={14} />
                    <span className="truncate">{order.location.address}</span>
                  </div>
                )}
              </Button>
            );
          })}
      </div>

      {/* Desktop tabella */}
      <div className="overflow-auto bg-white border rounded-2xl hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr className="text-gray-600">
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Commessa</th>
              <th className="px-3 py-2">Data/Ora</th>
              <th className="px-3 py-2">Stato</th>
              <th className="px-3 py-2">Montatori</th>
              <th className="px-3 py-2">Indirizzo</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  <Loader2 className="animate-spin inline" size={16} />{" "}
                  Caricamento…
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((job) => {
                const order = getOrder(job);
                const customer = getCustomer(job);
                const cfg = STATUS_CONFIG[job.effectiveStatus];
                return (
                  <tr
                    key={job.id}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`${JOB_BASE_PATH}/${job.id}`)}
                  >
                    <td className="px-3 py-3">{customer?.name ?? "—"}</td>
                    <td className="px-3 py-3">{order?.code ?? "—"}</td>
                    <td className="px-3 py-3">
                      {job.plannedDate
                        ? new Date(job.plannedDate).toLocaleString("it-IT")
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${cfg?.color}`}
                      >
                        {cfg?.icon} {cfg?.label ?? job.effectiveStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3">{getWorkersNames(job)}</td>
                    <td className="px-3 py-3">
                      <span className="block truncate max-w-[380px]">
                        {order?.location?.address ?? "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  Nessun lavoro trovato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
