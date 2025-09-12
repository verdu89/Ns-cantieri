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
                {(ev.notes ?? "")
                  .split("\n")
                  .find((line) => line.startsWith("Data:"))
                  ?.replace("Data:", "")
                  .trim() || "-"}
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

              {/* Bottone stampa */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    const printWindow = window.open("", "_blank", "width=800,height=600");
                    if (printWindow) {
                      printWindow.document.write(`
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
                            <pre>${ev.notes ?? ""}</pre>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  🖨️ Stampa
                </button>
              </div>

            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
