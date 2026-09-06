import { COLUMN_RANGES, LETTERS } from "@/lib/bingo";
import { cn } from "@/lib/utils";

const LETTER_COLORS = [
  "text-blue-400 border-blue-500/40 bg-blue-500/10",
  "text-purple-400 border-purple-500/40 bg-purple-500/10",
  "text-fuchsia-400 border-fuchsia-500/40 bg-fuchsia-500/10",
  "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  "text-amber-400 border-amber-500/40 bg-amber-500/10",
];

export function MasterBoard75({ drawn }: { drawn: number[] }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/80 bg-black/60 p-1.5 shadow-inner backdrop-blur-sm">
      {LETTERS.map((letter, colIdx) => {
        const [lo, hi] = COLUMN_RANGES[colIdx]!;
        const numbers = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

        return (
          <div key={letter} className="flex items-center gap-1">
            {/* Letter Header */}
            <div
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] font-black uppercase tracking-tight",
                LETTER_COLORS[colIdx]
              )}
            >
              {letter}
            </div>

            {/* 15 Numbers Row */}
            <div className="grid flex-1 grid-cols-[repeat(15,minmax(0,1fr))] gap-0.5">
              {numbers.map((n) => {
                const isDrawn = drawn.includes(n);
                return (
                  <div
                    key={n}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-[3px] text-[8px] font-bold tabular-nums transition-all",
                      isDrawn
                        ? "bg-emerald-500 text-black font-black shadow-glow-gold scale-105"
                        : "bg-secondary/40 text-muted-foreground/60"
                    )}
                  >
                    {n}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
