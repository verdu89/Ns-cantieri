import React from "react";

interface ConfirmDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  title?: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void; // 👈 opzionale
}

export function ConfirmDialog({
  open,
  setOpen,
  title = "Conferma azione",
  description,
  confirmText = "Conferma",
  cancelText = "Annulla",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-96 space-y-4 animate-fadeIn">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="text-sm text-gray-600">{description}</div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              onCancel?.();   // se definito lo esegue
              setOpen(false); // sempre chiude
            }}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            onClick={async () => {
              await onConfirm();
              setOpen(false);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
