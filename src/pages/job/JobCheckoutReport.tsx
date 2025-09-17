import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import type { Job, Documento, JobEvent } from "@/types";
import { formatDateTime, parseDate } from "@/utils/date";

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
        parseDate(b.date || b.createdAt || "").getTime() -
        parseDate(a.date || a.createdAt || "").getTime()
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

        // Data evento → da campo `date` se presente, altrimenti fallback su createdAt
        const eventDate = ev.date || ev.createdAt || null;
        const formattedDate = eventDate ? formatDateTime(eventDate) : "-";

        return (
          <Card key={ev.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg">
                📋 Checkout del {formattedDate}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Report del checkout */}
              <pre className="whitespace-pre-wrap break-words text-sm bg-gray-50 p-3 rounded-md max-h-[300px] overflow-y-auto">
                {ev.notes}
              </pre>

              {/* Allegati fine lavoro */}
              {checkoutDocs.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 text-sm md:text-base">
                    📎 Allegati fine lavoro
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

              {/* Bottone stampa */}
              <div className="flex flex-col sm:flex-row justify-end pt-2">
                <Button
                  onClick={() => {
                    const iframe = document.createElement("iframe");
                    iframe.style.position = "absolute";
                    iframe.style.width = "0";
                    iframe.style.height = "0";
                    iframe.style.border = "none";
                    document.body.appendChild(iframe);

                    const iframeDoc = iframe.contentWindow?.document;
                    if (iframeDoc) {
                      iframeDoc.open();
                      iframeDoc.write(`
                        <html>
                          <head>
                            <title>Stampa Checkout</title>
                            <style>
                              body { font-family: sans-serif; padding: 20px; }
                              pre { white-space: pre-wrap; word-break: break-word; }
                            </style>
                          </head>
                          <body>
                            <h2>📋 Report Checkout</h2>
                            <p><strong>Data:</strong> ${formattedDate}</p>
                            <pre>${ev.notes ?? ""}</pre>
                          </body>
                        </html>
                      `);
                      iframeDoc.close();
                      iframe.contentWindow?.print();
                      document.body.removeChild(iframe);
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  🖨️ Stampa
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
