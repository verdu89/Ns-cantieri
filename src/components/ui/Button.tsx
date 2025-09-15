import { cn } from "./cn";
import { usePreventDoubleClick } from "@/hooks/usePreventDoubleClick";

type Variant = "primary" | "secondary" | "danger" | "warning" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  preventDoubleClick?: boolean;
};

export function Button({
  className,
  children,
  variant,
  preventDoubleClick = true,
  onClick,
  ...props
}: ButtonProps) {
  const variants: Record<Variant, string> = {
    primary: "bg-brand text-white hover:bg-brand-dark",
    secondary: "bg-gray-900 text-white hover:bg-black",
    danger: "bg-red-600 text-white hover:bg-red-700",
    warning: "bg-yellow-500 text-white hover:bg-yellow-600",
    ghost: "",
  };

  const safeClick = preventDoubleClick
    ? usePreventDoubleClick(onClick)
    : onClick;

  return (
    <button
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand/30",
        variant ? variants[variant] : "",
        className // 👈 adesso le tue classi hanno sempre la precedenza
      )}
      onClick={safeClick}
      {...props}
    >
      {children}
    </button>
  );
}
