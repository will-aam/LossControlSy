import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function Kpi({
  label,
  value,
  delta,
  hint,
  tone = "neutral",
  invert = false,
  className = "",
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  tone?: "neutral" | "positive" | "warning" | "negative";
  invert?: boolean;
  className?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-positive"
      : tone === "warning"
        ? "text-warning"
        : tone === "negative"
          ? "text-negative"
          : "text-foreground";

  const good = delta === undefined ? null : invert ? delta <= 0 : delta >= 0;
  const Icon = delta === undefined || Math.abs(delta) < 0.05 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={`rounded-xl bg-surface px-4 py-3.5 ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1.5 text-[22px] font-semibold leading-none tabular-nums md:text-2xl ${toneClass}`}>{value}</p>
      <div className="mt-2 flex items-center gap-1.5 text-[11px]">
        {delta !== undefined && (
          <span className={`inline-flex items-center gap-0.5 tabular-nums ${good ? "text-positive" : "text-negative"}`}>
            <Icon className="h-3 w-3" />
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span className="truncate text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
