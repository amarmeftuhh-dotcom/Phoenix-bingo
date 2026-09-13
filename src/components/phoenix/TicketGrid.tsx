import { useMemo } from "react";
import { CheckCircle2, X } from "lucide-react";
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
            const isSelected = selected.includes(n);
            const isTakenByOther = taken.includes(n) && !isSelected;

            return (
              <button
                key={n}
                type="button"
                disabled={disabled || isTakenByOther}
                onClick={() => onToggle(n)}
                aria-label={
                  isSelected
                    ? `የተመረጠ ካርቴላ ${n}`
                    : isTakenByOther
                    ? `የተያዘ ካርቴላ ${n}`
                    : `ካርቴላ ${n}`
                }
                title={isTakenByOther ? `ካርቴላ #${n} በሌላ ተጫዋች ተይዟል` : `ካርቴላ #${n}`}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-[10px] sm:text-xs font-black tabular-nums transition-all select-none touch-manipulation",
                  isSelected
                    ? "border-gold bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-black shadow-glow-gold font-black scale-105 z-20 ring-2 ring-gold/90 animate-subtle-pop"
                    : isTakenByOther
                    ? "border-rose-600/80 bg-rose-950/70 text-rose-300/40 line-through backdrop-blur-md opacity-45 cursor-not-allowed shadow-inner z-0 pointer-events-none"
                    : disabled
                    ? "border-transparent bg-secondary/15 text-muted-foreground/30 line-through cursor-not-allowed"
                    : "border-border/60 bg-secondary/80 text-foreground hover:border-gold/50 hover:bg-secondary active:scale-95 active:border-gold"
                )}
              >
                <span className={cn(isTakenByOther && "opacity-60")}>{n}</span>

                {/* Selected by current user badge */}
                {isSelected && (
                  <CheckCircle2 className="absolute -top-1 -right-1 h-3.5 w-3.5 text-emerald-400 fill-black stroke-[3] rounded-full shadow-md z-30" />
                )}

                {/* Taken by another phone/opponent: Prominent Red X & watermark */}
                {isTakenByOther && (
                  <>
                    <X className="absolute inset-0 m-auto h-4 w-4 text-rose-500/50 pointer-events-none stroke-[3]" />
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-white shadow-md ring-1 ring-black z-10">
                      <X className="h-2.5 w-2.5 stroke-[4]" />
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
