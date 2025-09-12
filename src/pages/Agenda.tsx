import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { jobAPI } from "@/api/jobs";
import { workerAPI } from "@/api/workers";
import type { Job, User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { STATUS_CONFIG } from "@/config/statusConfig";

const STATUSES = Object.keys(STATUS_CONFIG) as Job["status"][];

/* ========= Stato effettivo ========= */
function getEffectiveStatus(job: Job): Job["status"] {
  if (!job.plannedDate) return job.status;

  const now = new Date();
  const planned = new Date(job.plannedDate);

  // Non toccare completati, da_completare, annullati
  if (["completato", "da_completare", "annullato"].includes(job.status)) {
    return job.status;
  }

  // Se è assegnato e l'orario è scattato → passa a in_corso
  if (job.status === "assegnato" && planned <= now) {
    return "in_corso";
  }

  // Se è in_corso e sono passate le 17:00 del giorno pianificato → in_ritardo
  if (job.status === "in_corso") {
    const endOfDay = new Date(planned);
    endOfDay.setHours(17, 0, 0, 0);
    if (now > endOfDay) return "in_ritardo";
  }

  return job.status;
}

/* ========= Utils ========= */
function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function stripTime(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function toLocalISODate(d: Date) {
  return d
    .toLocaleDateString("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .reverse()
    .join("-");
}
function formatWeekRange(start: Date) {
  const end = addDays(start, 4);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
    });
  return `Settimana: ${fmt(start)} → ${fmt(end)}`;
}
function formatDayHeader(d: Date) {
  return d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}
function formatTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ========= Component ========= */
export default function Agenda() {
  const { user } = useAuth() as { user: User | null };

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const days = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      let j: Job[] = [];

      if (user?.role === "worker" && user.workerId) {
        j = await jobAPI.listAssigned(String(user.workerId));
      } else {
        j = await jobAPI.list();
        await workerAPI.list(); // caricati ma non usati qui
      }

      // 🔹 Sincronizza stati con DB
      const syncedJobs: Job[] = [];
      for (const job of j) {
        const effectiveStatus = getEffectiveStatus(job);
        if (effectiveStatus !== job.status) {
          try {
            await jobAPI.update(job.id, { status: effectiveStatus });
            syncedJobs.push({ ...job, status: effectiveStatus });
          } catch (err) {
            console.error("Errore aggiornando stato job:", job.id, err);
            syncedJobs.push(job);
          }
        } else {
          syncedJobs.push(job);
        }
      }

      setJobs(syncedJobs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("jobs:updated", handler);
    return () => window.removeEventListener("jobs:updated", handler);
  }, []);

  const jobsByDay = useMemo(() => {
    const start = stripTime(weekStart).getTime();
    const end = addDays(weekStart, 5).getTime();
    const m = new Map<string, Job[]>();
    for (const d of days) m.set(toLocalISODate(d), []);
    jobs.forEach((j) => {
      if (!j.plannedDate || j.status === "annullato") return;
      const date = new Date(j.plannedDate);
      const t = stripTime(date).getTime();
      const key = toLocalISODate(date);
      if (t >= start && t < end && m.has(key)) {
        m.get(key)!.push(j);
      }
    });
    for (const d of days) {
      m.get(toLocalISODate(d))!.sort((a, b) =>
        (a.plannedDate || "").localeCompare(b.plannedDate || "")
      );
    }
    return m;
  }, [jobs, days, weekStart]);

  const kpi = useMemo(() => {
    const counts: Record<Job["status"], number> = {} as Record<
      Job["status"],
      number
    >;
    STATUSES.forEach((s) => (counts[s] = 0));
    for (const [, arr] of jobsByDay) {
      arr.forEach((j) => {
        counts[j.status] = (counts[j.status] ?? 0) + 1;
      });
    }
    return counts;
  }, [jobsByDay]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-gray-600">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="p-2 rounded-lg border bg-white hover:bg-gray-50"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm"
            onClick={() => setWeekStart(getMonday(new Date()))}
          >
            Oggi
          </button>
          <button
            className="p-2 rounded-lg border bg-white hover:bg-gray-50"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
          >
            <ChevronRight size={16} />
          </button>
          <button
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm"
            onClick={load}
          >
            <RefreshCw size={16} /> Aggiorna
          </button>
        </div>
      </div>

      {/* Giorni (Calendario) */}
      <div className="block md:hidden space-y-4">
        {days.map((d) => (
          <DayCard
            key={d.toISOString()}
            d={d}
            list={jobsByDay.get(toLocalISODate(d)) ?? []}
            isToday={toLocalISODate(d) === toLocalISODate(new Date())}
            userRole={user?.role}
          />
        ))}
      </div>
      <div className="hidden md:grid md:grid-cols-5 gap-4">
        {days.map((d) => (
          <DayCard
            key={d.toISOString()}
            d={d}
            list={jobsByDay.get(toLocalISODate(d)) ?? []}
            isToday={toLocalISODate(d) === toLocalISODate(new Date())}
            userRole={user?.role}
          />
        ))}
      </div>

      {/* KPI tabella compatta */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2 text-right">Totale</th>
            </tr>
          </thead>
          <tbody>
            {STATUSES.map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <tr key={s} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      {cfg.icon && <span>{cfg.icon}</span>}
                      <span>{cfg.label}</span>
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold">
                    {kpi[s]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && <div className="text-sm text-gray-500">Caricamento…</div>}
    </div>
  );
}

/* ========= Sottocomponente ========= */
function DayCard({
  d,
  list,
  isToday,
  userRole,
}: {
  d: Date;
  list: Job[];
  isToday: boolean;
  userRole?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-white ${
        isToday ? "ring-2 ring-brand/30" : ""
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar size={14} />
          <span className="font-medium">{formatDayHeader(d)}</span>
        </div>
        <span className="text-xs text-gray-500">{list.length} lavori</span>
      </div>
      <div className="p-2 sm:p-3 space-y-2">
        {list.length === 0 && (
          <div className="text-xs text-gray-400">Nessun lavoro</div>
        )}
        {list.map((j) => {
          const linkTo =
            userRole === "admin" || userRole === "backoffice"
              ? `/backoffice/jobs/${encodeURIComponent(j.id)}`
              : `/jobs/${encodeURIComponent(j.id)}`;
          const cfg = STATUS_CONFIG[j.status];
          return (
            <Link
              key={j.id}
              to={linkTo}
              className="block border rounded-lg p-2 sm:p-3 bg-gray-50 shadow-sm hover:bg-white focus:bg-white transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className="text-sm font-medium truncate"
                  title={j.title ?? `Lavoro ${j.id}`}
                >
                  {j.title ?? `Lavoro ${j.id}`}
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${cfg?.color}`}
                >
                  {cfg?.label ?? j.status}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-gray-600 flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {formatTime(j.plannedDate)}
                </span>
                {j.customer?.name && (
                  <span className="text-gray-700">· {j.customer.name}</span>
                )}
              </div>
              {j.team?.length ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {j.team.map((m) => (
                    <span
                      key={m.id}
                      className="text-[11px] px-2 py-0.5 rounded-full border bg-white"
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
