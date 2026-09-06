import { Dispatch, SetStateAction } from "react";
import { Timer, Coins, Lock, Sparkles, Flame, Users } from "lucide-react";
import { AnnouncementBar } from "@/components/phoenix/AnnouncementBar";
import { WalletBar } from "@/components/phoenix/WalletBar";
import { LangToggle } from "@/components/phoenix/LangToggle";
import { TicketGrid } from "@/components/phoenix/TicketGrid";
import { LiveJackpotBubble } from "@/components/phoenix/LiveJackpotBubble";
import { MiniTicketCard } from "@/components/phoenix/MiniTicketCard";
import { useLang } from "@/lib/i18n";
import { buzz } from "@/lib/bingo";

const TOTAL_TICKETS = 550;
const MAX_SELECT = 4;
const STAKE = 10;

export function LobbyView({
  pendingTickets,
  setPendingTickets,
  onToggleTicket,
  takenTickets = [],
  mainWallet,
  playWallet,
  globalCountdown,
  isGameStarted,
  onNavigateWallet,
  announcementText,
  jackpot,
  totalRoomTickets,
}: {
  pendingTickets: number[];
  setPendingTickets: Dispatch<SetStateAction<number[]>>;
  onToggleTicket?: (n: number) => void;
  takenTickets?: number[];
  mainWallet: number;
  playWallet: number;
  globalCountdown: number;
  isGameStarted: boolean;
  onStartGame?: () => void;
  onNavigateWallet: () => void;
  announcementText?: string;
  jackpot: number;
  totalRoomTickets: number;
}) {
  const { t } = useLang();

  const toggle = (n: number) => {
    if (isGameStarted) return;
    if (onToggleTicket) {
      onToggleTicket(n);
    } else {
      buzz(10);
      setPendingTickets((prev) => {
        if (prev.includes(n)) return prev.filter((x) => x !== n);
        if (prev.length >= MAX_SELECT) return prev;
        return [...prev, n];
      });
    }
  };

  const mm = String(Math.floor(globalCountdown / 60)).padStart(2, "0");
  const ss = String(globalCountdown % 60).padStart(2, "0");

  return (
    <div className="mx-auto min-h-screen min-h-[100dvh] w-full max-w-2xl overflow-x-hidden pb-36">
      <AnnouncementBar text={announcementText} />
      <WalletBar play={playWallet} main={mainWallet} onNavigateWallet={onNavigateWallet} />

      <div className="flex items-center justify-end px-4 pt-3">
        <LangToggle />
      </div>

      {/* Main Real-Time Jackpot Hero Card */}
      <div className="mx-4 mt-3 relative overflow-hidden rounded-3xl border border-gold/60 bg-gradient-to-br from-amber-950/70 via-card to-background p-4 shadow-xl shadow-gold/15 backdrop-blur-md transition-all duration-300">
        {/* Glow ambient background rings */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gold/30 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative flex items-center justify-between border-b border-gold/25 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-gold text-black shadow-glow-gold">
              <Coins className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-gold flex items-center gap-1">
                <span>የቀጥታ ጃክፖት</span>
                <span className="text-[10px] text-amber-300 font-bold">(GRAND JACKPOT)</span>
              </span>
              <p className="text-[9px] font-bold text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="flex items-center gap-1 text-emerald-400 font-extrabold">
                  <Users className="h-3 w-3" />
                  {totalRoomTickets} ካርቴላ ተይዟል
                </span>
                <span>•</span>
                <span>10 ETB/ካርቴላ</span>
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-400 border border-emerald-500/40 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            ቀጥታ (LIVE)
          </span>
        </div>

        <div className="relative mt-3.5 flex items-baseline justify-between">
          <div>
            <p className="text-3xl font-black tabular-nums tracking-tight text-gold drop-shadow-md flex items-baseline gap-1">
              <span>{jackpot.toFixed(2)}</span>
              <span className="text-sm font-black text-amber-300">ETB</span>
            </p>
            <p className="text-[10px] font-extrabold text-emerald-400/90 mt-0.5 flex items-center gap-1">
              <Flame className="h-3 w-3 text-gold" />
              <span>ሰው ካርቴላ በያዘ ቁጥር +10 ETB ይጨምራል</span>
            </p>
          </div>

          <div className="flex flex-col items-end rounded-2xl border border-border/80 bg-black/70 px-3 py-1.5 text-right backdrop-blur-sm shadow-inner">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
              {isGameStarted ? "በሂደት ላይ" : "የሚጀምርበት ጊዜ"}
            </span>
            <span className="text-sm font-black text-primary tabular-nums flex items-center gap-1.5 mt-0.5">
              <Timer className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
              {isGameStarted || globalCountdown === 0 ? "ተጀምሯል!" : `${mm}:${ss}`}
            </span>
          </div>
        </div>
      </div>

      {isGameStarted && (
        <div className="mx-4 mt-3 flex items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs font-black text-amber-400 shadow-sm">
          <Lock className="h-4 w-4 shrink-0 text-amber-400" />
          <span>ጨዋታው በሂደት ላይ ስለሆነ ካርቴላ መምረጥ ተዘግቷል።</span>
        </div>
      )}

      {/* Cartela Selection Section Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 pt-5">
        <h2 className="flex min-w-0 items-center gap-1.5 truncate text-sm font-black text-foreground">
          <Coins className="h-4 w-4 shrink-0 text-gold" />
          {t("selectTickets")} ({STAKE} ETB)
        </h2>
        <span className="shrink-0 text-sm font-black tabular-nums">
          <span className="text-gold font-extrabold">{pendingTickets.length}</span>
          <span className="text-muted-foreground"> / {MAX_SELECT}</span>
        </span>
      </div>

      <TicketGrid
        total={TOTAL_TICKETS}
        taken={takenTickets}
        selected={pendingTickets}
        max={MAX_SELECT}
        disabled={isGameStarted}
        onToggle={toggle}
      />

      {/* Selected Tickets Display Area */}
      {pendingTickets.length > 0 ? (
        <div className="mx-4 mt-3 animate-number-in flex flex-col gap-2 rounded-2xl border border-gold/40 bg-gold/10 p-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-gold/20 pb-2">
            <span className="text-xs font-black text-gold">
              የተመረጡ ካርቴላዎች ({pendingTickets.length} / {MAX_SELECT}):
            </span>
            <span className="text-xs font-black text-emerald-400">
              {(pendingTickets.length * STAKE).toFixed(2)} ETB
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {pendingTickets.map((ticketNum) => (
              <MiniTicketCard
                key={ticketNum}
                ticketNum={ticketNum}
                onRemove={() => toggle(ticketNum)}
              />
            ))}
          </div>
          <p className="text-[10px] text-center text-muted-foreground font-bold">
            ✨ ጨዋታው ሲጀምር የተመረጡት {pendingTickets.length} ካርቴላዎች በራስ-ሰር ይጫወታሉ። (ከ 4 በላይ መምረጥ አይቻልም)
          </p>
        </div>
      ) : (
        <div className="mx-4 mt-3 flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/40 px-3.5 py-2.5 text-xs font-bold text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-gold" />
            <span>0 ካርቴላ ተመርጧል። ለመጫወት እስከ 4 ካርቴላ ከላይ ይምረጡ።</span>
          </div>
        </div>
      )}

      <LiveJackpotBubble amount={jackpot} totalTickets={totalRoomTickets} />
    </div>
  );
}
