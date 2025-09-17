// src/utils/date.ts

/** ISO per chiavi di giorni (YYYY-MM-DD) */
export const toLocalISODate = (d: Date) => {
  return d
    .toLocaleDateString("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .reverse()
    .join("-");
};

/** Range settimana (lun → ven) */
export const formatWeekRange = (start: Date) => {
  const end = addDays(start, 4);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
    });
  return `Settimana: ${fmt(start)} → ${fmt(end)}`;
};

/** Intestazione giorno (lun 17/09) */
export const formatDayHeader = (d: Date) => {
  return d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
};

/** Solo ora (HH:mm) */
export const formatTime = (iso?: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Solo data (gg/mm/aaaa) */
export const formatDate = (date?: string | Date | null) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/** Data e ora (gg/mm/aaaa hh:mm) */
export const formatDateTime = (date?: string | Date | null) => {
  if (!date) return "";
  return new Date(date).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** 🔹 Per salvataggio in DB (mantiene l'orario scelto dall'utente, senza shift fuso) */
export const toDbDate = (date?: string | Date | null) => {
  if (!date) return "";
  if (typeof date === "string") {
    // datetime-local produce "YYYY-MM-DDTHH:mm"
    if (date.includes("T") && date.length === 16) {
      return date + ":00"; // aggiunge i secondi
    }
    return date;
  }
  // Se è Date → formatto manualmente senza timezone
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":00"
  );
};

/** 🔹 Per input datetime-local (YYYY-MM-DDTHH:mm in locale) */
export const toInputDateTime = (date?: string | Date | null) => {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
};

/** Converte in millisecondi per sort */
export const toTimestamp = (date?: string | Date | null): number => {
  if (!date) return Infinity;
  const d = typeof date === "string" ? new Date(date) : date;
  const t = d?.getTime?.();
  return Number.isFinite(t) ? t! : Infinity;
};

/* ===== Supporto ===== */
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const stripTime = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const getMonday = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Converte stringa/Date/null in un oggetto Date valido */
export function parseDate(input: string | Date | null | undefined): Date {
  if (!input) return new Date(0); // fallback: epoch
  if (input instanceof Date) return input;
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date(0) : d;
}
