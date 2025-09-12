import type { JobDocument } from "../../types";

function icon(type: JobDocument["type"]) {
  if (type === "pdf") return "📄";
  if (type === "image") return "🖼️";
  if (type === "doc") return "📝";
  return "📎";
}

export function DocumentList({
  docs,
  emptyText = "Nessun documento disponibile.",
}: {
  docs: JobDocument[];
  emptyText?: string;
}) {
  if (!docs?.length) {
    return (
      <div className="border border-dashed rounded-2xl p-10 text-center text-gray-500 bg-white">
        {emptyText}
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-2xl bg-white border">
      {docs.map((d) => (
        <li
          key={d.id}
          className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon(d.type)}</span>
            <div>
              <div className="text-sm font-medium text-gray-800">{d.name}</div>
              <div className="text-xs text-gray-500">
                Caricato da {d.uploadedBy} —{" "}
                {new Date(d.uploadedAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              className="text-brand hover:text-brand-dark text-sm font-medium"
              href={d.url}
              target="_blank"
              rel="noreferrer"
            >
              Apri
            </a>
            <a
              className="text-gray-600 hover:text-gray-800 text-sm"
              href={d.url}
              download
            >
              Scarica
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
