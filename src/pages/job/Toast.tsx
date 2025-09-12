interface ToastProps {
  toast: {
    show: boolean;
    type: "success" | "error";
    message: string;
  };
}

export default function Toast({ toast }: ToastProps) {
  if (!toast.show) return null;

  const bg =
    toast.type === "success"
      ? "bg-green-500"
      : "bg-red-500";

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`${bg} text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in`}
      >
        {toast.message}
      </div>
    </div>
  );
}
