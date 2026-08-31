import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Trophy, Sparkles, CheckCircle, Clock } from "lucide-react";
import { useLang } from "@/lib/i18n";

export interface Winner {
  name: string;
  phone: string;
  ticket: number;
  amount: number;
  isUser?: boolean;
}

export function VictoryModal({
  open,
  prize,
  winners,
  onNextRound,
}: {
  open: boolean;
  prize: number;
  winners: Winner[];
  onNextRound: () => void;
}) {
  const { t } = useLang();
  const [secondsLeft, setSecondsLeft] = useState(4);

  const winner = winners[0];
  const isUserWinner = winner?.isUser ?? false;

  useEffect(() => {
    if (!open) {
      setSecondsLeft(4);
      return;
    }

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch {
      /* ignore confetti error */
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timer = setTimeout(() => {
      onNextRound();
    }, 3800);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [open, onNextRound]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-number-in">
      <div className="relative w-full max-w-[380px] overflow-hidden rounded-3xl border border-gold/60 bg-gradient-to-b from-card via-card/95 to-background p-6 text-center shadow-2xl shadow-gold/20">
        <div className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-gold/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl" />

        {/* Trophy icon */}
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-gold to-amber-500 text-black shadow-glow-gold animate-bounce">
          <Trophy className="h-8 w-8 stroke-[2.5]" />
        </div>

        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-gold">
          🎉 {isUserWinner ? "እንኳን ደስ አለዎት! (CONGRATULATIONS!)" : "አሸናፊ ተለይቷል! (WINNER ANNOUNCED!)"}
        </p>

        <h3 className="mt-1 text-2xl font-black text-foreground">
          {isUserWinner ? "ቢንጎ መትተዋል!" : "ቢንጎ ተመቷል!"}
        </h3>

        <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/10 p-3.5 shadow-inner">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            {t("totalPrize")}
          </p>
          <p className="mt-0.5 text-3xl font-black tabular-nums text-gold">
            {prize.toFixed(2)} <span className="text-xs font-black text-amber-300">ETB</span>
          </p>
          {isUserWinner && (
            <p className="mt-1 text-[10px] font-black text-emerald-400">
              ✅ ሽልማቱ ወደ ቦርሳዎ በነጥብ ተጨምሯል (Added to Wallet)
            </p>
          )}
        </div>

        {/* Winner Card details */}
        <div className="mt-4 space-y-2 text-left">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            የዚህ ዙር አሸናፊ (Round Winner):
          </p>

          {winners.map((w, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-2xl border border-border bg-secondary/80 p-3 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gold/20 text-gold border border-gold/30">
                  <CheckCircle className="h-4 w-4 text-gold" />
                </div>
                <div>
                  <p className="text-xs font-black text-foreground">
                    {w.name} {w.isUser && "(እርስዎ)"}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    ካርቴላ #{w.ticket} • {w.phone}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black tabular-nums text-emerald-400">
                +{w.amount.toFixed(2)} ETB
              </span>
            </div>
          ))}
        </div>

        {/* Automatic Progress Bar & Auto-transition indicator */}
        <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="flex items-center justify-between w-full text-xs font-black text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 animate-spin" />
              በራስ-ሰር ወደ ቀጣይ ዙር በመመለስ ላይ...
            </span>
            <span className="tabular-nums font-black">{secondsLeft}s</span>
          </div>
          
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-gold to-emerald-400 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${Math.max(0, (secondsLeft / 4) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
