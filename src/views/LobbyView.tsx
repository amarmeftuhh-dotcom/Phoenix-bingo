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
  waitingForPlayers = false,
  onNavigateWallet,
  announcementText,
  jackpot,
  totalRoomTickets,
  onClaimBonus,
}: {
  pendingTickets: number[];
  setPendingTickets: Dispatch<SetStateAction<number[]>>;
  onToggleTicket?: (n: number) => void;
  takenTickets?: number[];
  mainWallet: number;
  playWallet: number;
  globalCountdown: number;
  isGameStarted: boolean;
  waitingForPlayers?: boolean;
  onStartGame?: () => void;
  onNavigateWallet: () => void;
  announcementText?: string;
  jackpot: number;
  totalRoomTickets: number;
  onClaimBonus?: () => void;
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

  const totalBalance = mainWallet + playWallet;
  const isBalanceZero = totalBalance <= 0;

  return (
    <div className="flex flex-col pb-24 text-foreground selection:bg-gold/30">
      {/* 1. Header Toolbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/80 bg-background/95 px-3 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-gold via-amber-500 to-amber-700 shadow-md">
            <span className="text-base font-black text-black">P</span>
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-tight text-foreground">
                PHOENIX BINGO
              </h1>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-black text-emerald-400">
                LIVE
              </span>
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground">
              ኢትዮጵያ የቀጥታ ቢንጎ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <LiveJackpotBubble amount={jackpot} />
          <LangToggle />
        </div>
      </header>

      {/* 2. Audio Broadcast Announcement */}
      <AnnouncementBar text={announcementText} />

      {/* 3. Wallet Balance Overview */}
      <div className="px-3 pt-2">
        <WalletBar
          main={mainWallet}
          play={playWallet}
          onNavigateWallet={onNavigateWallet}
        />
      </div>

      {/* Free 15 ETB Welcome Bonus Claim Banner (If balance is zero) */}
      {isBalanceZero && onClaimBonus && (
        <div className="mx-3 mt-2.5 overflow-hidden rounded-2xl border border-gold/50 bg-gradient-to-r from-amber-500/25 via-gold/20 to-amber-600/25 p-3 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold text-black shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black text-gold">የ 15.00 ETB መጫወቻ ቦነስ ይውሰዱ!</p>
                <p className="text-[10px] font-bold text-muted-foreground">
                  አዲስ ተጠቃሚ ስለሆኑ ያለምንም ክፍያ አሁኑኑ መጫወት ይችላሉ።
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClaimBonus}
              className="shrink-0 rounded-xl bg-gold px-3 py-1.5 text-xs font-black text-black shadow-md transition-transform active:scale-95 hover:brightness-110"
            >
              ቦነስ ውሰድ
            </button>
          </div>
        </div>
      )}

      {/* 4. Live Round Jackpot Card & Timer */}
      <div className="relative mx-3 mt-2.5 overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-amber-950/40 via-card to-background p-4 shadow-xl">
        <div className="absolute top-0 right-0 h-28 w-28 rounded-full bg-gold/10 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              የቀጥታ ዙር ጃክፖት
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/80 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
            <Users className="h-3 w-3 text-gold" />
            <span>{totalRoomTickets} ካርቴላ ተይዟል</span>
          </div>
        </div>

        <div className="relative mt-3.5 flex items-baseline justify-between">
          <div>
            <p className="text-3xl font-black tabular-nums tracking-tight text-gold drop-shadow-md flex items-baseline gap-1">
              <span>{jackpot.toFixed(2)}</span>
              <span className="text-sm font-black text-amber-300">ETB</span>
            </p>
            <p className="text-[10px] font-extrabold text-emerald-400/90 mt-0.5 flex items-center gap-1">
              <Flame className="h-3 w-3 text-gold" />
              <span>{totalRoomTickets === 0 ? "ካርቴላ ይምረጡና ጨዋታውን ይጀምሩ (+10 ETB)" : "ሰው ካርቴላ በያዘ ቁጥር +10 ETB ይጨምራል"}</span>
            </p>
          </div>

          <div className="flex flex-col items-end rounded-2xl border border-border/80 bg-black/70 px-3 py-1.5 text-right backdrop-blur-sm shadow-inner">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
              {isGameStarted
                ? "በሂደት ላይ"
                : waitingForPlayers
                ? "ተጋጣሚ በመጠበቅ ላይ"
                : totalRoomTickets === 0
                ? "የሚቀጥለው ዙር"
                : "የሚጀምርበት ጊዜ"}
            </span>
            <span className="text-sm font-black text-primary tabular-nums flex items-center gap-1.5 mt-0.5">
              <Timer className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
              {isGameStarted
                ? "ተጀምሯል!"
                : waitingForPlayers
                ? "ቢያንስ 2 ተጫዋች"
                : `${mm}:${ss}`}
            </span>
          </div>
        </div>
      </div>

      {waitingForPlayers && (
        <div className="mx-3 mt-2.5 flex items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs font-black text-amber-400 shadow-sm animate-pulse">
          <Users className="h-4 w-4 shrink-0 text-amber-400" />
          <span>ጨዋታው ለመጀመር ቢያንስ 2 ተጫዋች (ወይም ቦቶች) ያስፈልጋል። ሌላ ተጫዋች በመጠበቅ ላይ...</span>
        </div>
      )}

      {isGameStarted && (
        <div className="mx-3 mt-2.5 flex items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs font-black text-amber-400 shadow-sm">
          <Lock className="h-4 w-4 shrink-0 text-amber-400" />
          <span>ጨዋታው በሂደት ላይ ስለሆነ ካርቴላ መምረጥ ተዘግቷል።</span>
        </div>
      )}

      {/* Cartela Selection Section Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 pt-4">
        <h2 className="flex min-w-0 items-center gap-1.5 truncate text-sm font-black text-foreground">
          <Coins className="h-4 w-4 shrink-0 text-gold" />
          <span className="truncate">ካርቴላ ይምረጡ (1 - {TOTAL_TICKETS})</span>
        </h2>
        <span className="shrink-0 rounded-full border border-border/80 bg-secondary px-2 py-0.5 text-[11px] font-black tabular-nums text-muted-foreground whitespace-nowrap">
          የመረጡት: {pendingTickets.length} / {MAX_SELECT}
        </span>
      </div>

      {/* Full Page Ticket Selection Grid */}
      <TicketGrid
        total={TOTAL_TICKETS}
        taken={takenTickets}
        selected={pendingTickets}
        max={MAX_SELECT}
        disabled={isGameStarted}
        onToggle={toggle}
      />

      {/* Selected Tickets Mini Preview Bar */}
      {pendingTickets.length > 0 && (
        <div className="mt-3 px-3">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-bold text-muted-foreground">
              የተመረጡ ካርቴላዎች ቅድመ-ዕይታ (ቅነሳ፡ {pendingTickets.length * STAKE} ETB)
            </span>
            <button
              type="button"
              onClick={() => {
                buzz(15);
                setPendingTickets([]);
              }}
              className="text-[11px] font-black text-destructive hover:underline"
            >
              ሁሉንም መልስ (Refund)
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pendingTickets.map((num) => (
              <MiniTicketCard
                key={num}
                ticketNum={num}
                onRemove={() => toggle(num)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
