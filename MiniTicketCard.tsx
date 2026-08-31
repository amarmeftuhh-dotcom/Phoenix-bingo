import type { Key } from "react";
import { generateBoardForTicket, LETTERS } from "@/lib/bingo";
import { Star } from "lucide-react";

export function MiniTicketCard({
  ticketNum,
  drawn = [],
  onRemove,
}: {
  key?: Key;
  ticketNum: number;
  drawn?: number[];
  onRemove?: () => void;
}) {
  const cells = generateBoardForTicket(ticketNum);

  return (
    <div className="relative flex flex-col rounded-xl border border-emerald-500/50 bg-background/90 p-1.5 shadow-sm min-w-[130px] max-w-[150px]">
      <div className="flex items-center justify-between pb-1 px-0.5 border-b border-border/50">
        <span className="text-[10px] font-black text-emerald-400">#{ticketNum}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] font-bold text-muted-foreground hover:text-destructive"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-0.5 mt-1 text-center font-mono">
        {LETTERS.map((l) => (
          <div key={l} className="text-[8px] font-black text-amber-400">
            {l}
          </div>
        ))}
        {cells.map((cell) => {
          if (cell.value === "FREE") {
            return (
              <div
                key={cell.id}
                className="grid aspect-square place-items-center bg-amber-500 text-black rounded-[2px]"
              >
                <Star className="h-2 w-2 fill-current" />
              </div>
            );
          }
          const isDrawn = drawn.includes(cell.value);
          return (
            <div
              key={cell.id}
              className={`grid aspect-square place-items-center rounded-[2px] text-[8px] font-bold ${
                isDrawn
                  ? "bg-emerald-500 text-black font-extrabold"
                  : "bg-secondary/60 text-foreground/80"
              }`}
            >
              {cell.value}
            </div>
          );
        })}
      </div>
    </div>
  );
}
