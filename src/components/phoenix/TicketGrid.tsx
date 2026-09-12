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
    <div className="w-full px-2 sm:px-3 pt-2">
      {/* Full Page Ticket Grid (All 1 - 550 numbers) */}
      <div className="w-full rounded-2xl border border-border/80 bg-black/50 p-2 sm:p-3 shadow-2xl">
        <div
          className={cn(
            "grid grid-cols-7 xs:grid-cols-8 sm:grid-cols-10 md:grid-cols-11 lg:grid-cols-12 gap-1.5 sm:gap-2",
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
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-xs sm:text-sm font-black tabular-nums transition-all active:scale-90 select-none",
                  isTaken || disabled
                    ? "border-transparent bg-secondary/15 text-muted-foreground/30 line-through cursor-not-allowed"
                    : isSelected
                    ? "border-gold bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-black shadow-glow-gold font-black scale-105 z-10 ring-2 ring-gold/70"
                    : "border-border/70 bg-secondary/80 text-foreground hover:border-gold/50 hover:bg-secondary active:border-gold"
                )}
              >
                <span>{n}</span>
                {isSelected && (
                  <CheckCircle2 className="absolute top-0.5 right-0.5 h-3 w-3 text-black stroke-[3]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
