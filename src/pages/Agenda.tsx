// src/pages/JobAgenda.tsx
import { Button } from "@/components/ui/Button";
import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { jobAPI } from "@/api/jobs";
import { supabase } from "@/supabaseClient";
import type { Job, User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { STATUS_CONFIG, getEffectiveStatus } from "@/config/statusConfig";
import { toast } from "react-hot-toast";
import {
  addDays,
  stripTime,
  getMonday,
  toLocalISODate,
  formatWeekRange,
  formatDayHeader,
  formatTime,
} from "@/utils/date";

const STATUSES = Object.keys(STATUS_CONFIG) as Job["status"][];

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
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 🔹 1. Carico tutti i job (già con customer & payments grazie alla tua list)
      let j: Job[] =
        user?.role === "worker" && user.workerId
          ? await jobAPI.listAssigned(String(user.workerId))
          : await jobAPI.list();

      // 🔹 2. Carico tutti i worker in una sola query (solo se servono)
      const { data: workers } = await supabase
        .from("workers")
        .select("id, name");

      // 🔹 3. Popolo i team senza query extra
      const jobsWithTeam = j.map((job) => ({
        ...job,
        team: job.assignedWorkers.map(
          (wid) => workers?.find((w) => w.id === wid) || { id: wid, name: "?" }
        ),
      }));

      // 🔹 4. Aggiorno stato effettivo SOLO SE CAMBIA (e in parallelo)
      const jobsToUpdate = jobsWithTeam.filter(
        (job) => getEffectiveStatus(job.status, job.plannedDate) !== job.status
      );

      if (jobsToUpdate.length > 0) {
        await Promise.all(
          jobsToUpdate.map((job) =>
            jobAPI.update(job.id, {
              status: getEffectiveStatus(job.status, job.plannedDate),
            })
          )
        );
      }

      // 🔹 5. Applico lo stato aggiornato
      const syncedJobs = jobsWithTeam.map((job) => ({
        ...job,
        status: getEffectiveStatus(job.status, job.plannedDate),
      }));

      setJobs(syncedJobs as Job[]);
    } catch (err) {
      console.error("Errore caricando lavori:", err);
      toast.error("Errore durante il caricamento dei lavori.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  useEffect(() => {
    const handler = () => load(true);
    window.addEventListener("jobs:updated", handler);
    return () => window.removeEventListener("jobs:updated", handler);
  }, []);

  // refresh automatico ogni 2 minuti
  useEffect(() => {
    const interval = setInterval(() => load(true), 120000);
    return () => clearInterval(interval);
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
        const effective = getEffectiveStatus(j.status, j.plannedDate);
        counts[effective] = (counts[effective] ?? 0) + 1;
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
          <Button
            className="p-3 rounded-lg border bg-white hover:bg-gray-50"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
            onClick={() => setWeekStart(getMonday(new Date()))}
          >
            Oggi
          </Button>
          <Button
            className="p-3 rounded-lg border bg-white hover:bg-gray-50"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
          >
            <ChevronRight size={18} />
          </Button>
          <Button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {refreshing ? "Aggiornamento…" : "Aggiorna"}
          </Button>
        </div>
      </div>

      {/* Giorni */}
      {loading ? (
        <div className="flex justify-center items-center py-10 text-gray-500">
          <Loader2 size={20} className="animate-spin mr-2" />
          Caricamento lavori…
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          Nessun lavoro pianificato per questa settimana
        </div>
      ) : (
        <>
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
        </>
      )}

      {/* KPI */}
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
    </div>
  );
}

/* ========= DayCard ========= */
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
        isToday ? "ring-2 ring-brand/40" : ""
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar size={14} />
          <span className="font-medium">{formatDayHeader(d)}</span>
          {isToday && (
            <span className="ml-2 text-xs px-2 py-0.5 bg-brand/20 text-brand rounded-full">
              Oggi
            </span>
          )}
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

          const effective = getEffectiveStatus(j.status, j.plannedDate);
          const cfg = STATUS_CONFIG[effective];

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
                  {cfg?.label ?? effective}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-gray-600 flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {formatTime(j.plannedDate)}
                </span>
                {j.customer && (
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
