import { useState, useMemo } from "react";
import { Sparkles, Search, CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { buzz } from "@/lib/bingo";

export function TicketGrid({
  total = 550,
  taken,
  selected,
  max,
  disabled = false,
  onToggle,
}: {
  total?: number;
  taken: number[];
  selected: number[];
  max: number;
  disabled?: boolean;
  onToggle: (ticketNum: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeRange, setActiveRange] = useState<string>("ALL");

  const ranges = [
    { label: "ሁሉም (All 550)", val: "ALL", min: 1, max: 550 },
    { label: "1 - 100", val: "1-100", min: 1, max: 100 },
    { label: "101 - 200", val: "101-200", min: 101, max: 200 },
    { label: "201 - 300", val: "201-300", min: 201, max: 300 },
    { label: "301 - 400", val: "301-400", min: 301, max: 400 },
    { label: "401 - 550", val: "401-550", min: 401, max: 550 },
  ];

  const filteredTickets = useMemo(() => {
    let list = Array.from({ length: total }, (_, i) => i + 1);

    if (activeRange !== "ALL") {
      const selectedRange = ranges.find((r) => r.val === activeRange);
      if (selectedRange) {
        list = list.filter((n) => n >= selectedRange.min && n <= selectedRange.max);
      }
    }

    if (!search.trim()) return list;
    return list.filter((n) => String(n).includes(search.trim()));
  }, [total, search, activeRange]);

  const autoPickOne = () => {
    buzz([8, 20, 8]);
    const available = Array.from({ length: total }, (_, i) => i + 1).filter(
      (n) => !taken.includes(n) && !selected.includes(n)
    );
    if (available.length === 0) return;
    const randomTicket = available[Math.floor(Math.random() * available.length)];
    if (randomTicket) onToggle(randomTicket);
  };

  const autoPickFour = () => {
    buzz([12, 30, 20]);
    const available = Array.from({ length: total }, (_, i) => i + 1).filter(
      (n) => !taken.includes(n) && !selected.includes(n)
    );
    const needed = max - selected.length;
    if (needed <= 0 || available.length === 0) return;

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const toPick = shuffled.slice(0, needed);
    toPick.forEach((ticketNum) => onToggle(ticketNum));
  };

  return (
    <div className="w-full px-2 sm:px-4 pt-2">
      {/* Range Quick Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {ranges.map((r) => (
          <button
            key={r.val}
            type="button"
            onClick={() => {
              buzz(8);
              setActiveRange(r.val);
            }}
            className={cn(
              "shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-black tracking-wider transition-all active:scale-95",
              activeRange === r.val
                ? "bg-gold text-black shadow-xs font-black ring-1 ring-gold/40"
                : "border border-border/80 bg-secondary/60 text-muted-foreground hover:text-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Action Controls Bar */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ካርቴላ ቁጥር ፈልግ... (1 - 550)"
            className="min-h-10 w-full rounded-xl border border-border/80 bg-secondary/70 pl-8 pr-3 text-xs font-bold tabular-nums text-foreground outline-none placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={autoPickOne}
          disabled={disabled || selected.length >= max}
          className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-border/80 bg-secondary px-3 text-xs font-black text-foreground hover:bg-secondary/80 active:scale-95 disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          <span>+1 ምረጥ</span>
        </button>

        <button
          type="button"
          onClick={autoPickFour}
          disabled={disabled || selected.length >= max}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-gold/60 bg-gradient-to-r from-amber-500/25 via-gold/25 to-amber-500/25 px-3.5 text-xs font-black uppercase tracking-wider text-gold shadow-glow-gold/15 active:scale-95 disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5 text-gold animate-pulse" />
          <span>Quick 4</span>
        </button>
      </div>

      {/* Seamless Full-Screen Ticket Grid */}
      <div className="w-full rounded-2xl border border-border/80 bg-black/60 p-2 sm:p-2.5 shadow-2xl">
        <div
          className={cn(
            "grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5 max-h-[60vh] sm:max-h-[65vh] overflow-y-auto pr-0.5 scrollbar-none",
            disabled && "opacity-60 pointer-events-none"
          )}
        >
          {filteredTickets.map((n) => {
            const isTaken = taken.includes(n);
            const isSelected = selected.includes(n);

            return (
              <button
                key={n}
                type="button"
                disabled={disabled || isTaken}
                onClick={() => onToggle(n)}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-[11px] font-black tabular-nums transition-all active:scale-90",
                  isTaken || disabled
                    ? "border-transparent bg-secondary/15 text-muted-foreground/30 line-through cursor-not-allowed"
                    : isSelected
                    ? "border-gold bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-black shadow-glow-gold font-black scale-105 z-10 ring-2 ring-gold/60"
                    : "border-border/60 bg-secondary/80 text-foreground/90 hover:border-gold/50 hover:bg-secondary active:border-gold"
                )}
              >
                <span>{n}</span>
                {isSelected && (
                  <CheckCircle2 className="absolute top-0.5 right-0.5 h-2.5 w-2.5 text-black stroke-[3]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
