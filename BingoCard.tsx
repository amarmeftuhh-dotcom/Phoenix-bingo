import type { Key } from "react";
import { Star } from "lucide-react";
import { LETTERS, type Cell } from "@/lib/bingo";
import { cn } from "@/lib/utils";

export function BingoCard({
  ticketNum,
  cells,
  drawn,
  onToggle,
}: {
  key?: Key;
  ticketNum?: number;
  cells: Cell[];
  drawn: number[];
  onToggle?: (id: string) => void;
}) {
  const matchCount = cells.filter(
    (c) =>
      c.value !== "FREE" &&
      (c.marked || (typeof c.value === "number" && drawn.includes(c.value)))
  ).length;

  return (
    <div className="flex flex-col rounded-3xl border border-gold/40 bg-gradient-to-b from-card via-card/95 to-background p-2.5 shadow-lg shadow-gold/5 backdrop-blur-md transition-all">
      {ticketNum && (
        <div className="flex items-center justify-between pb-1.5 px-1 border-b border-border/40 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="grid h-5 px-1.5 place-items-center rounded-lg bg-gold/20 text-[10px] font-black text-gold border border-gold/30">
              #{ticketNum}
            </span>
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">
              Cartela
            </span>
          </div>

          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold text-emerald-400 border border-emerald-500/30">
            {matchCount}/24 Matched
          </span>
        </div>
      )}

      {/* B-I-N-G-O Columns Header */}
      <div className="grid grid-cols-5 gap-1 mb-1.5">
        {LETTERS.map((l, colIdx) => {
          const colors = [
            "text-sky-400 bg-sky-500/15 border-sky-500/30",
            "text-purple-400 bg-purple-500/15 border-purple-500/30",
            "text-amber-400 bg-amber-500/15 border-amber-500/30",
            "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
            "text-rose-400 bg-rose-500/15 border-rose-500/30",
          ];
          return (
            <div
              key={l}
              className={cn(
                "grid h-6 place-items-center rounded-xl border text-[11px] font-black tracking-wider uppercase shadow-xs",
                colors[colIdx]
              )}
            >
              {l}
            </div>
          );
        })}
      </div>

      {/* 5x5 Grid */}
      <div className="grid grid-cols-5 gap-1">
        {cells.map((cell) => {
          if (cell.value === "FREE") {
            return (
              <div
                key={cell.id}
                className="grid aspect-square place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-gold text-black shadow-glow-gold/30 font-black"
              >
                <Star className="h-4 w-4 fill-current animate-pulse" />
              </div>
            );
          }
          const isCalled = drawn.includes(cell.value as number);
          const isMarked = cell.marked || isCalled;
          return (
            <button
              key={cell.id}
              type="button"
              onClick={() => onToggle?.(cell.id || "")}
              className={cn(
                "relative grid aspect-square place-items-center rounded-xl border text-xs font-black tabular-nums transition-all active:scale-90",
                isMarked
                  ? "border-emerald-400 bg-gradient-to-br from-emerald-400 to-teal-500 text-black shadow-glow-gold font-black scale-[0.98]"
                  : "border-border/60 bg-secondary/80 text-foreground/90 hover:border-gold/50 hover:bg-secondary"
              )}
            >
              {cell.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
