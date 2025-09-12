import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { Job, Documento, JobEvent } from "@/types";

export default function JobCheckoutReport({
  job,
  docs,
}: {
  job: Job;
  docs: Documento[];
}) {
  const checkoutEvents: JobEvent[] = (job.events || [])
    .filter(
      (ev) =>
        ev.type === "check_out_completato" ||
        ev.type === "check_out_da_completare"
    )
    .sort(
      (a, b) =>
        new Date(b.date || b.createdAt || "").getTime() -
        new Date(a.date || a.createdAt || "").getTime()
    );

  if (checkoutEvents.length === 0) return null;

  return (
    <div className="space-y-6">
      {checkoutEvents.map((ev, idx) => {
        const checkoutIndex = checkoutEvents.length - idx;

        const checkoutDocs = docs.filter(
          (d) =>
            d.fileName?.startsWith(`fine_lavoro_${checkoutIndex}_`) &&
            d.fileName.split(".").length > 1
        );

        return (
          <Card key={ev.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg">
                📋 Checkout del{" "}
                {new Date(ev.date || ev.createdAt || "").toLocaleString("it-IT", {
                  timeZone: "Europe/Rome",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Report del checkout */}
              <pre className="whitespace-pre-wrap break-words text-sm bg-gray-50 p-3 rounded-md max-h-[300px] overflow-y-auto">
                {ev.notes}
              </pre>

              {/* Allegato fine lavoro */}
              {checkoutDocs.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 text-sm md:text-base">
                    📎 Allegato fine lavoro
                  </h3>
                  <ul className="text-sm space-y-2">
                    {checkoutDocs.map((d) => (
                      <li
                        key={d.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                      >
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {d.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
