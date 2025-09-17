// src/pages/MyJobs.tsx
import { Button } from "@/components/ui/Button";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { jobAPI } from "../api/jobs";
import { Loader2, ArrowDownUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { Job } from "../types";
import { STATUS_CONFIG, getEffectiveStatus } from "@/config/statusConfig";
import { toTimestamp, formatDateTime, toLocalISODate } from "@/utils/date";

export default function MyJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<Job["status"] | "all">(
    "all"
  );
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

        setJobs(all);
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
      effectiveStatus: getEffectiveStatus(j.status, j.plannedDate),
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
      const todayKey = toLocalISODate(now);

      res = res.filter((j) => {
        if (!j.plannedDate) return false;
        const dKey = toLocalISODate(new Date(j.plannedDate));

        if (dateFilter === "today") {
          return dKey === todayKey;
        }
        if (dateFilter === "week") {
          const start = new Date(now);
          start.setDate(now.getDate() - now.getDay()); // domenica
          const end = new Date(start);
          end.setDate(start.getDate() + 7);
          return (
            toTimestamp(j.plannedDate) >= start.getTime() &&
            toTimestamp(j.plannedDate) < end.getTime()
          );
        }
        return true;
      });
    }

    // 🔹 Sort per data
    res.sort((a, b) => {
      const aTime = toTimestamp(a.plannedDate);
      const bTime = toTimestamp(b.plannedDate);
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });

    return res;
  }, [jobs, filterStatus, search, dateFilter, sortOrder]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-600">
        <Loader2 className="animate-spin" /> ⏳ Caricamento lavori…
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header + Filtri */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">
          {user?.role === "worker" ? "👷 I miei lavori" : "📋 Tutti i lavori"}
        </h1>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Filtro stato */}
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as Job["status"] | "all")
            }
            className="border rounded-lg px-3 py-2 text-sm"
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
              ] as Job["status"][]
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
            placeholder="🔍 Cerca cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />

          {/* Filtri rapidi data */}
          <div className="flex gap-2">
            <Button
              onClick={() => setDateFilter("all")}
              className={`px-3 py-2 rounded-lg text-sm ${
                dateFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "border text-gray-600 hover:bg-gray-100"
              }`}
            >
              Tutti
            </Button>
            <Button
              onClick={() => setDateFilter("today")}
              className={`px-3 py-2 rounded-lg text-sm ${
                dateFilter === "today"
                  ? "bg-blue-600 text-white"
                  : "border text-gray-600 hover:bg-gray-100"
              }`}
            >
              Oggi
            </Button>
            <Button
              onClick={() => setDateFilter("week")}
              className={`px-3 py-2 rounded-lg text-sm ${
                dateFilter === "week"
                  ? "bg-blue-600 text-white"
                  : "border text-gray-600 hover:bg-gray-100"
              }`}
            >
              Settimana
            </Button>
          </div>

          {/* Sort per data */}
          <Button
            onClick={() =>
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            className="flex items-center gap-1 px-3 py-2 rounded-lg border text-sm hover:bg-gray-100"
          >
            <ArrowDownUp size={16} />
            {sortOrder === "asc" ? "Data ↑" : "Data ↓"}
          </Button>
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
                className="block border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-transform hover:-translate-y-0.5"
              >
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold truncate">
                    {job.title} · {job.customer?.name ?? "Cliente N/D"}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      cfg?.color ?? "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {cfg?.icon} {cfg?.label ?? job.effectiveStatus}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  📅 {formatDateTime(job.plannedDate) ?? "Non programmato"}
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
