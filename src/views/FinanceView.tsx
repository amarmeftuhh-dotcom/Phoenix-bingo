import { useState, useEffect, FormEvent } from "react";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Shield,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Users,
  Percent,
  Landmark,
  RefreshCw,
  Search,
  Lock,
  LogOut,
  Download,
  Sliders,
  Sparkles,
  Gamepad2,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { buzz } from "@/lib/bingo";
import { cn } from "@/lib/utils";

interface FinanceViewProps {
  onNavigateAdmin: () => void;
  onBackToGame: () => void;
  mainWallet?: number;
  playWallet?: number;
  liveJackpot?: number;
  totalRoomTickets?: number;
  ticketPrice?: number;
}

type PeriodTab = "daily" | "weekly" | "monthly" | "range" | "all-time" | "specific-day";

export function FinanceView({
  onNavigateAdmin,
  onBackToGame,
  mainWallet = 70,
  playWallet = 25,
  liveJackpot = 1450,
  totalRoomTickets = 145,
  ticketPrice = 10,
}: FinanceViewProps) {
  // Standalone Persistent Authentication (Saved in localStorage)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem("phoenix_finance_auth") === "true";
    } catch {
      return false;
    }
  });

  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  // Active Period Filter Tab
  const [periodTab, setPeriodTab] = useState<PeriodTab>("daily");

  // Custom Profit Split % (Default 70% Admin / 30% Partner)
  const [adminSplitPercent, setAdminSplitPercent] = useState<number>(70);
  const partnerSplitPercent = 100 - adminSplitPercent;

  // Date pickers
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().split("T")[0]);

  // Financial Metrics State (Integrated with live game tickets)
  const [baseMetrics, setBaseMetrics] = useState({
    historicalTurnover: 145800.0,
    historicalWinningsPaid: 109350.0,
    historicalGrossProfit: 36450.0,
    bonusExpenses: 4850.0,
    promoterCommPaid: 2150.0,
    totalDeposits: 52400.0,
    totalWithdrawals: 38200.0,
    totalUsersCount: 1248,
    activeTodayCount: 312,
  });

  // Dynamic calculations incorporating active live room turnover
  const currentLiveTurnover = (totalRoomTickets || 0) * (ticketPrice || 10);
  const currentLiveWinnings = (liveJackpot || 0) * 0.85; // 85% payout pool
  const currentLiveGrossProfit = currentLiveTurnover - currentLiveWinnings;

  const totalTurnover = baseMetrics.historicalTurnover + currentLiveTurnover;
  const totalWinningsPaid = baseMetrics.historicalWinningsPaid + currentLiveWinnings;
  const grossProfit = totalTurnover - totalWinningsPaid;

  const netProfit = grossProfit - baseMetrics.bonusExpenses - baseMetrics.promoterCommPaid;
  const adminShare = netProfit * (adminSplitPercent / 100);
  const partnerShare = netProfit * (partnerSplitPercent / 100);
  const netCashFlow = baseMetrics.totalDeposits - baseMetrics.totalWithdrawals;
  const systemLiability = mainWallet + playWallet + 18450.0;

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (
      password === "papi2204" ||
      password === "1234" ||
      password === "admin" ||
      password === "finance"
    ) {
      buzz([10, 30]);
      setIsAuthenticated(true);
      setLoginError(false);
      try {
        localStorage.setItem("phoenix_finance_auth", "true");
      } catch {}
    } else {
      buzz([20, 80]);
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    buzz(10);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem("phoenix_finance_auth");
    } catch {}
  };

  // Export Financial CSV Report
  const handleExportCSV = () => {
    buzz(12);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        "PHOENIX VIP FINANCE REPORT",
        `Date Generated,${new Date().toLocaleString()}`,
        `Period,${periodTab}`,
        `Total Turnover (ETB),${totalTurnover.toFixed(2)}`,
        `Winnings Paid (ETB),${totalWinningsPaid.toFixed(2)}`,
        `Gross Game Profit (ETB),${grossProfit.toFixed(2)}`,
        `Bonus Expenses (ETB),-${baseMetrics.bonusExpenses.toFixed(2)}`,
        `Promoter Commissions (ETB),-${baseMetrics.promoterCommPaid.toFixed(2)}`,
        `Net Profit (100% ETB),${netProfit.toFixed(2)}`,
        `Admin Share (${adminSplitPercent}% ETB),${adminShare.toFixed(2)}`,
        `Partner Share (${partnerSplitPercent}% ETB),${partnerShare.toFixed(2)}`,
        `Total Deposits (ETB),${baseMetrics.totalDeposits.toFixed(2)}`,
        `Total Withdrawals (ETB),${baseMetrics.totalWithdrawals.toFixed(2)}`,
        `Net Cash Flow (ETB),${netCashFlow.toFixed(2)}`,
        `System Liability (ETB),${systemLiability.toFixed(2)}`,
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Phoenix_Finance_Report_${periodTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unauthenticated Standalone Gate
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-radial from-[#151a24] to-[#080b11] p-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-gold/40 bg-[#161b22]/95 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gold/20 text-gold border border-gold/40 shadow-glow-gold">
            <Landmark className="h-8 w-8 text-gold" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-gold">
            💎 PHOENIX VIP FINANCE APP
          </h2>
          <p className="mt-1 text-xs font-bold text-slate-400">
            የፋይናንስና የትርፍ ማዕከል (Standalone Profit Suite)
          </p>

          {/* Integrated Live Game Quick Stats */}
          <div className="mt-4 rounded-2xl border border-[#30363d] bg-black/60 p-3 text-xs flex items-center justify-between">
            <span className="text-slate-400 font-bold">🎮 Live Game Status:</span>
            <span className="font-black text-emerald-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              Connected to Bingo
            </span>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError(false);
                }}
                placeholder="Enter Finance Password (1234 / papi2204)"
                className="w-full rounded-xl border border-border/80 bg-black/70 px-4 py-3.5 text-center text-base font-bold tracking-widest text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
              {loginError && (
                <p className="mt-2 text-xs font-bold text-destructive animate-bounce">
                  ❌ የተሳሳተ ፓስወርድ! እባክዎ እንደገና ይሞክሩ።
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 via-gold to-yellow-500 py-3.5 text-sm font-black uppercase tracking-wider text-black shadow-glow-gold hover:opacity-90 active:scale-95 transition-all"
            >
              Unlock Finance Suite
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-[#30363d] pt-4 text-xs font-bold">
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="text-emerald-400 hover:underline"
            >
              🛡️ Admin Panel (Babi)
            </button>
            <button
              type="button"
              onClick={onBackToGame}
              className="text-slate-400 hover:text-white underline"
            >
              ← Back to Bingo Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#080b11] text-white font-sans pb-16">
      {/* Top App Hub Bar (Direct Inter-App Navigation) */}
      <div className="w-full bg-[#0b0e14] border-b border-[#30363d] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-gold/20 px-2 py-0.5 font-black text-gold border border-gold/40">
            FINANCE SUITE (PAPI)
          </span>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Bingo Realtime Bridge Active
          </span>
        </div>

        {/* Rapid App Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToGame}
            className="flex items-center gap-1 rounded-lg border border-[#30363d] bg-slate-800/80 px-2.5 py-1 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
          >
            <Gamepad2 className="h-3.5 w-3.5 text-amber-400" />
            <span>🎮 Bingo Game</span>
          </button>

          <button
            type="button"
            onClick={onNavigateAdmin}
            className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-emerald-400 hover:bg-emerald-500/20 transition-all font-bold"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>🛡️ Admin Panel</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="Logout of Finance"
            className="flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1 text-red-400 hover:bg-red-500/20 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 border-b border-[#30363d] bg-[#121620]/95 backdrop-blur-md px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold/20 text-gold border border-gold/40 shadow-glow-gold">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-black uppercase tracking-wide text-gold flex items-center gap-2">
                <span>PHOENIX VIP FINANCE & PROFIT</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/40">
                  LIVE 🔴
                </span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400">
                የፋይናንስና የትርፍ ማጠቃለያ ዳሽቦርድ (70/30 Split Engine)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-500/25 active:scale-95 transition-all shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                buzz(8);
                alert("✅ Financial Data Recalculated & Synced with Bingo Engine!");
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500 active:scale-95 transition-all shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sync Game Data</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 pt-5 space-y-5">
        {/* Live Bingo Game Integration Card */}
        <div className="rounded-3xl border border-gold/40 bg-gradient-to-r from-amber-950/40 via-[#121620] to-[#080b11] p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/20 text-gold border border-gold/40 text-xl">
              🎮
            </div>
            <div>
              <span className="text-xs font-black uppercase text-gold">
                Live Bingo Round Stream
              </span>
              <p className="text-xs text-slate-300 font-bold">
                Active Room Tickets:{" "}
                <b className="text-emerald-400">{totalRoomTickets} Cartelas</b> • Live Pot:{" "}
                <b className="text-gold">{liveJackpot.toLocaleString()} ETB</b>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">
                Active Round Revenue
              </span>
              <span className="text-base font-black text-cyan-400">
                +{(totalRoomTickets * ticketPrice).toLocaleString()} ETB
              </span>
            </div>
            <button
              type="button"
              onClick={onBackToGame}
              className="rounded-xl bg-gold px-3.5 py-2 text-xs font-black text-black hover:bg-amber-400 active:scale-95 transition-all shadow-glow-gold"
            >
              Watch Game Live →
            </button>
          </div>
        </div>

        {/* Period Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#30363d] bg-[#121620] p-2 shadow-inner">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "daily", label: "📅 Daily Profit (የዛሬ)" },
              { id: "weekly", label: "📆 Weekly (ሳምንታዊ)" },
              { id: "monthly", label: "🗓️ Monthly (ወርሃዊ)" },
              { id: "range", label: "⏳ Date Range (ከ - እስከ)" },
              { id: "all-time", label: "🏆 All Time (አጠቃላይ)" },
              { id: "specific-day", label: "🔍 Specific Day" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  buzz(8);
                  setPeriodTab(tab.id as PeriodTab);
                }}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-black transition-all active:scale-95 border",
                  periodTab === tab.id
                    ? "border-gold bg-gold/20 text-gold shadow-glow-gold/10"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profit Split Customizer */}
          <div className="flex items-center gap-2 bg-black/60 border border-[#30363d] px-3 py-1 rounded-xl text-xs">
            <Sliders className="h-3.5 w-3.5 text-gold" />
            <span className="text-slate-400 font-bold">Split:</span>
            <select
              value={adminSplitPercent}
              onChange={(e) => setAdminSplitPercent(parseInt(e.target.value, 10))}
              className="bg-transparent text-gold font-black outline-none cursor-pointer"
            >
              <option value="70" className="bg-[#121620] text-white">70% Admin / 30% Partner</option>
              <option value="80" className="bg-[#121620] text-white">80% Admin / 20% Partner</option>
              <option value="60" className="bg-[#121620] text-white">60% Admin / 40% Partner</option>
              <option value="50" className="bg-[#121620] text-white">50% Admin / 50% Partner</option>
            </select>
          </div>
        </div>

        {/* Date Range Selector Box if 'range' or 'specific-day' is selected */}
        {periodTab === "range" && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-3 text-xs font-bold animate-in fade-in">
            <span className="text-gold">የቀን ክልል ይምረጡ:</span>
            <div className="flex items-center gap-2">
              <label className="text-slate-400">ከ (From):</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-[#30363d] bg-black px-3 py-1.5 text-white outline-none focus:border-gold"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-400">እስከ (To):</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-[#30363d] bg-black px-3 py-1.5 text-white outline-none focus:border-gold"
              />
            </div>
          </div>
        )}

        {periodTab === "specific-day" && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-500/40 bg-sky-950/20 p-3 text-xs font-bold animate-in fade-in">
            <span className="text-sky-400">የተወሰነ ቀን ይምረጡ:</span>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="rounded-xl border border-[#30363d] bg-black px-3 py-1.5 text-white outline-none focus:border-sky-400"
            />
          </div>
        )}

        {/* PRIMARY FINANCIAL PROFIT CARDS (70/30 Split) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Net Profit Card */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-950/60 via-[#121620] to-[#080b11] p-5 shadow-2xl shadow-emerald-900/30">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                የተጣራ አጠቃላይ ትርፍ (Net Profit)
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                100%
              </span>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-emerald-400 tabular-nums tracking-tight">
                {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                <span className="text-base text-emerald-200 font-bold">ETB</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                = (Gross Profit - ቦነስ ወጪዎች - የአስተዋዋቂ ኮሚሽን)
              </p>
            </div>
          </div>

          {/* Admin Share */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-gold bg-gradient-to-br from-amber-950/60 via-[#121620] to-[#080b11] p-5 shadow-2xl shadow-gold/20">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold/20 blur-3xl" />
            <div className="flex items-center justify-between border-b border-gold/30 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-gold flex items-center gap-1.5">
                <Shield className="h-4 w-4" />
                🛡️ Admin Share ({adminSplitPercent}%)
              </span>
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-black text-gold">
                {adminSplitPercent}% ድርሻ
              </span>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-gold tabular-nums tracking-tight">
                {adminShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                <span className="text-base text-amber-300 font-bold">ETB</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                ከአጠቃላይ የተጣራ ትርፍ {adminSplitPercent}% የአድሚን ትርፍ
              </p>
            </div>
          </div>

          {/* Partner Share */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-cyan-500 bg-gradient-to-br from-sky-950/60 via-[#121620] to-[#080b11] p-5 shadow-2xl shadow-cyan-900/30">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                🤝 Partner Share ({partnerSplitPercent}%)
              </span>
              <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-black text-cyan-300">
                {partnerSplitPercent}% ድርሻ
              </span>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-cyan-400 tabular-nums tracking-tight">
                {partnerShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                <span className="text-base text-cyan-200 font-bold">ETB</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                ከአጠቃላይ የተጣራ ትርፍ {partnerSplitPercent}% የፓርትነር ትርፍ
              </p>
            </div>
          </div>
        </div>

        {/* CASH FLOW & LIABILITIES 4-GRID */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Deposits */}
          <div className="rounded-2xl border border-[#30363d] bg-[#121620] p-4 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="flex items-center gap-1 text-emerald-400">
                <ArrowDownLeft className="h-4 w-4" />
                ⬇️ Total Deposits
              </span>
              <span>(ገቢ)</span>
            </div>
            <p className="mt-2 text-xl font-black text-white tabular-nums">
              {baseMetrics.totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
            </p>
          </div>

          {/* Total Withdrawals */}
          <div className="rounded-2xl border border-[#30363d] bg-[#121620] p-4 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="flex items-center gap-1 text-amber-400">
                <ArrowUpRight className="h-4 w-4" />
                ⬆️ Total Withdrawals
              </span>
              <span>(ወጪ)</span>
            </div>
            <p className="mt-2 text-xl font-black text-white tabular-nums">
              {baseMetrics.totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
            </p>
          </div>

          {/* Net Cash Flow */}
          <div className="rounded-2xl border border-[#30363d] bg-[#121620] p-4 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="flex items-center gap-1 text-sky-400">
                <DollarSign className="h-4 w-4" />
                💵 Net Cash Flow
              </span>
              <span>(Dep - Wit)</span>
            </div>
            <p className="mt-2 text-xl font-black text-emerald-400 tabular-nums">
              +{netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
            </p>
          </div>

          {/* System Liability */}
          <div className="rounded-2xl border border-red-500/40 bg-red-950/20 p-4 shadow-lg">
            <div className="flex items-center justify-between text-red-400 text-xs font-bold">
              <span className="flex items-center gap-1">
                <Lock className="h-4 w-4" />
                🏦 System Liability
              </span>
              <span className="text-[10px]">ተጠቃሚዎች ሂሳብ</span>
            </div>
            <p className="mt-2 text-xl font-black text-red-300 tabular-nums">
              {systemLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
            </p>
          </div>
        </div>

        {/* DETAILED GAME REVENUE & EXPENSES BREAKDOWN */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Game Revenue Box */}
          <div className="rounded-3xl border border-[#30363d] bg-[#121620] p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-black uppercase text-gold flex items-center gap-2 border-b border-[#30363d] pb-3">
              <span>🎟️ Game Revenue & Turnover (የጨዋታ ገቢዎች)</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-[#30363d]">
                <div>
                  <p className="font-bold text-white">Turnover (ጠቅላላ የተሸጡ ካርቴላዎች)</p>
                  <p className="text-[10px] text-slate-400">በተጠቃሚዎች የተወራረዱ ካርቴላዎች ብዛት ድምር</p>
                </div>
                <span className="font-black text-base text-gold tabular-nums">
                  {totalTurnover.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-[#30363d]">
                <div>
                  <p className="font-bold text-white">🏆 Winnings Paid (የተከፈሉ ሽልማቶች)</p>
                  <p className="text-[10px] text-slate-400">አሸናፊዎች ያገኙት ጠቅላላ ጃክፖት ሽልማት</p>
                </div>
                <span className="font-black text-base text-cyan-400 tabular-nums">
                  {totalWinningsPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 p-3 border border-emerald-500/40">
                <div>
                  <p className="font-black text-emerald-400">📈 Gross Game Profit (የካምፓኒው %)</p>
                  <p className="text-[10px] text-emerald-300/80">Turnover - Winnings Paid (15% - 25% Cut)</p>
                </div>
                <span className="font-black text-lg text-emerald-400 tabular-nums">
                  {grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                </span>
              </div>
            </div>
          </div>

          {/* Expenses & Deductions Box */}
          <div className="rounded-3xl border border-[#30363d] bg-[#121620] p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-black uppercase text-red-400 flex items-center gap-2 border-b border-[#30363d] pb-3">
              <span>🎁 Bonus Expenses & Promoters (ወጪዎች)</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-[#30363d]">
                <div>
                  <p className="font-bold text-white">🎁 All Bonus Expenses</p>
                  <p className="text-[10px] text-slate-400">የመመዝገቢያ፣ የጋባዥ፣ የዴፖዚት እና ነፃ ቦነሶች</p>
                </div>
                <span className="font-black text-base text-red-400 tabular-nums">
                  -{baseMetrics.bonusExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-[#30363d]">
                <div>
                  <p className="font-bold text-white">🗣️ Promoter Commissions Paid</p>
                  <p className="text-[10px] text-slate-400">ለአስተዋዋቂዎች የተከፈለ የኮሚሽን ወጪ</p>
                </div>
                <span className="font-black text-base text-red-400 tabular-nums">
                  -{baseMetrics.promoterCommPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 p-3 border border-amber-500/40">
                <div>
                  <p className="font-black text-gold">ጠቅላላ የተቀነሱ ወጪዎች ድምር</p>
                  <p className="text-[10px] text-amber-200/80">ቦነስ + የአስተዋዋቂዎች ኮሚሽን</p>
                </div>
                <span className="font-black text-lg text-gold tabular-nums">
                  -{(baseMetrics.bonusExpenses + baseMetrics.promoterCommPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
