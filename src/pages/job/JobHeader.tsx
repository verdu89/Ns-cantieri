// JobHeader.tsx
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { Job, JobOrder, Customer } from "@/types";
import { STATUS_CONFIG } from "@/config/statusConfig";

interface JobHeaderProps {
  job: Job;
  customer?: Customer;
  order?: JobOrder;
}

export default function JobHeader({ job, customer, order }: JobHeaderProps) {
  const { user } = useAuth();
  const role = user?.role; // "admin" | "backoffice" | "worker"
  const isStaff = role === "admin" || role === "backoffice";

  const customerName = customer?.name ?? job.customer?.name ?? "—";
  const phone = customer?.phone ?? job.customer?.phone ?? "";

  const composedCustomerAddress = [
    (customer as any)?.address || (customer as any)?.street || "",
    (customer as any)?.cap || (customer as any)?.postal_code || "",
    (customer as any)?.city || "",
    (customer as any)?.province || "",
  ]
    .filter(Boolean)
    .join(" ");

  const address =
    job?.location?.address ||
    (order as any)?.site_address ||
    (order as any)?.address ||
    composedCustomerAddress ||
    "";

  const mapsHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address
      )}`
    : "#";

  const telHref = phone ? `tel:${phone}` : "";

  const formattedPlannedDate = job?.plannedDate
    ? new Date(job.plannedDate).toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Non programmato";

  const cfg = STATUS_CONFIG[job.status] ?? {
    color: "bg-gray-200 text-gray-700",
    label: job.status.replaceAll("_", " "),
    icon: "ℹ️",
  };

  return (
    <Card>
      <CardContent className="p-6 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        {/* Colonna sinistra */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">👤</span>
            <div>
              <div className="text-xs uppercase text-gray-500">Cliente</div>
              {isStaff && customer ? (
                <Link
                  to={`/backoffice/customers/${customer.id}`}
                  className="text-lg font-semibold text-blue-600 hover:underline"
                >
                  {customerName}
                </Link>
              ) : (
                <div className="text-lg font-semibold">{customerName}</div>
              )}

              {/* 👇 riferimento commessa */}
              {order && (
                <div className="text-sm text-gray-600">
                  Commessa:{" "}
                  {isStaff ? (
                    <Link
                      to={`/backoffice/orders/${order.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {order.code ?? (order as any).numero ?? "—"}
                    </Link>
                  ) : (
                    <span className="font-medium">
                      {order.code ?? (order as any).numero ?? "—"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-lg">📍</span>
            <div>
              <div className="text-xs uppercase text-gray-500">Indirizzo</div>
              {address ? (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-base text-blue-600 hover:underline"
                >
                  {address}
                </a>
              ) : (
                <span className="text-gray-500 text-sm">—</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-lg">📞</span>
            <div>
              <div className="text-xs uppercase text-gray-500">Telefono</div>
              {phone ? (
                <a
                  href={telHref}
                  className="text-base text-blue-600 hover:underline"
                >
                  {phone}
                </a>
              ) : (
                <span className="text-gray-500 text-sm">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Colonna destra */}
        <div className="flex flex-col items-start md:items-end gap-3">
          <Badge className={`flex items-center gap-1 ${cfg.color}`}>
            <span>{cfg.icon}</span> {cfg.label}
          </Badge>

          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <div>
              <div className="text-xs uppercase text-gray-500">
                Data prevista
              </div>
              <div className="text-base font-medium">
                {formattedPlannedDate}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-lg">🔧</span>
            <div>
              <div className="text-xs uppercase text-gray-500">Intervento</div>
              <div className="text-base font-medium">{job.title}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
