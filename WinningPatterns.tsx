import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatternDef {
  title: string;
  isLit: (r: number, c: number) => boolean;
}

const PATTERNS: PatternDef[] = [
  {
    title: "1. በአግድም (Horizontal)",
    isLit: (r, _c) => r === 2, // Middle horizontal row
  },
  {
    title: "2. ወደ ታች (Vertical)",
    isLit: (_r, c) => c === 2, // Middle vertical column
  },
  {
    title: "3. በማዕዘን (Diagonal)",
    isLit: (r, c) => r === c, // Diagonal line
  },
  {
    title: "4. አራቱ ጥግ (Corners)",
    isLit: (r, c) => (r === 0 || r === 4) && (c === 0 || c === 4), // 4 corners
  },
];

export function WinningPatterns() {
  return (
    <div className="rounded-3xl border border-sky-500/30 bg-gradient-to-b from-[#0d1527] via-[#09101f] to-[#060a14] p-4 text-white shadow-xl shadow-sky-950/40">
      {/* Header */}
      <div className="flex items-center gap-2 pb-1">
        <Trophy className="h-5 w-5 text-amber-400 shrink-0 fill-amber-400" />
        <h4 className="text-sm font-black text-sky-400 tracking-tight">
          ማሸነፊያ መንገዶች (Winning Patterns)
        </h4>
      </div>

      <p className="text-[11px] font-medium text-slate-300 leading-relaxed pt-1 pb-3">
        ከታች ባሉት አራት ቅርጾች መሰረት አምስት ቁጥሮችን ካገኙ <span className="font-bold text-sky-300">BINGO</span> ብለው ያሸንፋሉ::
      </p>

      {/* 2x2 Grid of 5x5 Pattern Boards */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {PATTERNS.map((pattern, pIdx) => (
          <div
            key={pIdx}
            className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/60 p-2.5 shadow-inner"
          >
            <p className="text-[11px] font-black text-slate-100 pb-2 text-center">
              {pattern.title}
            </p>

            {/* 5x5 Mini Grid */}
            <div className="grid grid-cols-5 gap-1 w-full max-w-[120px] aspect-square">
              {Array.from({ length: 5 }).map((_, row) =>
                Array.from({ length: 5 }).map((_, col) => {
                  const lit = pattern.isLit(row, col);
                  return (
                    <div
                      key={`${row}-${col}`}
                      className={cn(
                        "aspect-square rounded-md transition-all duration-300",
                        lit
                          ? "bg-emerald-400 shadow-[0_0_10px_#10b981] scale-95 border border-emerald-300"
                          : "bg-slate-800/80 border border-slate-700/40"
                      )}
                    />
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
