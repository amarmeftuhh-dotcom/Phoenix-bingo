import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  highlight = false,
  children,
}: {
  label: string;
  value?: string | number;
  sub?: string;
  highlight?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center rounded-2xl border p-2.5 text-center transition-all",
        highlight
          ? "border-gold/60 bg-gold/10 shadow-glow-gold/20"
          : "border-border bg-surface-grad shadow-card-soft"
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {value !== undefined ? (
        <p
          className={cn(
            "mt-0.5 text-base font-black tabular-nums tracking-tight",
            highlight ? "text-gold" : "text-foreground"
          )}
        >
          {value}
          {sub && (
            <span className="ml-1 text-[10px] font-semibold text-muted-foreground">
              {sub}
            </span>
          )}
        </p>
      ) : (
        children
      )}
    </div>
  );
}
