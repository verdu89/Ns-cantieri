// src/pages/MyJobs.tsx
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { jobAPI } from "../api/jobs";
import { Loader2, ArrowDownUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { Job } from "../types";
import { STATUS_CONFIG } from "@/config/statusConfig";

type EffectiveStatus = Job["status"] | "in_ritardo";

// 🔹 Util per data italiana
function toLocalDateKey(d: Date) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

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

export default function MyJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<EffectiveStatus | "all">(
    "all"
  );
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"); // 🔹 nuovo stato

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let all: Job[] = [];

        if (user?.role === "worker" && user.workerId) {
          all = await jobAPI.listAssigned(user.workerId);
        } else {
          all = await jobAPI.list();
        }

        setJobs(
          all.map((j) => ({
            ...j,
            status: normalizeStatus(j.status),
          }))
        );
      } catch (e) {
        console.error("Errore caricamento lavori:", e);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const filteredJobs = useMemo(() => {
    let res = jobs.map((j) => ({
      ...j,
      effectiveStatus: getEffectiveStatus(j),
    }));

    if (filterStatus !== "all") {
      res = res.filter((j) => j.effectiveStatus === filterStatus);
    }

    if (search.trim()) {
      res = res.filter((j) =>
        j.customer?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (dateFilter !== "all") {
      const now = new Date();
      const todayKey = toLocalDateKey(now);

      res = res.filter((j) => {
        if (!j.plannedDate) return false;
        const d = new Date(j.plannedDate);
        const dKey = toLocalDateKey(d);

        if (dateFilter === "today") {
          return dKey === todayKey;
        }
        if (dateFilter === "week") {
          const start = new Date(now);
          start.setDate(now.getDate() - now.getDay()); // domenica
          const end = new Date(start);
          end.setDate(start.getDate() + 7);
          return d >= start && d < end;
        }
        return true;
      });
    }

    // 🔹 Sort per data con ordine variabile
    res.sort((a, b) => {
      const aTime = a.plannedDate ? new Date(a.plannedDate).getTime() : Infinity;
      const bTime = b.plannedDate ? new Date(b.plannedDate).getTime() : Infinity;
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });

    return res;
  }, [jobs, filterStatus, search, dateFilter, sortOrder]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-600">
        <Loader2 className="animate-spin" /> Caricamento lavori…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header + Filtri */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">
          {user?.role === "worker" ? "👷 I miei lavori" : "📋 Tutti i lavori"}
        </h1>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Filtro stato */}
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as EffectiveStatus | "all")
            }
            className="border rounded-xl px-3 py-2 text-sm"
          >
            <option value="all">Tutti</option>
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

          {/* Ricerca cliente */}
          <input
            type="text"
            placeholder="Cerca cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm"
          />

          {/* Filtri rapidi data */}
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter("all")}
              className={`px-3 py-2 rounded-xl text-sm ${
                dateFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "border text-gray-600 hover:bg-gray-100"
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setDateFilter("today")}
              className={`px-3 py-2 rounded-xl text-sm ${
                dateFilter === "today"
                  ? "bg-blue-600 text-white"
                  : "border text-gray-600 hover:bg-gray-100"
              }`}
            >
              Oggi
            </button>
            <button
              onClick={() => setDateFilter("week")}
              className={`px-3 py-2 rounded-xl text-sm ${
                dateFilter === "week"
                  ? "bg-blue-600 text-white"
                  : "border text-gray-600 hover:bg-gray-100"
              }`}
            >
              Settimana
            </button>
          </div>

          {/* Sort per data */}
          <button
            onClick={() =>
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            className="flex items-center gap-1 px-3 py-2 rounded-xl border text-sm hover:bg-gray-100"
          >
            <ArrowDownUp size={16} />
            {sortOrder === "asc" ? "Data ↑" : "Data ↓"}
          </button>
        </div>
      </div>

      {/* Conteggio */}
      <div className="text-sm text-gray-600">
        Totale: {filteredJobs.length} lavori ·{" "}
        {filteredJobs.filter((j) => j.effectiveStatus === "in_corso").length} in
        corso ·{" "}
        {filteredJobs.filter((j) => j.effectiveStatus === "in_ritardo").length}{" "}
        in ritardo ·{" "}
        {filteredJobs.filter((j) => j.effectiveStatus === "assegnato").length}{" "}
        assegnati
      </div>

      {/* Lista lavori */}
      {filteredJobs.length === 0 ? (
        <div className="text-gray-500">Nessun lavoro trovato.</div>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => {
            const cfg = STATUS_CONFIG[job.effectiveStatus];
            return (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="block border rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition-transform hover:-translate-y-0.5"
              >
                <div className="flex justify-between items-center">
                  <h2 className="font-medium truncate">
                    {job.title} · {job.customer?.name ?? "Cliente N/D"}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      cfg?.color ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {cfg?.icon} {cfg?.label ?? job.effectiveStatus}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  📅{" "}
                  {job.plannedDate
                    ? new Date(job.plannedDate).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Non programmato"}
                </div>
                <div className="text-sm text-gray-600">
                  📍 {job.location?.address ?? "—"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
