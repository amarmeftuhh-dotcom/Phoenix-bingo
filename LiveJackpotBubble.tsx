import { Flame } from "lucide-react";

export function LiveJackpotBubble({
  amount,
  totalTickets,
}: {
  amount: number;
  totalTickets?: number;
}) {
  return (
    <div className="mx-4 mt-3 flex items-center justify-between rounded-2xl border border-gold/50 bg-gold/10 p-3 shadow-glow-gold/20 transition-all duration-300">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-gold-grad text-gold-foreground shadow-glow-gold">
          <Flame className="h-4 w-4 animate-bounce" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <span>የቀጥታ ጃክፖት (Live Pool)</span>
            {totalTickets !== undefined && (
              <span className="text-amber-400/90 font-black">• {totalTickets} ካርቴላ</span>
            )}
          </p>
          <p className="text-base font-black text-gold tabular-nums tracking-tight">
            {amount.toFixed(2)} <span className="text-[10px] font-bold text-amber-300">ETB</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-fire/20 px-2.5 py-1 border border-fire/30">
        <span className="h-2 w-2 rounded-full bg-fire animate-ping" />
        <span className="text-[10px] font-black uppercase tracking-wider text-fire">
          +10 ETB/ካርቴላ
        </span>
      </div>
    </div>
  );
}
