import { cn } from "./cn";

type Variant = "primary" | "secondary" | "danger" | "warning" | "ghost";
export function Button({
  className, children, variant = "primary", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variants: Record<Variant, string> = {
    primary: "bg-brand text-white hover:bg-brand-dark",
    secondary: "bg-gray-900 text-white hover:bg-black",
    danger: "bg-red-600 text-white hover:bg-red-700",
    warning: "bg-yellow-500 text-white hover:bg-yellow-600",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
  };
  return (
    <button
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand/30",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
