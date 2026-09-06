import { useState } from "react";
import { Trophy, Crown, Medal, Award, Sparkles, TrendingUp, ShieldCheck } from "lucide-react";
import { LangToggle } from "@/components/phoenix/LangToggle";
import { useLang } from "@/lib/i18n";
import { buzz } from "@/lib/bingo";
import { cn } from "@/lib/utils";

interface Player {
  rank: number;
  name: string;
  phone: string;
  wins: number;
  prize: number;
  isUser?: boolean;
  avatarBg?: string;
}

const TOP_PLAYERS: Player[] = [
  { rank: 1, name: "Makin_99", phone: "0911****12", wins: 48, prize: 18450, avatarBg: "from-amber-400 to-yellow-600" },
  { rank: 2, name: "Abebe_B", phone: "0922****44", wins: 41, prize: 15200, avatarBg: "from-slate-300 to-slate-500" },
  { rank: 3, name: "Selam_K", phone: "0912****89", wins: 37, prize: 13900, avatarBg: "from-amber-700 to-amber-900" },
  { rank: 4, name: "Amar (You)", phone: "0932****38", wins: 31, prize: 11250, isUser: true, avatarBg: "from-primary to-orange-600" },
  { rank: 5, name: "Tewodros_X", phone: "0944****01", wins: 29, prize: 9800 },
  { rank: 6, name: "Hiwot_T", phone: "0910****55", wins: 26, prize: 8400 },
  { rank: 7, name: "Beni_Bingo", phone: "0930****22", wins: 22, prize: 7100 },
  { rank: 8, name: "Eyerus_M", phone: "0913****77", wins: 19, prize: 5900 },
  { rank: 9, name: "Kaleb_G", phone: "0921****33", wins: 17, prize: 4800 },
  { rank: 10, name: "Dawi_99", phone: "0915****66", wins: 15, prize: 4100 },
];

export function RankView() {
  const { t } = useLang();
  const [timeframe, setTimeframe] = useState<"week" | "month" | "all">("week");

  const first = TOP_PLAYERS[0]!;
  const second = TOP_PLAYERS[1]!;
  const third = TOP_PLAYERS[2]!;

  return (
    <div className="mx-auto min-h-screen min-h-[100dvh] w-full max-w-2xl overflow-x-hidden pb-32">
      {/* Top Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pt-5">
        <div>
          <h1 className="truncate text-xl font-black tracking-tight text-fire">
            {t("rank")}
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Phoenix Bingo Leaderboard
          </p>
        </div>
        <LangToggle />
      </div>

      {/* Timeframe Switcher Tabs */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border/80 bg-secondary/50 p-1 shadow-inner">
          {(
            [
              { id: "week", label: t("thisWeek") },
              { id: "month", label: "This Month" },
              { id: "all", label: "All Time" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                buzz(8);
                setTimeframe(tab.id);
              }}
              className={cn(
                "rounded-xl py-2 text-xs font-black transition-all active:scale-95 border",
                timeframe === tab.id
                  ? "border-amber-500 bg-amber-500/20 text-amber-400 shadow-glow-gold/10"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Podium Showcase (Top 3 Players) */}
      <div className="px-4 pt-5">
        <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-b from-amber-950/40 via-card to-background p-4 shadow-glow-gold/10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold/20 blur-3xl" />

          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <span className="flex items-center gap-1.5 text-xs font-black text-gold uppercase tracking-wider">
              <Trophy className="h-4 w-4 text-gold" />
              {t("leaderboard")} Podium
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-3 w-3" />
              Verified Payouts
            </span>
          </div>

          <div className="mt-4 flex items-end justify-center gap-2 pt-2">
            {/* 2nd Place */}
            <div className="flex flex-1 flex-col items-center">
              <div className="relative">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 p-0.5 shadow-md">
                  <div className="grid h-full w-full place-items-center rounded-[14px] bg-background font-black text-xs text-foreground">
                    2nd
                  </div>
                </div>
                <div className="absolute -top-2 -right-1 grid h-5 w-5 place-items-center rounded-full bg-slate-300 text-[10px] font-black text-black">
                  🥈
                </div>
              </div>
              <p className="mt-2 text-xs font-black text-foreground truncate max-w-[80px]">
                {second.name}
              </p>
              <p className="text-[10px] font-black text-slate-300 tabular-nums">
                {second.prize.toLocaleString()} ETB
              </p>
              <div className="mt-2 h-16 w-full rounded-t-2xl border-t border-slate-400/40 bg-slate-400/10 flex items-center justify-center font-black text-xs text-slate-400">
                #2
              </div>
            </div>

            {/* 1st Place (Center Champion) */}
            <div className="flex flex-1 flex-col items-center">
              <div className="relative">
                <Crown className="absolute -top-5 left-1/2 -translate-x-1/2 h-6 w-6 text-gold animate-bounce" />
                <div className="grid h-15 w-15 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-gold to-yellow-600 p-0.5 shadow-glow-gold">
                  <div className="grid h-full w-full place-items-center rounded-[14px] bg-background font-black text-sm text-gold">
                    1st
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs font-black text-gold truncate max-w-[90px]">
                {first.name}
              </p>
              <p className="text-[11px] font-black text-amber-300 tabular-nums">
                {first.prize.toLocaleString()} ETB
              </p>
              <div className="mt-2 h-22 w-full rounded-t-2xl border-t-2 border-gold bg-gold/20 flex flex-col items-center justify-center font-black text-sm text-gold shadow-glow-gold/20">
                <Sparkles className="h-4 w-4 text-gold mb-0.5 animate-pulse" />
                #1
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-1 flex-col items-center">
              <div className="relative">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 p-0.5 shadow-md">
                  <div className="grid h-full w-full place-items-center rounded-[14px] bg-background font-black text-xs text-foreground">
                    3rd
                  </div>
                </div>
                <div className="absolute -top-2 -right-1 grid h-5 w-5 place-items-center rounded-full bg-amber-700 text-[10px] font-black text-white">
                  🥉
                </div>
              </div>
              <p className="mt-2 text-xs font-black text-foreground truncate max-w-[80px]">
                {third.name}
              </p>
              <p className="text-[10px] font-black text-amber-500 tabular-nums">
                {third.prize.toLocaleString()} ETB
              </p>
              <div className="mt-2 h-12 w-full rounded-t-2xl border-t border-amber-700/40 bg-amber-700/10 flex items-center justify-center font-black text-xs text-amber-600">
                #3
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User's Current Position Banner */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between rounded-2xl border border-primary/60 bg-primary/10 p-3.5 shadow-glow-fire/10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-fire text-black font-black text-sm shadow-glow-fire">
              #4
            </div>
            <div>
              <p className="text-xs font-black text-primary">Your Current Rank</p>
              <p className="text-[10px] font-bold text-muted-foreground">
                31 Wins • 11,250 ETB Total Earned
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-black text-gold">
            <TrendingUp className="h-4 w-4" />
            +2,650 to #3
          </div>
        </div>
      </div>

      {/* Full Leaderboard List */}
      <div className="px-4 pt-4 space-y-2">
        {TOP_PLAYERS.map((p) => (
          <div
            key={p.rank}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-3 transition-all",
              p.isUser
                ? "border-primary/80 bg-primary/10 shadow-glow-fire/10"
                : p.rank === 1
                ? "border-gold/50 bg-gold/10 shadow-glow-gold/10"
                : "border-border/80 bg-surface-grad"
            )}
          >
            {/* Rank Badge */}
            <div
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-black tabular-nums",
                p.rank === 1
                  ? "bg-gold text-black"
                  : p.rank === 2
                  ? "bg-slate-300 text-black"
                  : p.rank === 3
                  ? "bg-amber-700 text-white"
                  : "bg-secondary/80 text-muted-foreground"
              )}
            >
              {p.rank === 1 ? (
                <Crown className="h-4 w-4" />
              ) : p.rank === 2 ? (
                <Medal className="h-4 w-4" />
              ) : p.rank === 3 ? (
                <Award className="h-4 w-4" />
              ) : (
                `#${p.rank}`
              )}
            </div>

            {/* Avatar & Player Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p
                  className={cn(
                    "truncate text-xs font-black",
                    p.isUser ? "text-primary" : "text-foreground"
                  )}
                >
                  {p.name}
                </p>
                {p.isUser && (
                  <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[8px] font-black text-primary border border-primary/30">
                    YOU
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground">
                {p.phone} • {p.wins} {t("wins")}
              </p>
            </div>

            {/* Total Prize Won */}
            <div className="text-right shrink-0">
              <p className="text-xs font-black tabular-nums text-gold">
                {p.prize.toLocaleString()} <span className="text-[9px]">ETB</span>
              </p>
              <p className="text-[9px] font-bold text-emerald-400">
                Prizes Claimed
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
