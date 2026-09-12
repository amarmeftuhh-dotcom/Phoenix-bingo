/**
 * Phoenix Bingo - Unified Platform Store & Telegram Integration
 * 
 * Manages:
 * 1. Automatic Telegram Login (Zero Password Friction for Players)
 * 2. Real-time Deposit & Withdrawal sync between Players & Admin
 * 3. Fresh Clean-Slate Finance Engine starting from ZERO (0 ETB)
 * 4. Direct Telegram Bot Dispatch for Deposit alerts, Approvals, & Broadcasts
 */

export interface PlayerProfile {
  id: string;
  telegramId?: number;
  name: string;
  username?: string;
  phone: string;
  photoUrl?: string;
  isVerified: boolean;
  isAutoLoggedIn: boolean;
  mainWallet: number;
  playWallet: number;
  gamesPlayed: number;
  totalWon: number;
  joinedAt: string;
}

export interface PlatformTx {
  id: string;
  date: string;
  playerId: string;
  playerName: string;
  phone: string;
  bank: string;
  amount: number;
  smsText?: string;
  txRef?: string;
  destinationAccount?: string;
  type: "deposit" | "withdraw";
  status: "Pending" | "Approved" | "Rejected";
}

export interface FinanceMetrics {
  historicalTurnover: number;
  historicalWinningsPaid: number;
  historicalGrossProfit: number;
  bonusExpenses: number;
  promoterCommPaid: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalUsersCount: number;
  activeTodayCount: number;
}

export interface RegisteredUser {
  id: string;
  telegramId?: number;
  name: string;
  username?: string;
  phone: string;
  playBalance: number;
  mainBalance: number;
  totalDeposited: number;
  won: number;
  status: "active" | "banned";
  lastActive: string;
}

// Telegram Bot credentials
export const TELEGRAM_BOT_TOKEN = "8606075616:AAEFVgE-_lIz33iYUBB6fzcWYPwXOm4f72g";
export const TELEGRAM_BOT_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
export const DEFAULT_ADMIN_USERNAME = "@Phonix_s";

// --- Telegram WebApp Helper ---
export function getTelegramWebAppUser() {
  if (typeof window === "undefined") return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string } } } } }).Telegram?.WebApp;
  return tg?.initDataUnsafe?.user || null;
}

// Expand Telegram WebApp on launch
if (typeof window !== "undefined") {
  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void } } }).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  } catch {}
}

// --- Player Profile Store ---
const STORAGE_KEY_PLAYER = "phoenix_active_player";
const STORAGE_KEY_TXS = "phoenix_platform_transactions";
const STORAGE_KEY_FINANCE = "phoenix_finance_metrics_v2";
const STORAGE_KEY_USERS = "phoenix_registered_users_v2";
const STORAGE_KEY_BROADCAST = "phoenix_live_broadcast";

export function getStoredPlayer(): PlayerProfile {
  const tgUser = getTelegramWebAppUser();
  
  // Read parameters from search or hash (e.g. ?tgId=...&phone=...&name=...&bonus=...&balance=...)
  let urlParams: URLSearchParams | null = null;
  if (typeof window !== "undefined") {
    urlParams = new URLSearchParams(window.location.search);
    if (window.location.hash && window.location.hash.includes("?")) {
      const hashQuery = window.location.hash.split("?")[1];
      const hashParams = new URLSearchParams(hashQuery);
      hashParams.forEach((v, k) => {
        if (!urlParams!.has(k)) urlParams!.set(k, v);
      });
    }
  }

  let baseProfile: PlayerProfile;

  try {
    const saved = localStorage.getItem(STORAGE_KEY_PLAYER);
    if (saved) {
      baseProfile = JSON.parse(saved);
      // Ensure defaults if missing or corrupted
      if (typeof baseProfile.mainWallet !== "number" || isNaN(baseProfile.mainWallet)) {
        baseProfile.mainWallet = 0.0;
      }
      if (typeof baseProfile.playWallet !== "number" || isNaN(baseProfile.playWallet)) {
        baseProfile.playWallet = 15.0; // 15 ETB Play Bonus
      }
    } else {
      // Start completely FRESH with 15.00 ETB Play Bonus and 0.00 ETB Main Wallet
      baseProfile = {
        id: tgUser ? `tg-${tgUser.id}` : `PX-${Math.floor(1000 + Math.random() * 9000)}`,
        telegramId: tgUser?.id,
        name: tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") : "ተጫዋች (Player)",
        username: tgUser?.username ? `@${tgUser.username}` : undefined,
        phone: "",
        photoUrl: tgUser?.photo_url,
        isVerified: !!tgUser,
        isAutoLoggedIn: !!tgUser,
        mainWallet: 0.0, // 0.00 ETB Main Wallet (Withdrawable)
        playWallet: 15.0, // 15.00 ETB Play Wallet (Initial Bonus)
        gamesPlayed: 0,
        totalWon: 0,
        joinedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
    }
  } catch {
    baseProfile = {
      id: `PX-${Math.floor(1000 + Math.random() * 9000)}`,
      name: "ተጫዋች (Player)",
      phone: "",
      isVerified: false,
      isAutoLoggedIn: false,
      mainWallet: 0.0,
      playWallet: 15.0, // 15.00 ETB Play Wallet
      gamesPlayed: 0,
      totalWon: 0,
      joinedAt: "Today",
    };
  }

  // URL override/sync from Telegram Bot link
  if (urlParams) {
    const qTgId = urlParams.get("tgId");
    if (qTgId) {
      baseProfile.telegramId = Number(qTgId);
      baseProfile.id = `tg-${qTgId}`;
      baseProfile.isAutoLoggedIn = true;
      baseProfile.isVerified = true;
    }
    const qPhone = urlParams.get("phone");
    if (qPhone && qPhone.trim()) {
      baseProfile.phone = decodeURIComponent(qPhone).trim();
      baseProfile.isVerified = true;
    }
    const qName = urlParams.get("name");
    if (qName && qName.trim()) {
      baseProfile.name = decodeURIComponent(qName).trim();
    }
    const qBonus = urlParams.get("bonus");
    if (qBonus && !isNaN(parseFloat(qBonus))) {
      baseProfile.playWallet = parseFloat(qBonus);
    }
    const qBalance = urlParams.get("balance");
    if (qBalance && !isNaN(parseFloat(qBalance))) {
      baseProfile.mainWallet = parseFloat(qBalance);
    }
  }

  // If user opened inside Telegram, automatically update/sync their Telegram Identity
  if (tgUser) {
    baseProfile.telegramId = tgUser.id;
    baseProfile.isAutoLoggedIn = true;
    baseProfile.isVerified = true;
    if (tgUser.first_name || tgUser.last_name) {
      baseProfile.name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ");
    }
    if (tgUser.username) {
      baseProfile.username = `@${tgUser.username}`;
    }
    if (tgUser.photo_url) {
      baseProfile.photoUrl = tgUser.photo_url;
    }
  }

  return baseProfile;
}

export function getStoredWalletBalances(): { mainWallet: number; playWallet: number } {
  const player = getStoredPlayer();
  return {
    mainWallet: typeof player.mainWallet === "number" && !isNaN(player.mainWallet) ? player.mainWallet : 0.0,
    playWallet: typeof player.playWallet === "number" && !isNaN(player.playWallet) ? player.playWallet : 15.0,
  };
}

export function saveStoredWalletBalances(mainWallet: number, playWallet: number) {
  try {
    const player = getStoredPlayer();
    player.mainWallet = mainWallet;
    player.playWallet = playWallet;
    saveStoredPlayer(player);
    window.dispatchEvent(new CustomEvent("phoenix_wallet_updated", { detail: { mainWallet, playWallet } }));
  } catch {}
}

export function saveStoredPlayer(player: PlayerProfile) {
  try {
    localStorage.setItem(STORAGE_KEY_PLAYER, JSON.stringify(player));
    // Also sync with registered users list for Admin View
    syncPlayerToUsersDirectory(player);
    window.dispatchEvent(new CustomEvent("phoenix_player_updated", { detail: player }));
  } catch {}
}

// --- Registered Users Store for Admin ---
export function getRegisteredUsers(): RegisteredUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) return JSON.parse(raw);
  } catch {}
  
  // Clean initial: register current player
  const current = getStoredPlayer();
  const initial = [
    {
      id: current.id,
      telegramId: current.telegramId,
      name: current.name,
      username: current.username,
      phone: current.phone || "Not linked",
      playBalance: current.playWallet,
      mainBalance: current.mainWallet,
      totalDeposited: 0,
      won: current.totalWon,
      status: "active" as const,
      lastActive: "Active now",
    },
  ];
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(initial));
  } catch {}
  return initial;
}

export function saveRegisteredUsers(users: RegisteredUser[]) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent("phoenix_users_updated", { detail: users }));
  } catch {}
}

function syncPlayerToUsersDirectory(player: PlayerProfile) {
  try {
    const users = getRegisteredUsers();
    const idx = users.findIndex((u) => u.id === player.id || (player.telegramId && u.telegramId === player.telegramId));
    if (idx >= 0) {
      users[idx] = {
        ...users[idx]!,
        name: player.name,
        username: player.username,
        phone: player.phone || users[idx]!.phone,
        mainBalance: player.mainWallet,
        playBalance: player.playWallet,
        won: player.totalWon,
        lastActive: "Active now",
      };
    } else {
      users.unshift({
        id: player.id,
        telegramId: player.telegramId,
        name: player.name,
        username: player.username,
        phone: player.phone || "Not linked",
        mainBalance: player.mainWallet,
        playBalance: player.playWallet,
        totalDeposited: 0,
        won: player.totalWon,
        status: "active",
        lastActive: "Active now",
      });
    }
    saveRegisteredUsers(users);
  } catch {}
}

// --- Transactions Store (Starts Clean: 0 pending old items) ---
export function getStoredTransactions(): PlatformTx[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TXS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return []; // Clean empty start!
}

export function saveStoredTransactions(txs: PlatformTx[]) {
  try {
    localStorage.setItem(STORAGE_KEY_TXS, JSON.stringify(txs));
    window.dispatchEvent(new CustomEvent("phoenix_transactions_updated", { detail: txs }));
  } catch {}
}

// --- Player Deposit Request ---
export async function submitPlayerDeposit(params: {
  amount: number;
  bank: string;
  phone?: string;
  smsText?: string;
  txRef?: string;
}): Promise<PlatformTx> {
  const player = getStoredPlayer();
  const txId = `TX-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const newTx: PlatformTx = {
    id: txId,
    date: dateStr,
    playerId: player.id,
    playerName: player.name,
    phone: params.phone || player.phone || "N/A",
    bank: params.bank,
    amount: params.amount,
    smsText: params.smsText || `Deposit via ${params.bank}`,
    txRef: params.txRef || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
    type: "deposit",
    status: "Pending",
  };

  const txs = getStoredTransactions();
  const updated = [newTx, ...txs];
  saveStoredTransactions(updated);

  // Send Telegram notification to Admin!
  const alertText = 
`🔔 <b>አዲስ የገቢ (Deposit) ጥያቄ ደርሷል!</b>

• <b>ተጫዋች:</b> ${player.name} (${player.username || player.id})
• <b>መጠን:</b> <b>${params.amount} ETB</b>
• <b>የክፍያ መንገድ:</b> ${params.bank}
• <b>ስልክ:</b> ${newTx.phone}
• <b>TxRef:</b> <code>${newTx.txRef}</code>
• <b>ደረሰኝ/SMS:</b> <i>${newTx.smsText?.slice(0, 100)}</i>

👉 አድሚን ዳሽቦርድ ላይ ማጽደቅ ወይም መሰረዝ ይችላሉ!`;

  sendTelegramAlert(alertText).catch(() => {});

  return newTx;
}

// --- Player Withdrawal Request ---
export async function submitPlayerWithdrawal(params: {
  amount: number;
  bank: string;
  destinationAccount: string;
  phone?: string;
}): Promise<{ success: boolean; message?: string; tx?: PlatformTx }> {
  const player = getStoredPlayer();
  if (params.amount > player.mainWallet) {
    return { success: false, message: "በቂ ቀሪ ሂሳብ የለም!" };
  }

  // Deduct from player's balance immediately to hold funds safely
  player.mainWallet = Math.max(0, player.mainWallet - params.amount);
  saveStoredPlayer(player);

  const txId = `TX-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const newTx: PlatformTx = {
    id: txId,
    date: dateStr,
    playerId: player.id,
    playerName: player.name,
    phone: params.phone || player.phone || "N/A",
    bank: params.bank,
    amount: -params.amount,
    destinationAccount: params.destinationAccount,
    type: "withdraw",
    status: "Pending",
  };

  const txs = getStoredTransactions();
  saveStoredTransactions([newTx, ...txs]);

  // Send Telegram notification to Admin!
  const alertText = 
`📤 <b>አዲስ የወጪ (Withdrawal) ጥያቄ ደርሷል!</b>

• <b>ተጫዋች:</b> ${player.name} (${player.username || player.id})
• <b>የወጪ መጠን:</b> <b>${params.amount} ETB</b>
• <b>መላኪያ ባንክ:</b> ${params.bank}
• <b>የተጠቃሚ ሂሳብ/ቁጥር:</b> <code>${params.destinationAccount}</code>

👉 አድሚን ዳሽቦርድ ላይ ያረጋግጡ!`;

  sendTelegramAlert(alertText).catch(() => {});

  return { success: true, tx: newTx };
}

// --- Admin Approves Transaction ---
export function approvePlatformTransaction(txId: string): boolean {
  const txs = getStoredTransactions();
  const tx = txs.find((t) => t.id === txId);
  if (!tx || tx.status !== "Pending") return false;

  tx.status = "Approved";
  saveStoredTransactions([...txs]);

  // Update Finance
  const finance = getStoredFinanceMetrics();
  if (tx.type === "deposit") {
    finance.totalDeposits += Math.abs(tx.amount);
    
    // Credit player if it's the current player
    const player = getStoredPlayer();
    if (player.id === tx.playerId) {
      player.mainWallet += Math.abs(tx.amount);
      // Optional 20% bonus for 100+ ETB
      if (Math.abs(tx.amount) >= 100) {
        player.playWallet += Math.abs(tx.amount) * 0.2;
      }
      saveStoredPlayer(player);
    } else {
      // Update registered users table
      const users = getRegisteredUsers();
      const u = users.find((x) => x.id === tx.playerId);
      if (u) {
        u.mainBalance += Math.abs(tx.amount);
        u.totalDeposited += Math.abs(tx.amount);
        saveRegisteredUsers(users);
      }
    }
  } else {
    // Withdrawal approved
    finance.totalWithdrawals += Math.abs(tx.amount);
  }
  saveStoredFinanceMetrics(finance);

  // Send Telegram confirmation notification
  const confirmText = 
`✅ <b>የግብይት ማረጋገጫ (Transaction Approved)</b>

• <b>መለያ ቁጥር:</b> <code>${tx.id}</code>
• <b>አይነት:</b> ${tx.type === "deposit" ? "ገቢ (Deposit) 📥" : "ወጪ (Withdrawal) 📤"}
• <b>መጠን:</b> <b>${Math.abs(tx.amount)} ETB</b>
• <b>ሁኔታ:</b> ጸድቋል (Approved) ✅`;

  sendTelegramAlert(confirmText).catch(() => {});
  return true;
}

// --- Admin Rejects Transaction ---
export function rejectPlatformTransaction(txId: string): boolean {
  const txs = getStoredTransactions();
  const tx = txs.find((t) => t.id === txId);
  if (!tx || tx.status !== "Pending") return false;

  tx.status = "Rejected";
  saveStoredTransactions([...txs]);

  // If withdrawal was rejected, refund the held money back to player
  if (tx.type === "withdraw") {
    const refundAmt = Math.abs(tx.amount);
    const player = getStoredPlayer();
    if (player.id === tx.playerId) {
      player.mainWallet += refundAmt;
      saveStoredPlayer(player);
    } else {
      const users = getRegisteredUsers();
      const u = users.find((x) => x.id === tx.playerId);
      if (u) {
        u.mainBalance += refundAmt;
        saveRegisteredUsers(users);
      }
    }
  }

  return true;
}

// --- Finance Metrics Store (Starts at ZERO) ---
const DEFAULT_FINANCE: FinanceMetrics = {
  historicalTurnover: 0.0,
  historicalWinningsPaid: 0.0,
  historicalGrossProfit: 0.0,
  bonusExpenses: 0.0,
  promoterCommPaid: 0.0,
  totalDeposits: 0.0,
  totalWithdrawals: 0.0,
  totalUsersCount: 1,
  activeTodayCount: 1,
};

export function getStoredFinanceMetrics(): FinanceMetrics {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FINANCE);
    if (raw) return { ...DEFAULT_FINANCE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_FINANCE;
}

export function saveStoredFinanceMetrics(metrics: FinanceMetrics) {
  try {
    localStorage.setItem(STORAGE_KEY_FINANCE, JSON.stringify(metrics));
    window.dispatchEvent(new CustomEvent("phoenix_finance_updated", { detail: metrics }));
  } catch {}
}

export function resetFinanceToZero() {
  saveStoredFinanceMetrics(DEFAULT_FINANCE);
}

// --- Telegram Direct Dispatcher ---
export async function sendTelegramAlert(messageText: string, customChatId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // If customChatId is not provided, try to send to admin channel or saved chat id
    const targetChat = customChatId || localStorage.getItem("phoenix_admin_chat_id") || DEFAULT_ADMIN_USERNAME;

    const res = await fetch(`${TELEGRAM_BOT_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChat,
        text: messageText,
        parse_mode: "HTML",
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true };
    } else {
      console.warn("Telegram API response:", data);
      return { success: false, error: data.description || "Failed" };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error sending Telegram alert:", msg);
    return { success: false, error: msg };
  }
}

// --- Live Broadcast Store & Dispatcher ---
export function getStoredBroadcast(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_BROADCAST) || "⚡ Instant Telebirr, CBE & M-Pesa Payouts • የቀጥታ ጃክፖት ሽልማት ክፍያ Live";
  } catch {
    return "⚡ Instant Telebirr, CBE & M-Pesa Payouts • የቀጥታ ጃክፖት ሽልማት ክፍያ Live";
  }
}

export async function broadcastMessage(text: string, target: "all" | "telegram" | "web" = "all"): Promise<{ success: boolean; telegramStatus?: string }> {
  // 1. Update web announcement bar
  if (target === "all" || target === "web") {
    try {
      localStorage.setItem(STORAGE_KEY_BROADCAST, text);
      window.dispatchEvent(new CustomEvent("phoenix_broadcast_updated", { detail: text }));
    } catch {}
  }

  // 2. Dispatch to Telegram
  let telegramStatus = "Skipped";
  if (target === "all" || target === "telegram") {
    const tgMsg = `📢 <b>የፊኒክስ ቢንጎ የቀጥታ ማስታወቂያ (Official Announcement)</b>\n\n${text}\n\n🎮 <b>አሁኑኑ ይጫወቱ:</b> https://phoenix-bingo.onrender.com`;
    const res = await sendTelegramAlert(tgMsg);
    telegramStatus = res.success ? "Sent successfully ✅" : `Failed: ${res.error}`;
  }

  return { success: true, telegramStatus };
}
