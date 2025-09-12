import { useEffect, useState } from "react";

type LocalFile = {
  id: string;
  file: File;
  preview?: string; // se è immagine o video
};

export function UploadArea({
  onChange,
  initialFiles = [],
  noteLabel = "Note intervento",
  onNoteChange,
  initialNote = "",
}: {
  onChange?: (files: File[]) => void;
  initialFiles?: LocalFile[];
  noteLabel?: string;
  onNoteChange?: (note: string) => void;
  initialNote?: string;
}) {
  const [note, setNote] = useState(initialNote);
  const [files, setFiles] = useState<LocalFile[]>(initialFiles);

  useEffect(() => {
    onNoteChange?.(note);
  }, [note, onNoteChange]);

  function handleFiles(selected: FileList | null) {
    if (!selected) return;
    const arr = Array.from(selected);
    const locals = arr.map((f) => {
      let preview: string | undefined;
      if (f.type.startsWith("image/") || f.type.startsWith("video/")) {
        preview = URL.createObjectURL(f);
      }
      return { id: crypto.randomUUID(), file: f, preview };
    });
    const next = [...files, ...locals];
    setFiles(next);
    onChange?.(next.map((x) => x.file));
  }

  function removeFile(id: string) {
    const next = files.filter((i) => i.id !== id);
    setFiles(next);
    onChange?.(next.map((x) => x.file));
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">{noteLabel}</span>
        <textarea
          className="mt-1 w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand/30 min-h-[120px]"
          placeholder="Scrivi qui eventuali note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <div className="border rounded-2xl p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 font-medium">Allegati</div>
          <label className="text-brand hover:text-brand-dark text-sm font-medium cursor-pointer">
            Carica file
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </div>

        {files.length === 0 ? (
          <div className="mt-4 border border-dashed rounded-xl p-8 text-center text-gray-500">
            Nessun file caricato.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((f) => (
              <div
                key={f.id}
                className="relative group border rounded-xl overflow-hidden bg-gray-50 p-2 flex flex-col items-center justify-center text-xs text-gray-600"
              >
                {f.preview ? (
                  f.file.type.startsWith("image/") ? (
                    <img
                      src={f.preview}
                      alt={f.file.name}
                      className="w-full h-24 object-cover rounded"
                    />
                  ) : f.file.type.startsWith("video/") ? (
                    <video
                      src={f.preview}
                      className="w-full h-24 object-cover rounded"
                      controls
                    />
                  ) : null
                ) : (
                  <span className="text-3xl">📎</span>
                )}
                <div className="mt-1 truncate w-full text-center">{f.file.name}</div>
                <button
                  onClick={() => removeFile(f.id)}
                  className="absolute top-1 right-1 bg-white/90 hover:bg-white text-red-600 text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
