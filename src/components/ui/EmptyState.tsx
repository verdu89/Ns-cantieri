export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border border-dashed rounded-2xl p-10 text-center text-gray-500 bg-white">
      <div className="text-lg font-medium">{title}</div>
      {hint && <div className="text-sm mt-1">{hint}</div>}
    </div>
  );
}
