import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Volume2,
  VolumeX,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Grid,
} from "lucide-react";
import { MasterBoard75 } from "@/components/phoenix/MasterBoard75";
import { BingoCard } from "@/components/phoenix/BingoCard";
import {
  generateBoardForTicket,
  buzz,
  letterFor,
  type Cell,
} from "@/lib/bingo";
import { isSoundMuted, setSoundMuted } from "@/lib/sound";

export function GameView({
  selectedTickets = [],
  globalCountdown,
  isGameStarted,
  drawn,
  ticketsData,
  toggleCell,
  prize = 0,
  totalRoomTickets = 0,
}: {
  selectedTickets?: number[];
  globalCountdown: number;
  isGameStarted: boolean;
  drawn: number[];
  won?: boolean;
  ticketsData: Record<number, Cell[]>;
  toggleCell: (ticketNum: number, cellId: string) => void;
  onNextRound?: () => void;
  prize?: number;
  totalRoomTickets?: number;
}) {
  const [muted, setMutedState] = useState<boolean>(isSoundMuted());
  const [showMasterBoard, setShowMasterBoard] = useState(false);

  const toggleMute = () => {
    buzz(10);
    const next = !muted;
    setSoundMuted(next);
    setMutedState(next);
  };

  const activeTickets = selectedTickets || [];
  const currentBall = drawn[0];

  // Tab state for tickets view: default "ALL" to see 4 in 1 view
  const [activeTicketTab, setActiveTicketTab] = useState<number | "ALL">("ALL");

  const getMatchCount = (ticketNum: number) => {
    const cells = ticketsData[ticketNum] || [];
    return cells.filter(
      (c) =>
        c.value !== "FREE" &&
        (c.marked || (typeof c.value === "number" && drawn.includes(c.value)))
    ).length;
  };

  return (
    <div className="mx-auto min-h-screen min-h-[100dvh] w-full max-w-3xl bg-background text-foreground overflow-x-hidden pb-28 flex flex-col">
      {/* Top Bar Header */}
      <div className="grid grid-cols-4 gap-1.5 p-2 bg-black/60 backdrop-blur-md border-b border-border/60 text-center">
        <div className="flex flex-col justify-center rounded-xl bg-secondary/80 p-1 border border-border/40">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">#ዙር (Round)</span>
          <span className="text-xs font-black text-foreground tabular-nums">#182323</span>
        </div>
        <div className="flex flex-col justify-center rounded-xl bg-secondary/80 p-1 border border-border/40">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
            {totalRoomTickets > 0 ? `${totalRoomTickets} ካርቴላ` : "መወራረጃ"}
          </span>
          <span className="text-xs font-black text-gold tabular-nums">10.00 ETB</span>
        </div>
        <div className="flex flex-col justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-1 shadow-glow-gold/10">
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">ጃክፖት (Prize)</span>
          <span className="text-xs font-black text-emerald-400 tabular-nums">
            {prize.toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col justify-center rounded-xl bg-secondary/80 p-1 border border-border/40">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">እጣ (Balls)</span>
          <span className="text-xs font-black text-foreground tabular-nums">{drawn.length}/75</span>
        </div>
      </div>

      {/* Drawn Balls Horizontal Strip */}
      <div className="flex items-center gap-2 px-3 py-2 bg-black/40 border-b border-border/40 overflow-x-auto scrollbar-none justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {drawn.map((n, idx) => (
            <div
              key={`${n}-${idx}`}
              className={`flex items-center gap-0.5 rounded-full border px-2.5 py-0.5 text-xs font-black shrink-0 transition-transform ${
                idx === 0
                  ? "border-emerald-400 bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-glow-gold font-black animate-pulse scale-105"
                  : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              }`}
            >
              <span>{letterFor(n)}-</span>
              <span>{n}</span>
            </div>
          ))}
          {drawn.length === 0 && (
            <span className="text-xs text-muted-foreground font-bold italic">
              {isGameStarted ? "ጨዋታው ተጀምሯል። እጣዎችን በመጠበቅ ላይ..." : "ጨዋታው አልተጀመረም።"}
            </span>
          )}
        </div>

        {/* Chime Sound Mute/Unmute toggle */}
        <button
          type="button"
          onClick={toggleMute}
          className="flex items-center gap-1 rounded-xl border border-border/80 bg-secondary px-2.5 py-1 text-xs font-black text-foreground active:scale-95 shadow-sm shrink-0"
          title={muted ? "ድምፅ ክፈት (Unmute)" : "ድምፅ ዝጋ (Mute)"}
        >
          {muted ? (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Volume2 className="h-4 w-4 text-emerald-400" />
          )}
        </button>
      </div>

      {/* Main Body: Pre-Game Waiting State vs Active Round State */}
      {!isGameStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto min-h-[420px]">
          {/* Centered Glowing Clock Ring */}
          <div className="relative mb-6 grid h-24 w-24 place-items-center rounded-full border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/40 to-background shadow-2xl shadow-gold/20">
            <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-ping opacity-40" />
            <Clock className="h-10 w-10 text-gold animate-pulse" />
          </div>

          <h2 className="text-xl font-black tracking-tight text-foreground mb-1.5">
            ጨዋታው ገና አልጀመረም።
          </h2>
          <p className="text-xs font-bold text-muted-foreground mb-6 max-w-[290px] leading-relaxed">
            የ45 ሰከንድ ጊዜ ሲያልቅ ጨዋታው በራስ-ሰር ይጀምራል።
          </p>

          {/* Countdown Display */}
          <div className="flex flex-col items-center gap-3 w-full max-w-[270px]">
            <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-xs font-black text-amber-400 w-full shadow-glow-gold/10">
              <span>እጣው የሚጀምረው በ:</span>
              <span className="text-base font-black text-gold tabular-nums">
                00:{globalCountdown < 10 ? `0${globalCountdown}` : globalCountdown}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Game Active Stage */
        <div className="flex flex-col gap-2 p-2.5 flex-1">
          {/* Latest Called Ball Sphere + Master Board Toggle */}
          <div className="flex flex-col gap-2 rounded-3xl border border-gold/40 bg-card/90 p-3 shadow-lg shadow-gold/5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              {/* Current Ball Sphere */}
              <div className="flex items-center gap-3">
                <div className="relative grid h-12 w-12 place-items-center rounded-full border-2 border-emerald-400 bg-gradient-to-br from-emerald-400 to-teal-600 text-black shadow-glow-gold animate-pulse">
                  {currentBall ? (
                    <span className="text-base font-black text-black tracking-tight">
                      {letterFor(currentBall)}-{currentBall}
                    </span>
                  ) : (
                    <span className="text-xs font-black text-muted-foreground">--</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">የመጨረሻው እጣ</span>
                  <span className="text-sm font-black text-emerald-400">
                    {currentBall ? `${letterFor(currentBall)} ${currentBall}` : "በመጠበቅ ላይ..."}
                  </span>
                </div>
              </div>

              {/* Master Board Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  buzz(8);
                  setShowMasterBoard(!showMasterBoard);
                }}
                className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-secondary px-3 py-2 text-[11px] font-black text-foreground hover:bg-secondary/80 transition-all active:scale-95 shadow-xs"
              >
                <Grid className="h-4 w-4 text-gold" />
                <span>የወጡ እጣዎች (75)</span>
                {showMasterBoard ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Collapsible 75-Number Master Board */}
            {showMasterBoard && (
              <div className="pt-2 border-t border-border/40 animate-number-in">
                <MasterBoard75 drawn={drawn} />
              </div>
            )}
          </div>

          {/* Section Title & Ticket Switcher Tabs */}
          <div className="flex items-center justify-between pt-1 px-1">
            <span className="text-xs font-black text-foreground uppercase tracking-wider">
              የእኔ ካርቴላዎች (My Cartelas)
            </span>
            <span className="text-[10px] font-black text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {activeTickets.length} Cards Active
            </span>
          </div>

          {activeTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center rounded-3xl border border-dashed border-border/80 bg-card/60 my-4 gap-2.5">
              <AlertCircle className="h-10 w-10 text-amber-400" />
              <h3 className="text-sm font-black text-foreground">ምንም ካርቴላ አልመረጡም (No Cartela Selected)</h3>
              <p className="text-xs font-bold text-muted-foreground max-w-[280px] leading-relaxed">
                በዚህ ዙር አልተሳተፉም። ጨዋታውን እንደ ተመልካች መከታተል ይችላሉ። እባክዎን ለቀጣዩ ዙር ይጠብቁ።
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-2xl bg-secondary/80 px-4 py-2.5 text-xs font-black text-amber-400 border border-amber-500/30">
                <Clock className="h-4 w-4 text-amber-400 animate-spin" />
                <span>ለቀጣዩ ዙር ይጠብቁ (Please Wait For Next Round)</span>
              </div>
            </div>
          ) : (
            <>
              {/* Quick Ticket Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => {
                    buzz(8);
                    setActiveTicketTab("ALL");
                  }}
                  className={cn(
                    "flex items-center gap-1 shrink-0 rounded-2xl px-3 py-1.5 text-xs font-black transition-all active:scale-95 border",
                    activeTicketTab === "ALL"
                      ? "border-amber-500 bg-amber-500/20 text-amber-400 shadow-glow-gold/10"
                      : "border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>ALL ({activeTickets.length} View)</span>
                </button>

                {activeTickets.map((num) => {
                  const isSelected = activeTicketTab === num;
                  const matches = getMatchCount(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        buzz(8);
                        setActiveTicketTab(num);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 shrink-0 rounded-2xl px-3 py-1.5 text-xs font-black transition-all active:scale-95 border",
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-glow-fire/10"
                          : "border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>#{num}</span>
                      {matches > 0 && (
                        <span className="rounded-full bg-emerald-500/30 px-1.5 py-0.2 text-[9px] font-black text-emerald-300">
                          {matches}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Cartelas Grid View */}
              <div className="flex-1 overflow-y-auto pr-0.5 scrollbar-none pb-4">
                {activeTicketTab === "ALL" ? (
                  /* 2x2 Grid Layout for Cartelas in 1 View */
                  <div className="grid grid-cols-2 gap-2">
                    {activeTickets.map((num) => (
                      <BingoCard
                        key={num}
                        ticketNum={num}
                        cells={ticketsData[num] || generateBoardForTicket(num)}
                        drawn={drawn}
                        onToggle={(cellId) => toggleCell(num, cellId)}
                      />
                    ))}
                  </div>
                ) : (
                  /* Single Big View for selected ticket */
                  <BingoCard
                    key={activeTicketTab}
                    ticketNum={activeTicketTab as number}
                    cells={
                      ticketsData[activeTicketTab as number] ||
                      generateBoardForTicket(activeTicketTab as number)
                    }
                    drawn={drawn}
                    onToggle={(cellId) =>
                      toggleCell(activeTicketTab as number, cellId)
                    }
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
