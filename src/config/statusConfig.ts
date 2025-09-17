// src/config/statusConfig.ts
import type { Job } from "@/types";

/**
 * Configurazione visuale degli status
 */
export const STATUS_CONFIG: Record<
  Job["status"],
  { color: string; label: string; icon?: string }
> = {
  in_attesa_programmazione: {
    color: "bg-amber-50 text-amber-700 border-amber-200",
    label: "In attesa programmazione",
    icon: "⏳",
  },
  assegnato: {
    color: "bg-blue-50 text-blue-700 border-blue-200",
    label: "Assegnato",
    icon: "📌",
  },
  in_corso: {
    color: "bg-sky-50 text-sky-700 border-sky-200",
    label: "In corso",
    icon: "🔧",
  },
  da_completare: {
    color: "bg-purple-50 text-purple-700 border-purple-200",
    label: "Da completare",
    icon: "📝",
  },
  completato: {
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Completato",
    icon: "✅",
  },
  annullato: {
    color: "bg-gray-100 text-gray-600 border-gray-200",
    label: "Annullato",
    icon: "❌",
  },
  in_ritardo: {
    color: "bg-red-100 text-red-700 border-red-200",
    label: "In ritardo",
    icon: "⚠️",
  },
};

/**
 * Logica centralizzata:
 * - se lo stato è `in_corso` ma la data prevista è passata dopo le 17:00 → diventa `in_ritardo`
 */
export function getEffectiveStatus(
  status: Job["status"],
  plannedDate?: string | Date | null
): Job["status"] {
  if (status === "in_corso" && plannedDate) {
    const now = new Date();
    const planned = new Date(plannedDate);
    const plannedEnd = new Date(planned);
    plannedEnd.setHours(17, 0, 0, 0);

    if (now > plannedEnd) {
      return "in_ritardo";
    }
  }
  return status;
}
