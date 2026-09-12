import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TicketGrid({
  total = 550,
  taken,
  selected,
  disabled = false,
  onToggle,
}: {
  total?: number;
  taken: number[];
  selected: number[];
  max?: number;
  disabled?: boolean;
  onToggle: (ticketNum: number) => void;
}) {
  const tickets = useMemo(() => {
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [total]);

  return (
    <div className="w-full px-1.5 sm:px-3 pt-2">
      {/* 12 columns across on mobile, compact and finger-friendly */}
      <div className="w-full rounded-2xl border border-border/80 bg-black/60 p-1.5 sm:p-2.5 shadow-2xl">
        <div
          className={cn(
            "grid grid-cols-12 sm:grid-cols-14 md:grid-cols-16 lg:grid-cols-20 gap-1 sm:gap-1.5",
            disabled && "opacity-60 pointer-events-none"
          )}
        >
          {tickets.map((n) => {
            const isTaken = taken.includes(n);
            const isSelected = selected.includes(n);

            return (
              <button
                key={n}
                type="button"
                disabled={disabled || isTaken}
                onClick={() => onToggle(n)}
                aria-label={`ካርቴላ ${n}`}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-[10px] sm:text-xs font-black tabular-nums transition-transform active:scale-85 select-none touch-manipulation",
                  isTaken || disabled
                    ? "border-transparent bg-secondary/15 text-muted-foreground/30 line-through cursor-not-allowed"
                    : isSelected
                    ? "border-gold bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-black shadow-glow-gold font-black scale-105 z-10 ring-2 ring-gold/70"
                    : "border-border/60 bg-secondary/80 text-foreground hover:border-gold/50 hover:bg-secondary active:border-gold"
                )}
              >
                <span>{n}</span>
                {isSelected && (
                  <CheckCircle2 className="absolute -top-1 -right-1 h-3 w-3 text-emerald-400 fill-black stroke-[3] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
