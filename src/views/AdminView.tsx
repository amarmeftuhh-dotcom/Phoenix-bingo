import { useState, useEffect, Dispatch, SetStateAction, FormEvent } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Smartphone,
  Users,
  Trophy,
  DollarSign,
  Gamepad2,
  Bot,
  Ticket,
  TrendingUp,
  Share2,
  Gift,
  Landmark,
  Percent,
  Coins,
  Send,
  Ban,
  Timer,
  Settings,
  Shield,
  RefreshCw,
  Menu,
  X,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  LogOut,
  Radio,
  ExternalLink,
} from "lucide-react";
import { buzz, generateBoardForTicket, type Cell } from "@/lib/bingo";
import { cn } from "@/lib/utils";
import {
  getStoredBotSettings,
  saveStoredBotSettings,
  getStoredBonusEnabled,
  saveStoredBonusEnabled,
  triggerAddBotTickets,
  triggerClearBotTickets,
  type BotWinnerForceMode,
  type BotSettings,
} from "@/lib/botConfig";
import {
  getStoredTransactions,
  approvePlatformTransaction,
  rejectPlatformTransaction,
  getRegisteredUsers,
  saveRegisteredUsers,
  broadcastMessage,
  resetFinanceToZero,
  type PlatformTx,
  type RegisteredUser,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_BOT_API,
  DEFAULT_ADMIN_USERNAME,
} from "@/lib/platformStore";
import {
  subscribeRoomSync,
  getLatestServerState,
  sendAdminRoomAction,
  type ServerLiveRoomData,
} from "@/lib/roomSyncService";

interface AdminViewProps {
  isGameStarted: boolean;
  setIsGameStarted: (v: boolean) => void;
  globalCountdown: number;
  setGlobalCountdown: (v: number) => void;
  drawn: number[];
  setDrawn: Dispatch<SetStateAction<number[]>>;
  mainWallet: number;
  setMainWallet: Dispatch<SetStateAction<number>>;
  playWallet: number;
  setPlayWallet: Dispatch<SetStateAction<number>>;
  pendingTicketsCount: number;
  confirmedTicketsCount: number;
  announcementText?: string;
  setAnnouncementText?: (t: string) => void;
  onResetRound: () => void;
  onNavigateFinance?: () => void;
  onBackToGame?: () => void;
  onInjectLiveBots?: (count: number) => void;
  onClearLiveBots?: () => void;
}

export type AdminTabType =
  | "live"
  | "pend-dep"
  | "pend-wit"
  | "sms-compare"
  | "users"
  | "history"
  | "history-tx"
  | "players"
  | "bots-db"
  | "promo-codes"
  | "promoters"
  | "referral"
  | "bonus"
  | "vaults"
  | "admin-profit"
  | "dep-bonus"
  | "telegram"
  | "banned"
  | "jackpot-timer"
  | "settings";

interface BotRecord {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  cardsCount: number;
  lastPlayed: string;
}

interface UserRecord {
  id: string;
  name: string;
  phone: string;
  playBalance: number;
  mainBalance: number;
  totalDeposited: number;
  won: number;
  status: "active" | "banned";
  lastActive: string;
}

interface PendingTx {
  id: string;
  date: string;
  phone: string;
  bank: string;
  amount: number;
  smsText: string;
  txRef: string;
  destinationAccount?: string;
  type: "deposit" | "withdraw";
  status: "Pending" | "Approved" | "Rejected";
}

interface WinnerHistoryRecord {
  id: string;
  date: string;
  gameId: number;
  winnerName: string;
  phone: string;
  ticketId: string;
  prize: number;
  adminProfit: number;
  calledNumbers: number[];
}

interface PromoCodeItem {
  id: string;
  code: string;
  amount: number;
  maxUsers: number;
  usedCount: number;
  requireDeposit: boolean;
  minDepositAmount: number;
  createdAt: string;
}

interface PromoterRecord {
  id: string;
  name: string;
  phone: string;
  commissionPercent: number;
  invitedCount: number;
  totalCommissionEarned: number;
  pendingWithdrawal: number;
  isApproved: boolean;
}

export function AdminView({
  isGameStarted,
  setIsGameStarted,
  globalCountdown,
  setGlobalCountdown,
  drawn,
  setDrawn,
  mainWallet,
  setMainWallet,
  playWallet,
  setPlayWallet,
  pendingTicketsCount,
  confirmedTicketsCount,
  announcementText,
  setAnnouncementText,
  onResetRound,
  onNavigateFinance,
  onBackToGame,
  onInjectLiveBots,
  onClearLiveBots,
}: AdminViewProps) {
  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem("phoenix_admin_auth") === "true";
    } catch {
      return false;
    }
  });
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  // Bonus Claim (+25 ETB) Toggle State
  const [bonusClaimEnabled, setBonusClaimEnabled] = useState(getStoredBonusEnabled);

  const handleToggleBonusClaim = (val: boolean) => {
    setBonusClaimEnabled(val);
    saveStoredBonusEnabled(val);
    buzz(10);
  };

  const handleLogout = () => {
    buzz(10);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem("phoenix_admin_auth");
    } catch {}
  };

  // Sidebar toggle for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTabType>("live");

  // Master Server Room Synchronizer State
  const [serverRoomState, setServerRoomState] = useState<ServerLiveRoomData | null>(getLatestServerState);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminActionSuccess, setAdminActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeRoomSync((state) => {
      setServerRoomState(state);
    });
    return () => unsub();
  }, []);

  const handleForceStartGame = async () => {
    buzz(15);
    setAdminActionLoading(true);
    const updated = await sendAdminRoomAction("force_start");
    setAdminActionLoading(false);
    if (updated) {
      setServerRoomState(updated);
      setAdminActionSuccess("✅ ጨዋታው በሁሉም ተጫዋቾች ስክሪን ላይ በቀጥታ ተጀምሯል!");
      setTimeout(() => setAdminActionSuccess(null), 3000);
    }
  };

  const handleForceNextRound = async () => {
    buzz(15);
    setAdminActionLoading(true);
    const updated = await sendAdminRoomAction("next_round");
    setAdminActionLoading(false);
    if (updated) {
      setServerRoomState(updated);
      setAdminActionSuccess("✅ አዲስ ዙር ለሁሉም ተጫዋቾች ተጀምሯል!");
      setTimeout(() => setAdminActionSuccess(null), 3000);
    }
  };

  const handleSetLobbySeconds = async (seconds: number) => {
    buzz(10);
    setAdminActionLoading(true);
    const updated = await sendAdminRoomAction("set_lobby_seconds", { lobbySeconds: seconds });
    setAdminActionLoading(false);
    if (updated) {
      setServerRoomState(updated);
      setAdminActionSuccess(`✅ የሎቢ ሰዓት ወደ ${seconds} ሰከንድ ተቀይሯል!`);
      setTimeout(() => setAdminActionSuccess(null), 3000);
    }
  };

  const handleResetRoom = async () => {
    buzz(15);
    setAdminActionLoading(true);
    const updated = await sendAdminRoomAction("reset");
    setAdminActionLoading(false);
    if (updated) {
      setServerRoomState(updated);
      setAdminActionSuccess("✅ ሁሉም ካርቴላዎች ጸድተው ክፍሉ ታድሷል!");
      setTimeout(() => setAdminActionSuccess(null), 3000);
    }
  };

  // System Settings State
  const [ticketPrice, setTicketPrice] = useState(10);
  const [jackpotBoost, setJackpotBoost] = useState(0);
  const [winPopupTimer, setWinPopupTimer] = useState(12);
  const [companyProfitPercent, setCompanyProfitPercent] = useState(15);
  const [decoyChance, setDecoyChance] = useState(25);
  const [bonusWinChance, setBonusWinChance] = useState(10);

  // Vaults State
  const [virtualPrizePool, setVirtualPrizePool] = useState(18500);
  const [vaultTwoBalance, setVaultTwoBalance] = useState(12400);
  const [vaultThreeBalance, setVaultThreeBalance] = useState(8900);

  // Master Bot Controls (Synced with Global Game Engine)
  const initialBotSettings = getStoredBotSettings();
  const [isBotSystemActive, setIsBotSystemActive] = useState(initialBotSettings.isBotSystemActive);
  const [botWinnerForce, setBotWinnerForce] = useState<BotWinnerForceMode>(initialBotSettings.botWinnerForce);
  const [botD1, setBotD1] = useState(initialBotSettings.botD1);
  const [botD2, setBotD2] = useState(initialBotSettings.botD2);
  const [botD3, setBotD3] = useState(initialBotSettings.botD3);
  const [botD4, setBotD4] = useState(initialBotSettings.botD4);
  const [instantBotAmount, setInstantBotAmount] = useState("");

  const handleSaveBotSettings = async () => {
    buzz(12);
    const newSettings = {
      isBotSystemActive,
      botWinnerForce,
      botD1,
      botD2,
      botD3,
      botD4,
      minBots: isBotSystemActive ? (initialBotSettings.minBots || 10) : 0,
      maxBots: isBotSystemActive ? (initialBotSettings.maxBots || 30) : 0,
    };
    saveStoredBotSettings(newSettings);
    const updated = await sendAdminRoomAction("update_bot_settings", { botSettings: newSettings });
    if (updated) {
      setServerRoomState(updated);
    }
    alert(`✅ Master Bot & Winner Control Saved!\nMode: ${botWinnerForce.toUpperCase()}\nBots Active: ${isBotSystemActive ? "YES (ON - አውቶማቲክ ቦት ገብቷል)" : "NO (OFF - ሰው ብቻ)"}`);
  };

  // Bank Accounts
  const [tbName, setTbName] = useState("Phoenix VIP Official");
  const [tbNum, setTbNum] = useState("0932849138");
  const [cbeName, setCbeName] = useState("Phoenix Entertainment PLC");
  const [cbeNum, setCbeNum] = useState("1000492819382");
  const [mpesaName, setMpesaName] = useState("Phoenix Safaricom M-Pesa");
  const [mpesaNum, setMpesaNum] = useState("0712938491");

  // Broadcast
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "telegram" | "web">("all");

  // Promo Code Form
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoAmt, setNewPromoAmt] = useState("");
  const [newPromoMax, setNewPromoMax] = useState("");
  const [promoRequireDep, setPromoRequireDep] = useState(false);
  const [promoMinDep, setPromoMinDep] = useState("50");

  // Datasets
  const [bots, setBots] = useState<BotRecord[]>([
    { id: "b1", name: "አበበ ተፈራ", phone: "0912443322", isActive: true, cardsCount: 2, lastPlayed: "Just now" },
    { id: "b2", name: "ጫላ ደበበ", phone: "0911556677", isActive: true, cardsCount: 3, lastPlayed: "2 mins ago" },
    { id: "b3", name: "አስቴር ጌታቸው", phone: "0933887766", isActive: true, cardsCount: 1, lastPlayed: "5 mins ago" },
    { id: "b4", name: "ሄኖክ አለሙ", phone: "0944112233", isActive: true, cardsCount: 4, lastPlayed: "10 mins ago" },
    { id: "b5", name: "ዳዊት ታደሰ", phone: "0922334455", isActive: true, cardsCount: 1, lastPlayed: "Just now" },
    { id: "b6", name: "ማክዳ ካሳሁን", phone: "0977665544", isActive: true, cardsCount: 3, lastPlayed: "15 mins ago" },
    { id: "b7", name: "ዮሴፍ አብርሀም", phone: "0988990011", isActive: false, cardsCount: 1, lastPlayed: "1 hour ago" },
  ]);

  const [users, setUsers] = useState<UserRecord[]>(() => getRegisteredUsers() as unknown as UserRecord[]);
  const [pendingTxs, setPendingTxs] = useState<PendingTx[]>(() => getStoredTransactions() as unknown as PendingTx[]);

  // Real-time synchronization with Player transactions and registrations
  useEffect(() => {
    const handleSync = () => {
      setPendingTxs(getStoredTransactions() as unknown as PendingTx[]);
      setUsers(getRegisteredUsers() as unknown as UserRecord[]);
    };
    window.addEventListener("phoenix_transactions_updated", handleSync);
    window.addEventListener("phoenix_users_updated", handleSync);
    return () => {
      window.removeEventListener("phoenix_transactions_updated", handleSync);
      window.removeEventListener("phoenix_users_updated", handleSync);
    };
  }, []);

  const [winnersHistory, setWinnersHistory] = useState<WinnerHistoryRecord[]>([
    { id: "gh-1", date: "Today 11:10 AM", gameId: 1042, winnerName: "Amar Meftuh", phone: "0932881122", ticketId: "42", prize: 1850, adminProfit: 277.5, calledNumbers: [5, 18, 33, 52, 67, 12, 28, 41, 59, 73, 8, 22, 44, 50, 61, 3, 19, 39, 48, 70] },
    { id: "gh-2", date: "Today 10:55 AM", gameId: 1041, winnerName: "አበበ ተፈራ", phone: "0912443322", ticketId: "118", prize: 1620, adminProfit: 243, calledNumbers: [2, 16, 31, 46, 62, 7, 21, 35, 49, 68, 14, 29, 43, 58, 74, 9, 25, 40] },
  ]);

  const [promoCodes, setPromoCodes] = useState<PromoCodeItem[]>([
    { id: "p1", code: "SPARKVIP", amount: 50, maxUsers: 200, usedCount: 48, requireDeposit: false, minDepositAmount: 0, createdAt: "2026-08-28" },
    { id: "p2", code: "BONUS20", amount: 20, maxUsers: 500, usedCount: 182, requireDeposit: true, minDepositAmount: 50, createdAt: "2026-08-29" },
  ]);

  const [promoters, setPromoters] = useState<PromoterRecord[]>([
    { id: "pr1", name: "Dawit Promo", phone: "0911445566", commissionPercent: 10, invitedCount: 65, totalCommissionEarned: 3200, pendingWithdrawal: 450, isApproved: true },
    { id: "pr2", name: "Helen Media", phone: "0922778899", commissionPercent: 12, invitedCount: 112, totalCommissionEarned: 6850, pendingWithdrawal: 0, isApproved: true },
  ]);

  // Modal States
  const [selectedBotEdit, setSelectedBotEdit] = useState<BotRecord | null>(null);
  const [selectedUserEdit, setSelectedUserEdit] = useState<UserRecord | null>(null);
  const [selectedSmsDetail, setSelectedSmsDetail] = useState<PendingTx | null>(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState<UserRecord | null>(null);
  const [showLivePlayersModal, setShowLivePlayersModal] = useState(false);
  const [showWinnerCardsModal, setShowWinnerCardsModal] = useState<WinnerHistoryRecord | null>(null);

  // Manual Deposit inputs inside User Info modal
  const [manualTxRef, setManualTxRef] = useState("");
  const [manualAmount, setManualAmount] = useState("");

  // Telegram and Broadcast States
  const [adminChatId, setAdminChatId] = useState(() => localStorage.getItem("phoenix_admin_chat_id") || DEFAULT_ADMIN_USERNAME);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);
  const [botTestStatus, setBotTestStatus] = useState<string | null>(null);

  // Search & Filter
  const [searchUser, setSearchUser] = useState("");

  // Quick calculations
  const pendingDepList = pendingTxs.filter((t) => t.type === "deposit" && t.status === "Pending");
  const pendingWitList = pendingTxs.filter((t) => t.type === "withdraw" && t.status === "Pending");
  const sumPendingDep = pendingDepList.reduce((acc, t) => acc + t.amount, 0);
  const sumPendingWit = pendingWitList.reduce((acc, t) => acc + Math.abs(t.amount), 0);

  // Login Handler
  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (adminPassword.trim() === "amuka") {
      buzz([10, 30]);
      setIsAuthenticated(true);
      setLoginError(false);
      try {
        localStorage.setItem("phoenix_admin_auth", "true");
      } catch {}
    } else {
      buzz([20, 80]);
      setLoginError(true);
    }
  };

  // Switch Tab
  const handleSwitchTab = (tab: AdminTabType) => {
    buzz(8);
    setActiveTab(tab);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Approve / Reject Transactions (Integrated with Platform Store)
  const handleActionTx = (id: string, action: "Approve" | "Reject") => {
    buzz(12);
    if (action === "Approve") {
      approvePlatformTransaction(id);
    } else {
      rejectPlatformTransaction(id);
    }
    setPendingTxs(getStoredTransactions() as unknown as PendingTx[]);
    setUsers(getRegisteredUsers() as unknown as UserRecord[]);
  };

  // Submit Manual Deposit
  const handleManualDeposit = () => {
    if (!manualTxRef || !manualAmount || !selectedUserInfo) {
      alert("እባክዎ ደረሰኝ ቁጥር እና የብር መጠን ያስገቡ!");
      return;
    }
    buzz(15);
    const amt = parseFloat(manualAmount);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.phone === selectedUserInfo.phone) {
          return {
            ...u,
            playBalance: u.playBalance + amt,
            totalDeposited: u.totalDeposited + amt,
          };
        }
        return u;
      })
    );
    setSelectedUserInfo((prev) =>
      prev
        ? {
            ...prev,
            playBalance: prev.playBalance + amt,
            totalDeposited: prev.totalDeposited + amt,
          }
        : null
    );
    setManualTxRef("");
    setManualAmount("");
    alert(`✅ የ ${amt} ETB ዴፖዚት በተሳካ ሁኔታ ተሞልቷል!`);
  };

  // Telegram & Broadcast Handlers
  const handleTestBotPing = async () => {
    buzz(10);
    setBotTestStatus("Testing bot connection...");
    try {
      const res = await fetch(`${TELEGRAM_BOT_API}/getMe`);
      const data = await res.json();
      if (data.ok) {
        setBotTestStatus(`✅ Connected! Bot: @${data.result.username} (${data.result.first_name})`);
      } else {
        setBotTestStatus(`❌ Telegram Error: ${data.description}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setBotTestStatus(`❌ Network error: ${msg}`);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastText.trim()) {
      alert("እባክዎ የማስታወቂያውን ጽሁፍ ያስገቡ!");
      return;
    }
    buzz([10, 20]);
    setBroadcastSending(true);
    setBroadcastStatus("Sending broadcast...");
    const res = await broadcastMessage(broadcastText, broadcastTarget);
    setBroadcastSending(false);
    if (res.success) {
      setBroadcastStatus(`✅ Broadcast Dispatched! ${res.telegramStatus || ""}`);
      if (setAnnouncementText && (broadcastTarget === "all" || broadcastTarget === "web")) {
        setAnnouncementText(broadcastText);
      }
    } else {
      setBroadcastStatus("❌ Failed to broadcast.");
    }
    setTimeout(() => setBroadcastStatus(null), 5000);
  };

  const handleSaveAdminChatId = () => {
    buzz(10);
    localStorage.setItem("phoenix_admin_chat_id", adminChatId.trim());
    alert(`✅ Admin Alert Chat ID Saved: ${adminChatId.trim()}\nDeposits & Withdrawals will alert this handle!`);
  };

  const handleResetPlatformToZero = () => {
    buzz([20, 50, 20]);
    const ok = confirm("⚠️ ማስጠንቀቂያ!\nመላውን የፋይናንስ ዳታቤዝ እና የቆዩ ግብይቶችን ከ 0 (ዜሮ) ማስጀመር ይፈልጋሉ?");
    if (ok) {
      resetFinanceToZero();
      localStorage.setItem("phoenix_platform_transactions", JSON.stringify([]));
      setPendingTxs([]);
      alert("✅ ሁሉም ነገር ከዜሮ (0 ETB) ተጀምሯል! አዲስ ንጹህ ፕላትፎርም ዝግጁ ነው።");
    }
  };

  // Live Inject Bots
  const handleInjectLiveBots = async (customCount?: number) => {
    const amt = typeof customCount === "number" ? customCount : parseInt(instantBotAmount, 10);
    if (isNaN(amt) || amt <= 0) {
      alert("እባክዎ ትክክለኛ የቦት ብዛት ያስገቡ!");
      return;
    }
    buzz(15);
    triggerAddBotTickets(amt);
    if (onInjectLiveBots) {
      onInjectLiveBots(amt);
    }
    const updated = await sendAdminRoomAction("inject_bots", { botCount: amt });
    if (updated) {
      setServerRoomState(updated);
    }
    alert(`✅ ${amt} ቦቶች ወደ ጨዋታው ገብተው ካርቴላ ወስደዋል!`);
    setInstantBotAmount("");
  };

  // Clear All Bots (Back to 0)
  const handleClearAllBots = async () => {
    buzz(15);
    triggerClearBotTickets();
    if (onClearLiveBots) {
      onClearLiveBots();
    }
    const updated = await sendAdminRoomAction("clear_bots");
    if (updated) {
      setServerRoomState(updated);
    }
    alert("✅ በጨዋታው ውስጥ ያሉ ቦቶች በሙሉ ጸድተዋል (ክፍሉ ወደ 0 ተመልሷል)!");
  };

  // Add Promo Code
  const handleAddPromoCode = () => {
    if (!newPromoCode || !newPromoAmt) {
      alert("እባክዎ የኮድ ስም እና መጠን ያስገቡ!");
      return;
    }
    buzz(10);
    const codeObj: PromoCodeItem = {
      id: `p-${Date.now()}`,
      code: newPromoCode.toUpperCase().trim(),
      amount: parseFloat(newPromoAmt) || 10,
      maxUsers: parseInt(newPromoMax, 10) || 100,
      usedCount: 0,
      requireDeposit: promoRequireDep,
      minDepositAmount: parseFloat(promoMinDep) || 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setPromoCodes((prev) => [codeObj, ...prev]);
    setNewPromoCode("");
    setNewPromoAmt("");
    setNewPromoMax("");
    alert("✅ አዲስ የፕሮሞ ኮድ በተሳካ ሁኔታ ተፈጥሯል!");
  };

  // Navigation Items array
  const NAV_ITEMS: { id: AdminTabType; label: string; icon: any; count?: number; badgeColor?: string }[] = [
    { id: "live", label: "📊 Live & Analytics", icon: Activity },
    { id: "pend-dep", label: "📥 Pending Deposits", icon: ArrowDownLeft, count: pendingDepList.length, badgeColor: "bg-red-500" },
    { id: "pend-wit", label: "📤 Pending Withdraws", icon: ArrowUpRight, count: pendingWitList.length, badgeColor: "bg-orange-500" },
    { id: "sms-compare", label: "📱 SMS vs ደረሰኝ Compare", icon: Smartphone },
    { id: "users", label: "👥 Data Base User", icon: Users },
    { id: "history", label: "🏆 Winners History", icon: Trophy },
    { id: "history-tx", label: "💸 Financial History", icon: DollarSign },
    { id: "players", label: "🎮 Players & Bets Info", icon: Gamepad2 },
    { id: "bots-db", label: "🤖 Bot Database & Settings", icon: Bot },
    { id: "promo-codes", label: "🎟️ Promo Codes", icon: Ticket },
    { id: "promoters", label: "📈 Promoters (አስተዋዋቂዎች)", icon: TrendingUp },
    { id: "referral", label: "🤝 Invite & Earn (ጋባዦች)", icon: Share2 },
    { id: "bonus", label: "🎁 Manage Direct Bonus", icon: Gift },
    { id: "vaults", label: "🏦 ዋና እና ተጠባባቂ ካዝና", icon: Landmark },
    { id: "admin-profit", label: "📉 Admin Profit %", icon: Percent },
    { id: "dep-bonus", label: "💰 Deposit % & Bonus", icon: Coins },
    { id: "telegram", label: "✈️ Telegram/Web Broadcast", icon: Send },
    { id: "banned", label: "🚫 Banned Users", icon: Ban },
    { id: "jackpot-timer", label: "💰 Jackpot & Win Timer", icon: Timer },
    { id: "settings", label: "⚙️ Settings & Control", icon: Settings },
  ];

  // Unauthenticated Login View
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-radial from-[#161b22] to-[#050810] p-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-gold/40 bg-[#161b22]/95 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gold/20 text-gold border border-gold/40 shadow-glow-gold">
            <Shield className="h-8 w-8 text-gold" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-gold">
            🛡️ PHOENIX BINGO ADMIN
          </h2>
          <p className="mt-1 text-xs font-bold text-slate-400">
            የአድሚን መቆጣጠሪያ ማዕከል (Restricted Access)
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setLoginError(false);
                }}
                placeholder="Enter Master Secret Key..."
                className="w-full rounded-xl border border-border/80 bg-black/70 px-4 py-3.5 text-center text-base font-bold tracking-widest text-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
              {loginError && (
                <p className="mt-2 text-xs font-bold text-destructive animate-bounce">
                  ❌ የተሳሳተ ፓስወርድ! እባክዎ እንደገና ይሞክሩ።
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-black uppercase tracking-wider text-black shadow-lg hover:bg-emerald-400 active:scale-95 transition-all"
            >
              Access Admin Panel
            </button>
          </form>

          {onBackToGame && (
            <div className="mt-6 border-t border-[#30363d] pt-4">
              <button
                type="button"
                onClick={onBackToGame}
                className="text-xs font-bold text-slate-400 hover:text-white underline"
              >
                ← Back to Live Bingo Game
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050810] text-white font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#30363d] bg-[#161b22] transition-transform duration-300 md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-[#30363d] p-4 text-center">
          <div className="w-full">
            <h2 className="text-sm font-black uppercase tracking-wider text-gold">
              PHOENIX VIP ADMIN
            </h2>
            <span className="text-[11px] font-bold text-slate-400">
              Master Operations Panel
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-none text-xs font-bold">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSwitchTab(item.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 transition-all text-left",
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border-l-4 border-emerald-400 font-black"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-black text-white shrink-0 animate-pulse",
                      item.badgeColor || "bg-red-500"
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Finance Switch & Back */}
        <div className="border-t border-[#30363d] p-3 space-y-1.5 bg-black/40">
          {onNavigateFinance && (
            <button
              onClick={onNavigateFinance}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 py-2 text-xs font-black text-gold hover:bg-gold/20"
            >
              <Landmark className="h-3.5 w-3.5" />
              <span>💎 ወደ Finance Suite</span>
            </button>
          )}
          {onBackToGame && (
            <button
              onClick={onBackToGame}
              className="w-full text-center text-[11px] font-bold text-slate-400 hover:text-white py-1"
            >
              ← Back to Game
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-none">
        {/* Top Header Bar */}
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-[#30363d] p-2 text-slate-300 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-black uppercase text-white">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
            </h1>

            {/* Game Status & Master Server Clock Chip */}
            <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#30363d] bg-black/60 px-3 py-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div>
                  <span className="block text-[8px] uppercase font-black text-slate-400 tracking-wider">
                    MASTER SERVER CLOCK
                  </span>
                  <b className="font-mono font-black text-emerald-400 text-xs tracking-wider">
                    {serverRoomState ? new Date(serverRoomState.serverTime).toLocaleTimeString() : "--:--:--"}
                  </b>
                </div>
              </div>
              <div className="h-5 w-px bg-[#30363d]" />
              <div>
                <span className="block text-[8px] uppercase font-black text-slate-400">
                  ROUND
                </span>
                <b className="font-mono font-black text-cyan-400 text-xs">
                  #{serverRoomState?.roundId ?? 0}
                </b>
              </div>
              <div className="h-5 w-px bg-[#30363d]" />
              <div>
                <span className="block text-[8px] uppercase font-black text-slate-400">
                  STATUS
                </span>
                <b
                  className={cn(
                    "font-black tracking-wider text-xs",
                    serverRoomState?.phase === "game"
                      ? "text-emerald-400"
                      : serverRoomState?.phase === "victory"
                      ? "text-purple-400"
                      : "text-amber-400"
                  )}
                >
                  {serverRoomState?.phase === "game"
                    ? "🔴 GAME"
                    : serverRoomState?.phase === "victory"
                    ? "🏆 WON"
                    : `⏳ LOBBY (${serverRoomState?.countdown ?? globalCountdown}s)`}
                </b>
              </div>
              <div className="h-5 w-px bg-[#30363d]" />
              <div>
                <span className="block text-[8px] uppercase font-black text-slate-400">
                  LIVE JACKPOT
                </span>
                <b className="font-black text-gold text-xs">
                  {(serverRoomState?.jackpot ?? ((confirmedTicketsCount + pendingTicketsCount + 140) * ticketPrice)).toLocaleString()}{" "}
                  ETB
                </b>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBackToGame && (
              <button
                onClick={onBackToGame}
                className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
              >
                <Gamepad2 className="h-3.5 w-3.5 text-amber-400" />
                <span>🎮 Bingo Game</span>
              </button>
            )}

            {onNavigateFinance && (
              <button
                onClick={onNavigateFinance}
                className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/15 px-3 py-1.5 text-xs font-black text-gold hover:bg-gold/25"
              >
                <Landmark className="h-3.5 w-3.5" />
                <span>💎 Finance Suite</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              title="Logout from Admin"
              className="flex items-center gap-1 rounded-xl border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* TAB 1: LIVE & ANALYTICS */}
        {activeTab === "live" && (
          <div className="space-y-4">
            {/* Master Server Clock & Real-time Sync Quickbar */}
            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-black/60 p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-white">
                      🔴 የቀጥታ ሰርቨር ዋና ሰዓት (Master Server Clock)
                    </span>
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300 font-mono">
                      #{serverRoomState?.roundId ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs mt-0.5 text-slate-300">
                    <span>
                      ሰዓት:{" "}
                      <b className="font-mono text-emerald-400 font-black">
                        {serverRoomState ? new Date(serverRoomState.serverTime).toLocaleTimeString() : "--:--:--"}
                      </b>
                    </span>
                    <span>•</span>
                    <span>
                      የቀረ ሰዓት:{" "}
                      <b className="font-mono text-amber-400 font-black">
                        {serverRoomState?.countdown ?? globalCountdown}s
                      </b>
                    </span>
                    <span>•</span>
                    <span>
                      ደረጃ:{" "}
                      <b
                        className={cn(
                          "font-black uppercase",
                          serverRoomState?.phase === "game"
                            ? "text-emerald-400"
                            : serverRoomState?.phase === "victory"
                            ? "text-purple-400"
                            : "text-amber-400"
                        )}
                      >
                        {serverRoomState?.phase === "game"
                          ? "🔴 GAME (ኳስ)"
                          : serverRoomState?.phase === "victory"
                          ? "🏆 WON"
                          : "⏳ LOBBY (ምርጫ)"}
                      </b>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={adminActionLoading || serverRoomState?.phase === "game"}
                  onClick={handleForceStartGame}
                  className="rounded-xl border border-emerald-500/60 bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-500 active:scale-95 disabled:opacity-40 transition-all"
                >
                  🚀 አሁኑኑ አስጀምር
                </button>
                <button
                  type="button"
                  disabled={adminActionLoading}
                  onClick={handleForceNextRound}
                  className="rounded-xl border border-sky-500/60 bg-sky-600 px-3 py-1.5 text-xs font-black text-white hover:bg-sky-500 active:scale-95 disabled:opacity-40 transition-all"
                >
                  ⏭️ ቀጣይ ዙር
                </button>
                <button
                  type="button"
                  disabled={adminActionLoading}
                  onClick={() => handleInjectLiveBots(10)}
                  className="rounded-xl border border-amber-500/60 bg-amber-600/30 px-3 py-1.5 text-xs font-black text-amber-300 hover:bg-amber-600/50 active:scale-95 disabled:opacity-40 transition-all"
                  title="10 ቦቶችን ወደ ጨዋታው ጨምር"
                >
                  🤖 +10 ቦት
                </button>
                <button
                  type="button"
                  disabled={adminActionLoading}
                  onClick={handleClearAllBots}
                  className="rounded-xl border border-red-500/50 bg-red-600/20 px-2.5 py-1.5 text-xs font-bold text-red-300 hover:bg-red-600/30 active:scale-95 disabled:opacity-40 transition-all"
                  title="ሁሉንም ቦቶች አስወጣ"
                >
                  🧹 ቦት አጽዳ
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTab("jackpot-timer")}
                  className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-black text-gold hover:bg-gold/20 active:scale-95 transition-all"
                >
                  🎛️ ሙሉ መቆጣጠሪያ
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Live Jackpot Card */}
              <div className="col-span-1 sm:col-span-2 rounded-2xl border border-[#30363d] border-b-4 border-b-amber-400 bg-[#161b22] p-4 text-center shadow-lg">
                <h3 className="text-xs font-bold uppercase text-slate-400">
                  💰 Live Jackpot (የስክሪን ላይ)
                </h3>
                <h2 className="mt-1 text-2xl font-black text-gold">
                  {((confirmedTicketsCount + pendingTicketsCount + 140) * ticketPrice + jackpotBoost).toLocaleString()}{" "}
                  ETB
                </h2>
                <div className="mt-2.5 flex justify-around rounded-xl border border-[#30363d] bg-black/40 p-2 text-xs text-slate-400">
                  <span>
                    👤 Real Money:{" "}
                    <b className="text-emerald-400 font-bold">
                      {((confirmedTicketsCount + pendingTicketsCount) * ticketPrice).toLocaleString()}{" "}
                      ETB
                    </b>
                  </span>
                  <span>
                    🤖 Bot Money:{" "}
                    <b className="text-red-400 font-bold">
                      {(140 * ticketPrice).toLocaleString()} ETB
                    </b>
                  </span>
                </div>
              </div>

              {/* Hidden Bank Card */}
              <div className="col-span-1 sm:col-span-2 rounded-2xl border border-[#30363d] border-b-4 border-b-cyan-400 bg-cyan-950/20 p-4 text-center shadow-lg">
                <h3 className="text-xs font-bold uppercase text-slate-400">
                  💎 Hidden Bank (እውነተኛው ድብቅ ካዝና)
                </h3>
                <p className="text-[10px] text-slate-500">
                  ይህ ሲስተሙ ሰው ሲያሸንፍ እውነተኛ ብር የሚከፍልበት ካዝና ነው
                </p>
                <h2 className="mt-1 text-2xl font-black text-cyan-400">
                  {virtualPrizePool.toLocaleString()} ETB
                </h2>
              </div>

              {/* Live Players */}
              <div
                onClick={() => setShowLivePlayersModal(true)}
                className="cursor-pointer rounded-2xl border border-[#30363d] border-b-4 border-b-purple-400 bg-[#161b22] p-4 text-center shadow-lg hover:border-purple-400 transition-all"
              >
                <h3 className="text-xs font-bold uppercase text-slate-400">
                  Players (👤 Real / 🤖 Bots)
                </h3>
                <h2 className="mt-1 text-xl font-black text-purple-400">
                  {confirmedTicketsCount + pendingTicketsCount > 0 ? 1 : 0} / 140
                </h2>
                <span className="mt-2 inline-block rounded-md bg-purple-500/20 px-2 py-1 text-[10px] font-black text-purple-300">
                  👁️ View List
                </span>
              </div>

              {/* Daily Admin Profit */}
              <div className="rounded-2xl border border-[#30363d] border-b-4 border-b-emerald-400 bg-[#161b22] p-4 text-center shadow-lg">
                <h3 className="text-xs font-bold uppercase text-slate-400">
                  📈 Daily Admin Profit
                </h3>
                <h2 className="mt-1 text-xl font-black text-emerald-400">
                  25,515.00 ETB
                </h2>
                <span className="mt-2 inline-block text-[10px] text-slate-400">
                  70% Admin / 30% Partner
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PENDING DEPOSITS */}
        {activeTab === "pend-dep" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/10 p-4 text-center text-sm font-bold text-emerald-400">
              📥 Total Pending Deposits: <span className="text-lg font-black">{sumPendingDep.toFixed(2)}</span> ETB
            </div>

            <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4 shadow-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#30363d] text-[11px] uppercase text-slate-400">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3">Bank</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">SMS Detail</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]/60">
                  {pendingDepList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="py-3 text-slate-400">{t.date}</td>
                      <td className="py-3 font-bold text-cyan-400">{t.phone}</td>
                      <td className="py-3">
                        <span className="rounded-md bg-blue-500/20 px-2 py-0.5 font-bold text-blue-300">
                          {t.bank}
                        </span>
                      </td>
                      <td className="py-3 font-black text-emerald-400">{t.amount} ETB</td>
                      <td className="py-3 text-[11px] text-slate-300 font-mono">
                        {t.smsText.substring(0, 30)}...
                      </td>
                      <td className="py-3 space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedSmsDetail(t)}
                          className="rounded-lg bg-blue-600 px-2.5 py-1 font-bold text-white hover:bg-blue-500"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => handleActionTx(t.id, "Approve")}
                          className="rounded-lg bg-emerald-500 px-2.5 py-1 font-black text-black hover:bg-emerald-400"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleActionTx(t.id, "Reject")}
                          className="rounded-lg bg-red-600 px-2.5 py-1 font-bold text-white hover:bg-red-500"
                        >
                          ❌ Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendingDepList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No pending deposits at the moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PENDING WITHDRAWS */}
        {activeTab === "pend-wit" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-dashed border-orange-500/40 bg-orange-500/10 p-4 text-center text-sm font-bold text-orange-400">
              📤 Total Pending Withdrawals: <span className="text-lg font-black">{sumPendingWit.toFixed(2)}</span> ETB
            </div>

            <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4 shadow-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#30363d] text-[11px] uppercase text-slate-400">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3">Bank Option</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Sent To (Account)</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]/60">
                  {pendingWitList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="py-3 text-slate-400">{t.date}</td>
                      <td className="py-3 font-bold text-cyan-400">{t.phone}</td>
                      <td className="py-3">
                        <span className="rounded-md bg-purple-500/20 px-2 py-0.5 font-bold text-purple-300">
                          {t.bank}
                        </span>
                      </td>
                      <td className="py-3 font-black text-orange-400">{t.amount} ETB</td>
                      <td className="py-3 font-mono text-cyan-300 font-bold">
                        {t.destinationAccount || t.phone}
                      </td>
                      <td className="py-3 space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleActionTx(t.id, "Approve")}
                          className="rounded-lg bg-emerald-500 px-3 py-1 font-black text-black hover:bg-emerald-400"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleActionTx(t.id, "Reject")}
                          className="rounded-lg bg-red-600 px-3 py-1 font-bold text-white hover:bg-red-500"
                        >
                          ❌ Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendingWitList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No pending withdrawals.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SMS VS CUSTOMER RECEIPT COMPARISON */}
        {activeTab === "sms-compare" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-sky-500/40 bg-sky-950/20 p-4">
              <h3 className="text-sm font-black text-sky-400">
                📱 የ iPhone SMS እና የደንበኛ ደረሰኝ ማነፃፀሪያ
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                በግራ በኩል ከ iPhone ወደ ሲስተሙ የገባው እውነተኛ SMS ሲታይ፣ በቀኝ በኩል ደግሞ ደንበኛው በ App ያስገባው ይታያል።
              </p>
            </div>

            <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4 shadow-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#30363d] text-[11px] uppercase text-slate-400">
                    <th className="pb-3">Date</th>
                    <th className="pb-3 bg-blue-500/10 text-blue-300 p-2 rounded-l-lg">
                      📱 ከ iPhone የመጣው እውነተኛ SMS
                    </th>
                    <th className="pb-3 bg-emerald-500/10 text-emerald-300 p-2 rounded-r-lg">
                      🧾 ደንበኛው ያስገባው
                    </th>
                    <th className="pb-3 text-center">Status & Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]/60">
                  {pendingDepList.map((t) => (
                    <tr key={t.id}>
                      <td className="py-3 text-slate-400">{t.date}</td>
                      <td className="py-3 bg-blue-500/5 p-2 font-mono text-[11px] text-slate-300 border-l-2 border-blue-500">
                        {t.smsText}
                        <div className="mt-1 font-bold text-sky-400">
                          TxRef: {t.txRef}
                        </div>
                      </td>
                      <td className="py-3 bg-emerald-500/5 p-2 border-l-2 border-emerald-500">
                        <div className="font-bold text-white">Phone: {t.phone}</div>
                        <div className="font-black text-amber-400">Amount: {t.amount} ETB</div>
                      </td>
                      <td className="py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleActionTx(t.id, "Approve")}
                          className="rounded-lg bg-emerald-500 px-3 py-1 font-black text-black hover:bg-emerald-400 text-xs"
                        >
                          ✅ Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: USERS DATABASE */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="🔍 Search User Name or Phone..."
                className="w-full rounded-xl border border-[#30363d] bg-black/60 px-4 py-2.5 text-xs text-white outline-none focus:border-gold"
              />
            </div>

            <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4 shadow-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#30363d] text-[11px] uppercase text-slate-400">
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3">Play Bal</th>
                    <th className="pb-3">Main Bal</th>
                    <th className="pb-3">Total Deposited</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]/60">
                  {users
                    .filter((u) => u.name.toLowerCase().includes(searchUser.toLowerCase()) || u.phone.includes(searchUser))
                    .map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40">
                        <td className="py-3 font-black text-cyan-300">{u.name}</td>
                        <td className="py-3 font-mono text-slate-400">{u.phone}</td>
                        <td className="py-3 font-bold text-emerald-400">{u.playBalance.toFixed(2)}</td>
                        <td className="py-3 font-bold text-gold">{u.mainBalance.toFixed(2)}</td>
                        <td className="py-3 font-bold text-amber-400">{u.totalDeposited.toFixed(2)}</td>
                        <td className="py-3 space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedUserEdit(u)}
                            className="rounded-lg bg-blue-600 px-2.5 py-1 font-bold text-white hover:bg-blue-500"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setSelectedUserInfo(u)}
                            className="rounded-lg bg-purple-600 px-2.5 py-1 font-bold text-white hover:bg-purple-500"
                          >
                            TXs
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: BOT DATABASE & SETTINGS */}
        {activeTab === "bots-db" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Master Bot Controls */}
              <div className="col-span-1 lg:col-span-2 rounded-2xl border border-gold/40 border-l-4 border-l-gold bg-[#161b22] p-4 shadow-lg space-y-4">
                <h3 className="text-sm font-black uppercase text-gold">
                  🎮 Master Bot Controls
                </h3>

                {/* 0. Bonus Claim Toggle (+25 ETB) */}
                <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-950/25 p-3.5 shadow-inner">
                  <div>
                    <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <span>🎁</span>
                      <span>+25 ETB የቦነስ በተን አሳይ (Show +25 ETB Bonus Button)</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ይህ ሲበራ ብቻ በዋናው ገጽ ላይ "+25 ETB ቦነስ ይውሰዱ" የሚለው ይወጣል (Default: OFF)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={bonusClaimEnabled}
                    onChange={(e) => handleToggleBonusClaim(e.target.checked)}
                    className="h-6 w-6 accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* 1. Enable Bots Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-[#30363d] bg-black/40 p-3.5">
                  <div>
                    <div className="text-xs font-bold text-white">1. Enable Bots Auto-Fill (ቦት በየጊዜው እንዲገባ)</div>
                    <div className="text-[11px] text-slate-400">ON ሲሆን ቦቶች በካውንትዳውን ሰዓት ካርቴላ ይይዛሉ</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isBotSystemActive}
                    onChange={(e) => setIsBotSystemActive(e.target.checked)}
                    className="h-5 w-5 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* 2. Winner Control */}
                <div className="rounded-xl border border-[#30363d] bg-black/40 p-3.5 space-y-2.5">
                  <div className="text-xs font-bold text-white">2. Winner Control (ማን ያሸንፍ?)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: "bots", label: "🤖 Bots (100% ቦት)" },
                      { id: "real", label: "👤 Real (ሰው ብቻ)" },
                      { id: "mix", label: "🔄 Mix (ሰው+ቦት)" },
                      { id: "mix_real", label: "🤝 Mix 4 (ሰው+ሰው)" },
                      { id: "mix_dep", label: "💎 Mix Dep" },
                      { id: "ai", label: "🧠 Smart Casino AI" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBotWinnerForce(item.id as any)}
                        className={cn(
                          "rounded-xl p-2.5 text-xs font-black border transition-all text-center",
                          botWinnerForce === item.id
                            ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400"
                            : "border-[#30363d] bg-slate-900/60 text-slate-400 hover:text-white"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Ticket Distribution */}
                <div className="rounded-xl border border-[#30363d] bg-black/40 p-3.5 space-y-2">
                  <div className="text-xs font-bold text-white">3. Ticket Distribution (የቦት ስርጭት)</div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-cyan-400 font-bold">1 Card</label>
                      <input
                        type="number"
                        value={botD1}
                        onChange={(e) => setBotD1(parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-lg border border-[#30363d] bg-black px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-emerald-400 font-bold">2 Cards</label>
                      <input
                        type="number"
                        value={botD2}
                        onChange={(e) => setBotD2(parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-lg border border-[#30363d] bg-black px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gold font-bold">3 Cards</label>
                      <input
                        type="number"
                        value={botD3}
                        onChange={(e) => setBotD3(parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-lg border border-[#30363d] bg-black px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-purple-400 font-bold">4 Cards</label>
                      <input
                        type="number"
                        value={botD4}
                        onChange={(e) => setBotD4(parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-lg border border-[#30363d] bg-black px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveBotSettings}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-black uppercase tracking-wider text-white hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all shadow-md text-xs flex items-center justify-center gap-2"
                >
                  <span>💾 Save Master Settings (ቅንብሮችን አስቀምጥ)</span>
                </button>
              </div>

              {/* Side Panels: Live Inject & Add Bots */}
              <div className="space-y-4">
                {/* Live Inject */}
                <div className="rounded-2xl border border-emerald-500/40 border-l-4 border-l-emerald-400 bg-[#161b22] p-4 shadow-lg space-y-3">
                  <h3 className="text-xs font-black uppercase text-emerald-400">
                    ⚡ Live Inject (አሁኑኑ ቦት አስገባ)
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={instantBotAmount}
                      onChange={(e) => setInstantBotAmount(e.target.value)}
                      placeholder="ብዛት (e.g. 20)"
                      className="w-full rounded-xl border border-[#30363d] bg-black px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleInjectLiveBots()}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-black hover:bg-emerald-400 active:scale-95"
                    >
                      🔥 አስገባ
                    </button>
                  </div>

                  {/* Quick Bot Buttons */}
                  <div className="pt-2 border-t border-[#30363d] space-y-2">
                    <div className="text-[11px] font-bold text-slate-300">ፈጣን መጨመሪያ፦</div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleInjectLiveBots(5)}
                        className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-500/30 active:scale-95"
                      >
                        +5 ቦት
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInjectLiveBots(10)}
                        className="rounded-xl border border-cyan-500/40 bg-cyan-500/20 py-2 text-xs font-black text-cyan-300 hover:bg-cyan-500/30 active:scale-95"
                      >
                        +10 ቦት
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInjectLiveBots(25)}
                        className="rounded-xl border border-amber-500/40 bg-amber-500/20 py-2 text-xs font-black text-amber-300 hover:bg-amber-500/30 active:scale-95"
                      >
                        +25 ቦት
                      </button>
                    </div>
                  </div>

                  {/* Clear All Bots */}
                  <div className="pt-2 border-t border-[#30363d]">
                    <button
                      type="button"
                      onClick={handleClearAllBots}
                      className="w-full rounded-xl border border-red-500/40 bg-red-500/15 py-2.5 text-xs font-black text-red-400 hover:bg-red-500/25 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🧹 ሁሉንም ቦቶች አጽዳ (ክፍሉን ባዶ አድርግ)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: VAULTS (ካዝና 1, 2, 3) */}
        {activeTab === "vaults" && (
          <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-5 shadow-lg space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Vault 1 */}
              <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4 space-y-3">
                <h3 className="text-sm font-black text-cyan-400">
                  🏦 ካዝና 1 (ዋና / Vault 1)
                </h3>
                <p className="text-[11px] text-slate-400">ለ 3፣ 4 እና 5 አሸናፊዎች የሚከፍል ዋና ካዝና።</p>
                <div className="text-xl font-black text-cyan-300">
                  {virtualPrizePool.toLocaleString()} ETB
                </div>
                <input
                  type="number"
                  value={virtualPrizePool}
                  onChange={(e) => setVirtualPrizePool(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-cyan-500/40 bg-black px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Vault 2 */}
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
                <h3 className="text-sm font-black text-emerald-400">
                  🛡️ ካዝና 2 (Vault 2)
                </h3>
                <p className="text-[11px] text-slate-400">1 እውነተኛ ሰው ሲያሸንፍ ሙሉ ክፍያ ይፈፅማል።</p>
                <div className="text-xl font-black text-emerald-300">
                  {vaultTwoBalance.toLocaleString()} ETB
                </div>
                <input
                  type="number"
                  value={vaultTwoBalance}
                  onChange={(e) => setVaultTwoBalance(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-emerald-500/40 bg-black px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Vault 3 */}
              <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-4 space-y-3">
                <h3 className="text-sm font-black text-purple-400">
                  🔥 ካዝና 3 (Vault 3)
                </h3>
                <p className="text-[11px] text-slate-400">1 ሰው እና 1 ቦት እኩል (Tie) ሲወጡ ይከፍላል።</p>
                <div className="text-xl font-black text-purple-300">
                  {vaultThreeBalance.toLocaleString()} ETB
                </div>
                <input
                  type="number"
                  value={vaultThreeBalance}
                  onChange={(e) => setVaultThreeBalance(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-purple-500/40 bg-black px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <button
              onClick={() => alert("✅ የ 3ቱም ካዝናዎች ሚዛንና ፐርሰንት ተቀምጧል!")}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-black uppercase text-black shadow-lg hover:from-amber-400 hover:to-amber-500 active:scale-95"
            >
              💾 Save All Vault Settings
            </button>
          </div>
        )}

        {/* TAB 8: PROMO CODES */}
        {activeTab === "promo-codes" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gold/40 bg-[#161b22] p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-black uppercase text-gold">
                🎟️ አዲስ የፕሮሞ ኮድ ይፍጠሩ (Create Promo Code)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                  placeholder="የኮድ ስም (e.g. VIP2026)"
                  className="rounded-xl border border-[#30363d] bg-black px-3 py-2 text-xs text-white uppercase"
                />
                <input
                  type="number"
                  value={newPromoAmt}
                  onChange={(e) => setNewPromoAmt(e.target.value)}
                  placeholder="የብር መጠን (ETB)"
                  className="rounded-xl border border-[#30363d] bg-black px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  value={newPromoMax}
                  onChange={(e) => setNewPromoMax(e.target.value)}
                  placeholder="የሰው ብዛት ገደብ"
                  className="rounded-xl border border-[#30363d] bg-black px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleAddPromoCode}
                  className="rounded-xl bg-gradient-to-r from-amber-400 to-gold px-4 py-2 text-xs font-black text-black hover:opacity-90 shadow-sm"
                >
                  + Create Code
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4 shadow-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#30363d] text-[11px] uppercase text-slate-400">
                    <th className="pb-3">Code</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Used / Max</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]/60">
                  {promoCodes.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 font-mono font-black text-gold">{p.code}</td>
                      <td className="py-3 font-bold text-emerald-400">{p.amount} ETB</td>
                      <td className="py-3 font-bold text-slate-300">{p.usedCount} / {p.maxUsers}</td>
                      <td className="py-3 text-slate-400">{p.createdAt}</td>
                      <td className="py-3">
                        <button
                          onClick={() => setPromoCodes((prev) => prev.filter((x) => x.id !== p.id))}
                          className="rounded-lg bg-red-600/80 px-2 py-1 text-white hover:bg-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: TELEGRAM / WEB BROADCAST */}
        {activeTab === "telegram" && (
          <div className="space-y-5">
            {/* Telegram Bot Live Status Banner */}
            <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-r from-sky-950/40 via-[#161b22] to-sky-950/30 p-5 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/40">
                    <Send className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>Telegram Bot & Live Broadcast</span>
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        ● Online & Ready
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      የቴሌግራም ቦት ማስተላለፊያ እና የቀጥታ ማስታወቂያ መቆጣጠሪያ
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestBotPing}
                  className="flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-black text-sky-400 hover:bg-sky-500/20"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Test Bot Connectivity (ፒንግ ሞክር)</span>
                </button>
              </div>

              {botTestStatus && (
                <div className="rounded-xl border border-sky-500/30 bg-black/60 p-3 text-xs font-mono text-sky-300">
                  {botTestStatus}
                </div>
              )}

              {/* Bot Meta Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#30363d]/60 text-xs">
                <div className="rounded-xl border border-[#30363d] bg-black/40 p-3">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Bot Username</span>
                  <a
                    href="https://t.me/Phoenix_Bingo_Bot"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>@Phoenix_Bingo_Bot</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="rounded-xl border border-[#30363d] bg-black/40 p-3">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Official Admin Handle</span>
                  <span className="font-bold text-gold">{DEFAULT_ADMIN_USERNAME}</span>
                </div>
                <div className="rounded-xl border border-[#30363d] bg-black/40 p-3">
                  <span className="text-[10px] text-slate-400 block mb-0.5">WebApp Endpoint</span>
                  <span className="font-mono text-[11px] text-slate-300 truncate block">https://phoenix-bingo.onrender.com</span>
                </div>
              </div>
            </div>

            {/* Admin Notifications Receiver Config */}
            <div className="rounded-2xl border border-gold/40 bg-[#161b22] p-5 shadow-lg space-y-3">
              <h3 className="text-sm font-black uppercase text-gold flex items-center gap-2">
                <span>🔔 የአድሚን የማንቂያ መልእክት መቀበያ (Admin Alert Receiver)</span>
              </h3>
              <p className="text-xs text-slate-400">
                ተጫዋች ገቢ (Deposit) ወይም ወጪ (Withdrawal) ሲጠይቅ በቀጥታ ወደዚህ የቴሌግራም መለያዎ ማሳሰቢያ ይላካል:
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={adminChatId}
                  onChange={(e) => setAdminChatId(e.target.value)}
                  placeholder="e.g. @Phonix_s or 8606075616"
                  className="flex-1 min-w-[240px] rounded-xl border border-[#30363d] bg-black px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-gold"
                />
                <button
                  type="button"
                  onClick={handleSaveAdminChatId}
                  className="rounded-xl bg-gold px-5 py-2.5 text-xs font-black text-black hover:bg-gold/90 active:scale-95"
                >
                  Save Admin Telegram Handle
                </button>
              </div>
            </div>

            {/* Compose & Send Broadcast */}
            <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
                  <span>📢 የቀጥታ መልእክት ማስተላለፊያ (Broadcast Dispatcher)</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
                  Direct Push to Telegram & Web
                </span>
              </div>

              {/* Target Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 mr-2">መድረሻ (Target):</span>
                {[
                  { id: "all", label: "🌐 All (ሁሉንም - Web & Telegram)" },
                  { id: "telegram", label: "✈️ Telegram Only" },
                  { id: "web", label: "🖥️ Live Web Ticker Only" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBroadcastTarget(t.id as "all" | "telegram" | "web")}
                    className={cn(
                      "rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all",
                      broadcastTarget === t.id
                        ? "border-sky-400 bg-sky-500/20 text-sky-300 font-black"
                        : "border-[#30363d] bg-black/40 text-slate-400 hover:text-white"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  የመልእክቱ ይዘት (Message Content):
                </label>
                <textarea
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="ለምሳሌ: 🎉 ውድ የፊኒክስ ቢንጎ ተጫዋቾች! አሁን 100 ETB ገቢ ሲያደርጉ የ 20% ቦነስ በራስሰር ያገኛሉ። አሁኑኑ ተጫውተው ያሸንፉ!"
                  rows={4}
                  className="w-full rounded-2xl border border-[#30363d] bg-black/60 p-3.5 text-xs font-medium text-white outline-none focus:border-sky-400"
                />
              </div>

              {/* Quick Template Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400">ፈጣን አብነቶች (Templates):</span>
                <button
                  type="button"
                  onClick={() => setBroadcastText("🎉 ውድ ተጫዋቾች! የ 100 ETB እና በላይ ገቢ ያደረጉ 20% ተጨማሪ ቦነስ ያገኛሉ። አሁኑኑ ይጫወቱ!")}
                  className="rounded-lg border border-[#30363d] bg-black/30 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white"
                >
                  🎁 20% ቦነስ
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastText("⚡ ክፍያዎች በቴሌብር እና በሲቢኢ በከፍተኛ ፍጥነት እየተፈጸሙ ነው። ፈጣን ወጪ እና ገቢ በ 2 ደቂቃ ውስጥ!")}
                  className="rounded-lg border border-[#30363d] bg-black/30 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white"
                >
                  ⚡ ፈጣን ክፍያ
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastText("🏆 አዲሱ የቀጥታ ጃክፖት ዙር ተጀምሯል! ካርቴላ ወስደው ትልቁን የገንዘብ ሽልማት ያሸንፉ!")}
                  className="rounded-lg border border-[#30363d] bg-black/30 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white"
                >
                  🏆 አዲስ ዙር
                </button>
              </div>

              {broadcastStatus && (
                <div className="rounded-xl border border-sky-500/40 bg-sky-950/40 p-3 text-center text-xs font-bold text-sky-300">
                  {broadcastStatus}
                </div>
              )}

              <button
                type="button"
                disabled={broadcastSending || !broadcastText.trim()}
                onClick={handleSendBroadcast}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-sky-500 py-3.5 text-sm font-black uppercase text-white shadow-lg hover:opacity-90 active:scale-98 disabled:opacity-40"
              >
                {broadcastSending ? "በመላክ ላይ (Sending)..." : "🚀 መልእክቱን አሁኑኑ አስተላልፍ (Dispatch Broadcast)"}
              </button>
            </div>

            {/* Platform Reset / Zero Out Controls */}
            <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-5 shadow-lg flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-rose-400">🔄 Fresh Start / Reset to Zero (ከዜሮ ጀምር)</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  የቆዩትን የሙከራ ዴፖዚቶች፣ ዊዝድሮዎች እና የፋይናንስ ሂሳቦችን በሙሉ አጽድቶ አዲስ ንጹህ ፕላትፎርም ያደርገዋል።
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetPlatformToZero}
                className="rounded-xl border border-rose-500 bg-rose-600 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-500 active:scale-95"
              >
                Reset All To Zero (0 ETB)
              </button>
            </div>
          </div>
        )}

        {/* TAB: JACKPOT & MASTER WIN TIMER (UNIVERSAL LIVE ROOM CONTROLLER) */}
        {activeTab === "jackpot-timer" && (
          <div className="space-y-5">
            {/* Feedback Alert */}
            {adminActionSuccess && (
              <div className="rounded-2xl border border-emerald-500/60 bg-emerald-950/60 p-4 text-center text-sm font-black text-emerald-300 shadow-glow-emerald animate-subtle-pop">
                {adminActionSuccess}
              </div>
            )}

            {/* Master Server Clock Hero Banner */}
            <div className="rounded-3xl border border-gold/40 bg-gradient-to-br from-[#1b2230] via-[#121620] to-[#0d1017] p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#30363d] pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                      AUTHORITATIVE SERVER CLOCK • MULTI-DEVICE EQUAL SYNC
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
                    <span>🕒 ዋና የሰርቨር ሰዓት እና የዙር መቆጣጠሪያ</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    ይህ ሰዓት በሁሉም ተጫዋቾች ስልኮች ላይ በእኩል ሰከንድ የሚቆጥር ማዕከላዊ የሰርቨር ሰዓት ነው። አንድ ተጫዋች ካርቴላ ሲመርጥ ለሌላው ተጫዋች በቅጽበት ቀይ መስቀል (X) ሆኖ ይሰረዛል!
                  </p>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-black uppercase text-slate-400">የአሁኑ ሰርቨር ሰዓት</span>
                  <span className="font-mono text-3xl sm:text-4xl font-black text-emerald-400 tabular-nums tracking-wider">
                    {serverRoomState ? new Date(serverRoomState.serverTime).toLocaleTimeString() : "--:--:--"}
                  </span>
                </div>
              </div>

              {/* Real-time Status Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                <div className="rounded-2xl border border-[#30363d] bg-black/50 p-3.5 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">የአሁኑ ዙር</span>
                  <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                    #{serverRoomState?.roundId ?? 0}
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Round Number</span>
                </div>

                <div className="rounded-2xl border border-[#30363d] bg-black/50 p-3.5 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">የክፍሉ ደረጃ</span>
                  <span
                    className={cn(
                      "text-lg sm:text-xl font-black block tracking-wider uppercase",
                      serverRoomState?.phase === "game"
                        ? "text-emerald-400 animate-pulse"
                        : serverRoomState?.phase === "victory"
                        ? "text-purple-400"
                        : "text-amber-400"
                    )}
                  >
                    {serverRoomState?.phase === "game"
                      ? "🔴 ኳስ እየተጠራ ነው"
                      : serverRoomState?.phase === "victory"
                      ? "🏆 አሸናፊ ማስታወቂያ"
                      : "⏳ ካርቴላ መምረጫ"}
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Phase</span>
                </div>

                <div className="rounded-2xl border border-[#30363d] bg-black/50 p-3.5 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">የቀረ ሰዓት (Countdown)</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">
                    {serverRoomState?.countdown ?? globalCountdown}s
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Seconds Remaining</span>
                </div>

                <div className="rounded-2xl border border-gold/30 bg-gold/5 p-3.5 text-center">
                  <span className="text-[10px] uppercase font-bold text-gold/80 block">የቀጥታ ጃክፖት</span>
                  <span className="text-2xl sm:text-3xl font-black text-gold font-mono">
                    {(serverRoomState?.jackpot ?? ((confirmedTicketsCount + pendingTicketsCount + 140) * ticketPrice)).toLocaleString()}{" "}
                    <span className="text-xs">ETB</span>
                  </span>
                  <span className="text-[9px] text-gold/60 block mt-0.5">
                    {serverRoomState?.totalRoomTickets ?? (confirmedTicketsCount + pendingTicketsCount + 140)} ካርቴላዎች
                  </span>
                </div>
              </div>
            </div>

            {/* Master Control Buttons */}
            <div className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-amber-400" />
                <span>🎛️ የቀጥታ ጨዋታ መቆጣጠሪያ ትዕዛዞች (Direct Master Actions)</span>
              </h3>
              <p className="text-xs text-slate-400">
                እነዚህን አዝራሮች በመንካት በሁሉም ተጫዋቾች ስልኮች ላይ ጨዋታውን ወዲያውኑ ማስጀመር ወይም ቀጣይ ዙር መክፈት ይችላሉ።
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {/* 1. Force Start */}
                <button
                  type="button"
                  disabled={adminActionLoading || serverRoomState?.phase === "game"}
                  onClick={handleForceStartGame}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-emerald-500/50 bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all text-center"
                >
                  <span className="text-lg font-black uppercase tracking-wider flex items-center gap-1.5">
                    🚀 አሁኑኑ አስጀምር
                  </span>
                  <span className="text-[11px] text-emerald-200 mt-1">
                    (ሎቢውን አቁሞ ኳስ መጥራት ይጀምራል)
                  </span>
                </button>

                {/* 2. Force Next Round */}
                <button
                  type="button"
                  disabled={adminActionLoading}
                  onClick={handleForceNextRound}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-sky-500/50 bg-gradient-to-br from-sky-600 to-blue-800 text-white shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all text-center"
                >
                  <span className="text-lg font-black uppercase tracking-wider flex items-center gap-1.5">
                    ⏭️ ቀጣይ ዙር ጀምር
                  </span>
                  <span className="text-[11px] text-sky-200 mt-1">
                    (የአሁኑን ዘግቶ አዲስ ዙር ይከፍታል)
                  </span>
                </button>

                {/* 3. Reset All */}
                <button
                  type="button"
                  disabled={adminActionLoading}
                  onClick={handleResetRoom}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-rose-500/50 bg-gradient-to-br from-rose-700 to-red-900 text-white shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all text-center"
                >
                  <span className="text-lg font-black uppercase tracking-wider flex items-center gap-1.5">
                    🔄 ካርቴላዎችን አጽዳ
                  </span>
                  <span className="text-[11px] text-rose-200 mt-1">
                    (ሁሉንም የተያዙ ካርቴላዎች መልስ)
                  </span>
                </button>

                {/* 4. Sync All */}
                <button
                  type="button"
                  disabled={adminActionLoading}
                  onClick={() => {
                    handleSetLobbySeconds(serverRoomState?.lobbyDuration ? Math.floor(serverRoomState.lobbyDuration / 1000) : 45);
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-600 to-orange-800 text-white shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all text-center"
                >
                  <span className="text-lg font-black uppercase tracking-wider flex items-center gap-1.5">
                    📡 Sync All Devices
                  </span>
                  <span className="text-[11px] text-amber-200 mt-1">
                    (ሁሉንም ስልኮች በድጋሚ ያመሳስላል)
                  </span>
                </button>
              </div>

              {/* Lobby Duration Quick Buttons */}
              <div className="rounded-2xl border border-[#30363d] bg-black/40 p-4 mt-3">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  ⏱️ የሎቢ ሰዓት ማስተካከያ (Lobby Countdown Length for all players):
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { s: 20, label: "⚡ 20 ሰከንድ (ፈጣን)" },
                    { s: 30, label: "⏱️ 30 ሰከንድ" },
                    { s: 45, label: "🌟 45 ሰከንድ (መደበኛ)" },
                    { s: 60, label: "⏳ 60 ሰከንድ (ረጅም)" },
                  ].map((btn) => (
                    <button
                      key={btn.s}
                      type="button"
                      onClick={() => handleSetLobbySeconds(btn.s)}
                      className={cn(
                        "rounded-xl border px-3.5 py-2 text-xs font-black transition-all",
                        (serverRoomState?.lobbyDuration && Math.floor(serverRoomState.lobbyDuration / 1000) === btn.s)
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400/50"
                          : "border-[#30363d] bg-slate-800/80 text-slate-300 hover:text-white hover:border-slate-500"
                      )}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Drawn Balls Display */}
            <div className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-gold" />
                  <span>🎯 የወጡ የቀጥታ ኳሶች (Synchronized Called Balls)</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {serverRoomState?.drawnBalls?.length ?? 0} / 20 ኳሶች
                </span>
              </div>

              {serverRoomState?.drawnBalls && serverRoomState.drawnBalls.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {serverRoomState.drawnBalls.map((b, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl font-black text-sm sm:text-base border shadow-md font-mono",
                          isLatest
                            ? "border-gold bg-gradient-to-br from-amber-400 to-amber-600 text-black ring-4 ring-gold/40 scale-110 z-10 animate-bounce"
                            : "border-slate-700 bg-slate-800 text-slate-200"
                        )}
                      >
                        {b}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#30363d] p-6 text-center text-xs text-slate-500">
                  ጨዋታው እስኪጀመር ድረስ ኳሶች አልወጡም። ሎቢው ሲያልቅ ወይም "አሁኑኑ አስጀምር" ሲጫኑ ኳሶች በቅጽበት ይወጣሉ!
                </div>
              )}
            </div>

            {/* Live Taken Cartelas Inspector */}
            <div className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-emerald-400" />
                    <span>👥 በቀጥታ የተያዙ ካርቴላዎች ዝርዝር (Live Taken Cartelas)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    በተለያዩ ስልኮች እና ተጫዋቾች የተመረጡ ካርቴላዎች ዝርዝር በቅጽበት የሚታይበት ሠንጠረዥ።
                  </p>
                </div>
                <span className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">
                  ጠቅላላ: {serverRoomState?.takenTickets?.length ?? 0} ካርቴላዎች (+{(serverRoomState?.takenTickets?.length ?? 0) * 10} ETB)
                </span>
              </div>

              {serverRoomState?.takenTickets && serverRoomState.takenTickets.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-96 overflow-y-auto pr-1">
                  {serverRoomState.takenTickets.map((tNum) => {
                    const detail = serverRoomState.takenDetails?.[tNum];
                    const isReal = detail && !detail.userId.startsWith("opp_");
                    return (
                      <div
                        key={tNum}
                        className={cn(
                          "rounded-xl border p-2.5 flex flex-col justify-between text-xs transition-all",
                          isReal
                            ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-300 shadow-md"
                            : "border-slate-700 bg-black/40 text-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-base font-black text-white">#{tNum}</span>
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase",
                              isReal ? "bg-emerald-500 text-black" : "bg-slate-700 text-slate-300"
                            )}
                          >
                            {isReal ? "👤 REAL" : "🤖 OPP"}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <span className="font-bold block truncate text-[11px] text-white">
                            {detail?.userName || "ተጫዋች"}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 block truncate">
                            {detail?.userPhone || "09********"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#30363d] p-6 text-center text-xs text-slate-500">
                  በዚህ ዙር እስካሁን ምንም ካርቴላ አልተያዘም።
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 9: SETTINGS & CONTROLS */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            {/* Bank Settings */}
            <div className="rounded-2xl border border-cyan-500/40 border-l-4 border-l-cyan-400 bg-[#161b22] p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-black uppercase text-cyan-400">
                🏦 የባንክ አካውንት መቆጣጠሪያ (Bank Settings)
              </h3>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3.5 space-y-2">
                  <h4 className="text-xs font-black text-blue-400">📱 Telebirr</h4>
                  <input
                    type="text"
                    value={tbName}
                    onChange={(e) => setTbName(e.target.value)}
                    placeholder="Account Name"
                    className="w-full rounded-lg border border-[#30363d] bg-black px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={tbNum}
                    onChange={(e) => setTbNum(e.target.value)}
                    placeholder="Account Number"
                    className="w-full rounded-lg border border-[#30363d] bg-black px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3.5 space-y-2">
                  <h4 className="text-xs font-black text-purple-400">🏦 CBE Birr</h4>
                  <input
                    type="text"
                    value={cbeName}
                    onChange={(e) => setCbeName(e.target.value)}
                    placeholder="Account Name"
                    className="w-full rounded-lg border border-[#30363d] bg-black px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={cbeNum}
                    onChange={(e) => setCbeNum(e.target.value)}
                    placeholder="Account Number"
                    className="w-full rounded-lg border border-[#30363d] bg-black px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-2">
                  <h4 className="text-xs font-black text-emerald-400">🟢 M-Pesa</h4>
                  <input
                    type="text"
                    value={mpesaName}
                    onChange={(e) => setMpesaName(e.target.value)}
                    placeholder="Account Name"
                    className="w-full rounded-lg border border-[#30363d] bg-black px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={mpesaNum}
                    onChange={(e) => setMpesaNum(e.target.value)}
                    placeholder="Account Number"
                    className="w-full rounded-lg border border-[#30363d] bg-black px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <button
                onClick={() => alert("✅ Bank Accounts Successfully Saved!")}
                className="w-full rounded-xl bg-cyan-500 py-2.5 text-xs font-black text-black hover:bg-cyan-400"
              >
                💾 Save Bank Accounts
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {selectedUserInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-cyan-500/40 bg-[#161b22] p-5 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-black text-cyan-400">
              👤 User Information & Manual Deposit
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl border border-[#30363d] bg-black/40 p-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400">Name</span>
                <div className="font-bold text-white">{selectedUserInfo.name}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Phone</span>
                <div className="font-mono text-cyan-400">{selectedUserInfo.phone}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Play Balance</span>
                <div className="font-bold text-emerald-400">{selectedUserInfo.playBalance.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Main Balance</span>
                <div className="font-bold text-gold">{selectedUserInfo.mainBalance.toFixed(2)}</div>
              </div>
            </div>

            {/* Support Manual Deposit Box */}
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2">
              <h4 className="font-black text-emerald-400">
                📥 Support ደረሰኝ መሙያ (Manual Deposit)
              </h4>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={manualTxRef}
                  onChange={(e) => setManualTxRef(e.target.value)}
                  placeholder="ደረሰኝ ቁጥር (TxRef)"
                  className="flex-1 rounded-xl border border-[#30363d] bg-black px-3 py-2 text-white text-xs"
                />
                <input
                  type="number"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="ብር መጠን"
                  className="w-24 rounded-xl border border-[#30363d] bg-black px-3 py-2 text-white text-xs"
                />
                <button
                  onClick={handleManualDeposit}
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-black text-black hover:bg-emerald-400"
                >
                  ✅ ብር ሙላ
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedUserInfo(null)}
              className="w-full rounded-xl bg-red-600 py-2.5 font-bold text-white hover:bg-red-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {selectedSmsDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-emerald-500/40 bg-[#161b22] p-5 shadow-2xl space-y-3 text-xs">
            <h3 className="text-sm font-black text-emerald-400">🧾 SMS Details</h3>
            <div className="rounded-xl bg-black/60 p-3 font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {selectedSmsDetail.smsText}
            </div>
            <button
              onClick={() => setSelectedSmsDetail(null)}
              className="w-full rounded-xl bg-red-600 py-2.5 font-bold text-white hover:bg-red-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showLivePlayersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-purple-500/40 bg-[#161b22] p-5 shadow-2xl space-y-3 text-xs">
            <h3 className="text-sm font-black text-purple-400 text-center">
              🎮 Currently Live Players
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              <div className="flex justify-between items-center rounded-xl bg-black/40 p-2.5">
                <div>
                  <div className="font-bold text-white">Amar Meftuh (👤 REAL)</div>
                  <div className="font-mono text-cyan-400 text-[11px]">0932881122</div>
                </div>
                <span className="text-gold font-bold">4 Cards</span>
              </div>
              {bots.slice(0, 5).map((b) => (
                <div key={b.id} className="flex justify-between items-center rounded-xl bg-black/40 p-2.5">
                  <div>
                    <div className="font-bold text-slate-300">{b.name} (🤖 BOT)</div>
                    <div className="font-mono text-slate-500 text-[11px]">{b.phone}</div>
                  </div>
                  <span className="text-slate-400 font-bold">{b.cardsCount} Cards</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowLivePlayersModal(false)}
              className="w-full rounded-xl bg-red-600 py-2.5 font-bold text-white hover:bg-red-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
