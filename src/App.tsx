import { useState, useEffect, useRef, useCallback } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { BottomNav, type NavTab } from "@/components/phoenix/BottomNav";
import { LobbyView } from "@/views/LobbyView";
import { GameView } from "@/views/GameView";
import { WalletView } from "@/views/WalletView";
import { RankView } from "@/views/RankView";
import { ProfileView } from "@/views/ProfileView";
import { AdminView } from "@/views/AdminView";
import { FinanceView } from "@/views/FinanceView";
import { VictoryModal, type Winner } from "@/components/phoenix/VictoryModal";
import {
  generateBoardForTicket,
  randomDraw,
  checkBingo,
  MAX_NUMBER,
  buzz,
  type Cell,
} from "@/lib/bingo";
import { playNumberCallVoice, playBingoFanfare } from "@/lib/sound";
import { WifiOff, Sparkles, X, Check } from "lucide-react";
import {
  getStoredBotSettings,
  getStoredBonusEnabled,
  type BotSettings,
} from "@/lib/botConfig";
import {
  getStoredPlayer,
  saveStoredPlayer,
  getStoredWalletBalances,
  saveStoredWalletBalances,
  claimWelcomePlayBonus,
} from "@/lib/platformStore";
import {
  getLiveRoundSnapshot,
  saveUserRoundTickets,
  getUserRoundTickets,
  clearOldRoundTickets,
} from "@/lib/liveSyncEngine";
import {
  fetchServerRoomState,
  claimRemoteTicket,
  releaseRemoteTicket,
  subscribeRoomSync,
} from "@/lib/roomSyncService";

const TOTAL_TICKETS = 550;
const STAKE_PER_TICKET = 10;
const MAX_SELECT = 4;

const BOT_NAMES = [
  "አበበ", "ጫላ", "አስቴር", "ሄኖክ", "ዳዊት", "ማክዳ", "ዮሴፍ", "ቃልኪዳን", "ሳሙኤል", "ቤዛዊት",
  "አለሙ", "ተስፋዬ", "መሰረት", "ሀና", "ዮናስ", "ናትናኤል", "እየሩሳሌም", "ኤደን", "ቢኒያም", "ቴዎድሮስ",
  "አብርሀም", "ሳራ", "አቤል", "ሚካኤል", "ዘላለም", "ፍሬዘር", "እንዳለ", "ብርሀኑ", "ጌታሁን", "መላኩ",
  "አየለ", "በላይ", "ሀይሌ", "ታደሰ", "ታምራት", "አማኑኤል", "ሀብታሙ", "ደጀኔ", "አዳነ", "አሊ",
  "ከድር", "ጀማል", "ፋጡማ", "አሚና", "ሰሚራ", "አስናቀች", "ፀሀይ", "ሮማን", "መቅደስ", "ትዕግስት",
  "ሰለሞን", "ዳንኤል", "ኤርሚያስ", "በእምነት", "አሮን", "ናሆም", "ኪሩቤል", "ያብስራ", "በረከት", "ቸርነት"
];

export function App() {
  // Synchronized Live Room initial snapshot
  const initialSnap = getLiveRoundSnapshot();
  const [currentRoundId, setCurrentRoundId] = useState<number>(initialSnap.roundId);

  // Restore saved tickets for this round from localStorage
  const savedTickets = getUserRoundTickets(initialSnap.roundId);

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "").split("?")[0].toLowerCase();
      if (["wallet", "rules", "history", "profile", "admin", "finance", "rank"].includes(hash)) {
        return hash as NavTab;
      }
    }
    if (initialSnap.isGameStarted && savedTickets.length > 0) {
      return "game";
    }
    return "home";
  });

  // If in lobby phase, restored tickets belong in pendingTickets so player sees their chosen cartelas!
  // If in game phase, restored tickets belong in confirmedTickets so player is in the active game.
  const [pendingTickets, setPendingTickets] = useState<number[]>(() => {
    return initialSnap.phase === "lobby" ? savedTickets : [];
  });
  const [confirmedTickets, setConfirmedTickets] = useState<number[]>(() => {
    return initialSnap.phase !== "lobby" ? savedTickets : [];
  });
  const [takenTickets, setTakenTickets] = useState<number[]>(initialSnap.takenTickets);
  const [serverTakenTickets, setServerTakenTickets] = useState<number[]>([]);
  const [waitingForPlayers, setWaitingForPlayers] = useState<boolean>(initialSnap.waitingForPlayers);
  const [mainWallet, setMainWallet] = useState<number>(() => getStoredWalletBalances().mainWallet);
  const [playWallet, setPlayWallet] = useState<number>(() => getStoredWalletBalances().playWallet);

  // Sync balances persistently with localStorage & platform store
  useEffect(() => {
    saveStoredWalletBalances(mainWallet, playWallet);
  }, [mainWallet, playWallet]);

  // Real-time synchronization when platformStore or Telegram updates balances
  useEffect(() => {
    const handleWalletSync = () => {
      const b = getStoredWalletBalances();
      setMainWallet(b.mainWallet);
      setPlayWallet(b.playWallet);
    };
    window.addEventListener("phoenix_wallet_updated", handleWalletSync);
    window.addEventListener("phoenix_player_updated", handleWalletSync);
    return () => {
      window.removeEventListener("phoenix_wallet_updated", handleWalletSync);
      window.removeEventListener("phoenix_player_updated", handleWalletSync);
    };
  }, []);

  // Online / Offline monitor
  const [isOffline, setIsOffline] = useState(false);

  // Floating bonus (Controlled exclusively by Admin - default OFF) & Promo code modal
  const [showPromoFloat, setShowPromoFloat] = useState<boolean>(getStoredBonusEnabled);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoToast, setPromoToast] = useState<string | null>(null);

  // Continuous Global Synchronized Live Game Engine (Identical across all devices)
  const [globalCountdown, setGlobalCountdown] = useState<number>(initialSnap.countdown);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(initialSnap.isGameStarted);
  const [drawn, setDrawn] = useState<number[]>(initialSnap.drawnBalls);
  const [won, setWon] = useState<boolean>(initialSnap.phase === "victory");
  const [winners, setWinners] = useState<Winner[]>([]);
  const [ticketsData, setTicketsData] = useState<Record<number, Cell[]>>({});
  const [liveJackpot, setLiveJackpot] = useState<number>(initialSnap.jackpot);
  const [totalRoomTickets, setTotalRoomTickets] = useState<number>(initialSnap.totalRoomTickets);

  const activeTickets = Array.from(new Set([...confirmedTickets, ...pendingTickets]));

  const totalRoomTicketsRef = useRef(totalRoomTickets);
  useEffect(() => {
    totalRoomTicketsRef.current = totalRoomTickets;
  }, [totalRoomTickets]);

  // Announcement Text
  const [announcementText, setAnnouncementText] = useState(
    "⚡ Instant Telebirr, CBE & M-Pesa Payouts • የቀጥታ ጃክፖት ሽልማት ክፍያ Live"
  );

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Listen for dedicated standalone URLs (e.g. #admin, #finance, #amuka, /admin, /finance)
  useEffect(() => {
    const checkSpecialRoutes = () => {
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();

      if (
        search.includes("amuka-finance") ||
        search.includes("finance") ||
        hash.includes("amuka-finance") ||
        hash.includes("finance") ||
        pathname.includes("amuka-finance") ||
        pathname.includes("finance")
      ) {
        setActiveTab("finance");
      } else if (
        search.includes("amuka") ||
        search.includes("admin") ||
        hash.includes("amuka") ||
        hash.includes("admin") ||
        pathname.includes("amuka") ||
        pathname.includes("admin")
      ) {
        setActiveTab("admin");
      } else if (hash.includes("game")) {
        setActiveTab("game");
      } else if (hash.includes("wallet")) {
        setActiveTab("wallet");
      } else if (hash.includes("rank")) {
        setActiveTab("rank");
      } else if (hash.includes("profile")) {
        setActiveTab("profile");
      } else if (hash === "" || hash === "#" || hash === "#home") {
        setActiveTab("home");
      }
    };

    checkSpecialRoutes();
    window.addEventListener("hashchange", checkSpecialRoutes);
    window.addEventListener("popstate", checkSpecialRoutes);
    return () => {
      window.removeEventListener("hashchange", checkSpecialRoutes);
      window.removeEventListener("popstate", checkSpecialRoutes);
    };
  }, []);

  // Dynamic Bot Settings synchronized with Admin Panel
  const [botSettings, setBotSettings] = useState<BotSettings>(getStoredBotSettings);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setBotSettings(getStoredBotSettings());
    };
    const handleBonusToggle = (e: CustomEvent<boolean>) => {
      setShowPromoFloat(!!e.detail);
    };
    const handleAddBots = (e: CustomEvent<number>) => {
      const count = Number(e.detail) || 5;
      setTakenTickets((prev) => {
        const pool = new Set(prev);
        let attempts = 0;
        while (pool.size < prev.length + count && attempts < count * 5) {
          attempts++;
          const cand = Math.floor(Math.random() * TOTAL_TICKETS) + 1;
          if (!activeTickets.includes(cand)) {
            pool.add(cand);
          }
        }
        return Array.from(pool);
      });
    };
    const handleClearBots = () => {
      setTakenTickets([]);
    };

    window.addEventListener("phoenix_bot_settings_updated", handleSettingsUpdate);
    window.addEventListener("phoenix_bonus_toggle_updated", handleBonusToggle as EventListener);
    window.addEventListener("phoenix_admin_add_bots", handleAddBots as EventListener);
    window.addEventListener("phoenix_admin_clear_bots", handleClearBots as EventListener);

    return () => {
      window.removeEventListener("phoenix_bot_settings_updated", handleSettingsUpdate);
      window.removeEventListener("phoenix_bonus_toggle_updated", handleBonusToggle as EventListener);
      window.removeEventListener("phoenix_admin_add_bots", handleAddBots as EventListener);
      window.removeEventListener("phoenix_admin_clear_bots", handleClearBots as EventListener);
    };
  }, [activeTickets]);

  // Synchronized ball caller reference to prevent sound spam on reload
  const lastDrawnCountRef = useRef<number>(initialSnap.drawnBalls.length);

  // 1. Synchronized Universal Game Room Loop (500ms precision sync)
  useEffect(() => {
    // Initial fetch from server
    fetchServerRoomState(currentRoundId);

    // Subscribe to multi-device updates
    const unsubscribe = subscribeRoomSync(({ roundId, takenTickets }) => {
      if (roundId === currentRoundId) {
        setServerTakenTickets(takenTickets);
      }
    });

    const syncInterval = setInterval(() => {
      const activeUserTickets = Array.from(new Set([...confirmedTickets, ...pendingTickets]));
      const player = getStoredPlayer();
      const snap = getLiveRoundSnapshot(activeUserTickets, serverTakenTickets, {
        name: player.name,
        phone: player.phone,
      });

      // Periodic poll from server for cross-device updates
      if (Date.now() % 2000 < 550) {
        fetchServerRoomState(snap.roundId);
      }

      // A. New Round Rollover (Epoch boundary reached)
      if (snap.roundId !== currentRoundId) {
        setCurrentRoundId(snap.roundId);
        setConfirmedTickets([]);
        setPendingTickets([]);
        setServerTakenTickets([]);
        setWon(false);
        setWinners([]);
        setIsGameStarted(false);
        setDrawn([]);
        setGlobalCountdown(snap.countdown);
        setTakenTickets(snap.takenTickets);
        setLiveJackpot(snap.jackpot);
        setTotalRoomTickets(snap.totalRoomTickets);
        setWaitingForPlayers(snap.waitingForPlayers);
        lastDrawnCountRef.current = 0;
        clearOldRoundTickets(snap.roundId);
        return;
      }

      // B. Sync Live Room Meta & Timer
      setGlobalCountdown(snap.countdown);
      setTakenTickets(snap.takenTickets);
      setLiveJackpot(snap.jackpot);
      setTotalRoomTickets(snap.totalRoomTickets);
      setWaitingForPlayers(snap.waitingForPlayers);

      // C. Sync Phases
      if (snap.phase === "lobby") {
        setIsGameStarted(false);
        setWon(false);
        setDrawn([]);
      } else if (snap.phase === "game") {
        setIsGameStarted(true);

        // Auto-confirm pending tickets when round starts
        if (pendingTickets.length > 0) {
          const allConfirmed = Array.from(new Set([...confirmedTickets, ...pendingTickets]));
          setConfirmedTickets(allConfirmed);
          setPendingTickets([]);
          saveUserRoundTickets(snap.roundId, allConfirmed);
        }

        // Live voice call when a new ball drops
        if (snap.drawnBalls.length > lastDrawnCountRef.current) {
          const newBall = snap.drawnBalls[0];
          if (newBall) {
            buzz(12);
            playNumberCallVoice(newBall);
          }
          lastDrawnCountRef.current = snap.drawnBalls.length;
        }
        setDrawn(snap.drawnBalls);
      } else if (snap.phase === "victory") {
        setIsGameStarted(true);
        setDrawn(snap.drawnBalls);
      }
    }, 500);

    return () => {
      clearInterval(syncInterval);
      unsubscribe();
    };
  }, [currentRoundId, confirmedTickets, pendingTickets, serverTakenTickets]);

  // 2. Initialize ticket boards whenever active tickets change
  useEffect(() => {
    setTicketsData((prev) => {
      const next = { ...prev };
      let changed = false;
      activeTickets.forEach((num) => {
        if (!next[num] || next[num].length === 0) {
          next[num] = generateBoardForTicket(num);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [activeTickets]);

  // 3. Automatic Bingo & Winner Evaluation
  useEffect(() => {
    if (!isGameStarted || won || drawn.length === 0) return;

    // Check if user won
    for (const num of activeTickets) {
      const cells = ticketsData[num] || [];
      if (cells.length === 0) continue;

      const evaluatedCells = cells.map((c) => ({
        ...c,
        marked:
          c.marked ||
          c.value === "FREE" ||
          (typeof c.value === "number" && drawn.includes(c.value)),
      }));

      if (checkBingo(evaluatedCells)) {
        const payoutKey = `phoenix_payout_claimed_round_${currentRoundId}`;
        if (!localStorage.getItem(payoutKey)) {
          localStorage.setItem(payoutKey, "true");
          buzz([20, 50, 20, 50, 40]);
          setMainWallet((prev) => prev + liveJackpot);
          const player = getStoredPlayer();
          player.totalWon = (player.totalWon || 0) + liveJackpot;
          player.gamesPlayed = (player.gamesPlayed || 0) + 1;
          saveStoredPlayer(player);
          setWinners([
            {
              name: `${player.name} (እርስዎ)`,
              phone: player.phone ? player.phone.slice(0, 4) + "***" + player.phone.slice(-2) : "09***38",
              ticket: num,
              amount: liveJackpot,
              isUser: true,
            },
          ]);
          playBingoFanfare();
          setWon(true);
        }
        return;
      }
    }

    // Room Winner when victory phase is reached (shown to everyone so it feels live and real!)
    const player = getStoredPlayer();
    const snap = getLiveRoundSnapshot(activeTickets, serverTakenTickets, {
      name: player.name,
      phone: player.phone,
    });
    if (snap.phase === "victory" && !won && snap.totalRoomTickets >= 2) {
      buzz([15, 40, 20]);
      const winner = snap.winnerInfo;
      const isUserWin = winner.isUser;
      if (isUserWin) {
        const payoutKey = `phoenix_payout_claimed_round_${currentRoundId}`;
        if (!localStorage.getItem(payoutKey)) {
          localStorage.setItem(payoutKey, "true");
          buzz([20, 50, 20, 50, 40]);
          setMainWallet((prev) => prev + liveJackpot);
          player.totalWon = (player.totalWon || 0) + liveJackpot;
          player.gamesPlayed = (player.gamesPlayed || 0) + 1;
          saveStoredPlayer(player);
        }
      }
      setWinners([
        {
          name: isUserWin ? `${player.name} (እርስዎ)` : winner.name,
          phone: isUserWin
            ? player.phone
              ? player.phone.slice(0, 4) + "***" + player.phone.slice(-2)
              : "09***38"
            : winner.phone,
          ticket: winner.ticket,
          amount: liveJackpot,
          isUser: isUserWin,
        },
      ]);
      playBingoFanfare();
      setWon(true);
    }
  }, [drawn, ticketsData, activeTickets, won, isGameStarted, liveJackpot, currentRoundId, serverTakenTickets]);

  const toggleCell = (ticketNum: number, cellId: string) => {
    setTicketsData((prev) => {
      const currentCells = prev[ticketNum] || [];
      const updated = currentCells.map((c) => {
        if (c.id !== cellId) return c;
        if (!c.marked && typeof c.value === "number" && !drawn.includes(c.value)) {
          return c;
        }
        buzz(10);
        return { ...c, marked: !c.marked };
      });
      return { ...prev, [ticketNum]: updated };
    });
  };

  const handleNextRound = useCallback(() => {
    setWon(false);
    setActiveTab("home");
    try {
      window.location.hash = "home";
    } catch {}
  }, []);

  const handleManualStart = () => {
    setIsGameStarted(true);
    setActiveTab("game");
    try {
      window.location.hash = "game";
    } catch {}
  };

  // Optimistic Cartela Selection / Refund Handler with localStorage persistence
  const handleToggleTicket = (ticketNum: number) => {
    if (isGameStarted) return;
    buzz(10);
    const player = getStoredPlayer();

    // If already selected: Refund 10 ETB back to Play Wallet
    if (pendingTickets.includes(ticketNum)) {
      const nextPending = pendingTickets.filter((x) => x !== ticketNum);
      setPendingTickets(nextPending);
      saveUserRoundTickets(currentRoundId, nextPending);
      releaseRemoteTicket(currentRoundId, ticketNum);
      setPlayWallet((prev) => prev + STAKE_PER_TICKET);
      return;
    }

    // If not selected: Check balance and purchase
    if (pendingTickets.length >= MAX_SELECT) {
      alert("ከ 4 ካርቴላ በላይ በአንድ ዙር መምረጥ አይቻልም (Max 4 tickets)!");
      return;
    }

    const availableBal = playWallet + mainWallet;
    if (availableBal < STAKE_PER_TICKET) {
      if (playWallet <= 0 && mainWallet <= 0) {
        buzz([20, 40]);
        claimWelcomePlayBonus(15.0);
        setPlayWallet(15.0);
        setPromoToast("🎁 የ 15.00 ETB ነፃ የመጫወቻ ቦነስ ተሰጥቶዎታል! አሁን ካርቴላ መምረጥ ይችላሉ።");
        setTimeout(() => setPromoToast(null), 3500);
        return;
      }
      alert("በሂሳብዎ ላይ በቂ ገንዘብ የለም! እባክዎ መጀመሪያ ገቢ (Deposit) ያድርጉ።");
      return;
    }

    // Deduct 10 ETB optimistically
    if (playWallet >= STAKE_PER_TICKET) {
      setPlayWallet((prev) => prev - STAKE_PER_TICKET);
    } else {
      const remainder = STAKE_PER_TICKET - playWallet;
      setPlayWallet(0);
      setMainWallet((prev) => Math.max(0, prev - remainder));
    }

    const nextPending = [...pendingTickets, ticketNum];
    setPendingTickets(nextPending);
    saveUserRoundTickets(currentRoundId, nextPending);
    claimRemoteTicket(currentRoundId, ticketNum, player.name, player.phone);
  };

  // Claim Floating Bonus
  const handleClaimBonus = () => {
    buzz([20, 50]);
    setPlayWallet((prev) => prev + 25);
    setShowPromoFloat(false);
    setPromoToast("🎉 እንኳን ደስ አሎት! የ 25.00 ETB ነፃ ቦነስ ተቀብለዋል!");
    setTimeout(() => setPromoToast(null), 3500);
  };

  // Redeem Promo Code
  const handleRedeemPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    buzz(15);
    if (["SPARKVIP", "PHOENIX10", "BONUS20", "WELCOME", "VIP", "BINGO"].includes(code)) {
      setPlayWallet((prev) => prev + 50);
      setPromoToast(`🎉 እንኳን ደስ አሎት! ኮድ "${code}" ጸድቋል (+50 ETB)!`);
      setShowPromoModal(false);
      setPromoCodeInput("");
    } else {
      alert("❌ የተሳሳተ ወይም ያለፈበት የፕሮሞ ኮድ ነው!");
    }
    setTimeout(() => setPromoToast(null), 3500);
  };

  return (
    <LanguageProvider>
      <main className="relative min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        {/* Offline Alert Banner */}
        {isOffline && (
          <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-xs font-black text-white shadow-lg animate-bounce">
            <WifiOff className="h-4 w-4" />
            <span>❌ ኢንተርኔት ተቋርጧል! (Internet Connection Lost)</span>
          </div>
        )}

        {/* Success Toast */}
        {promoToast && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border border-gold bg-amber-950/95 px-4 py-2.5 text-xs font-black text-gold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
            <Sparkles className="h-4 w-4 text-gold animate-spin" />
            <span>{promoToast}</span>
          </div>
        )}

        {/* Floating Bonus Claim Float Widget */}
        {showPromoFloat && activeTab !== "admin" && !isGameStarted && (
          <div
            onClick={handleClaimBonus}
            className="fixed top-36 right-3 z-40 flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-white bg-gradient-to-r from-amber-400 via-gold to-yellow-500 p-2 text-black shadow-2xl transition-transform hover:scale-105 active:scale-95 animate-pulse"
          >
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-black text-gold shadow-md text-base">
              🎁
            </div>
            <div className="text-left pr-1">
              <span className="block text-[9px] font-black uppercase tracking-tight leading-none text-black/80">
                ቦነስ ይውሰዱ
              </span>
              <span className="text-xs font-black leading-none text-black">
                +25 ETB
              </span>
            </div>
          </div>
        )}

        {/* Promo Code Modal */}
        {showPromoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-gold bg-gradient-to-b from-amber-950/90 via-card to-background p-6 shadow-2xl">
              <button
                type="button"
                onClick={() => setShowPromoModal(false)}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-secondary/80 text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-gold text-2xl shadow-glow-gold text-black">
                  🎁
                </div>
                <h2 className="mt-3 text-lg font-black text-gold uppercase tracking-wider">
                  የፕሮሞ ኮድ ያስገቡ
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  (Redeem Promo Code for Free Birr)
                </p>
              </div>

              <div className="mt-5">
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE (e.g. SPARKVIP)..."
                  className="w-full rounded-2xl border border-gold/60 bg-black/60 px-4 py-3 text-center text-base font-black tracking-widest text-gold outline-none placeholder:text-muted-foreground/40 focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>

              <button
                type="button"
                onClick={handleRedeemPromo}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-gold to-yellow-500 py-3.5 text-sm font-black uppercase tracking-wider text-black shadow-glow-gold transition-transform active:scale-95"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                አረጋግጥ (REDEEM CODE)
              </button>
            </div>
          </div>
        )}

        {/* GameView (Tickets Page) - Replaces Home when game is active */}
        <div className={activeTab === "game" || (activeTab === "home" && isGameStarted) ? "block" : "hidden"}>
          <GameView
            selectedTickets={activeTickets}
            globalCountdown={globalCountdown}
            isGameStarted={isGameStarted}
            drawn={drawn}
            won={won}
            ticketsData={ticketsData}
            toggleCell={toggleCell}
            onNextRound={handleNextRound}
            prize={liveJackpot}
            totalRoomTickets={totalRoomTickets}
            roundId={currentRoundId}
          />
        </div>

        {activeTab === "home" && !isGameStarted && (
          <LobbyView
            pendingTickets={pendingTickets}
            setPendingTickets={setPendingTickets}
            onToggleTicket={handleToggleTicket}
            takenTickets={takenTickets}
            mainWallet={mainWallet}
            playWallet={playWallet}
            globalCountdown={globalCountdown}
            isGameStarted={isGameStarted}
            waitingForPlayers={waitingForPlayers}
            onStartGame={handleManualStart}
            onNavigateWallet={() => setActiveTab("wallet")}
            announcementText={announcementText}
            jackpot={liveJackpot}
            totalRoomTickets={totalRoomTickets}
            onClaimBonus={() => {
              buzz([20, 50]);
              claimWelcomePlayBonus(15.0);
              setPlayWallet((prev) => prev + 15);
              setPromoToast("🎉 የ 15.00 ETB ነፃ የመጫወቻ ቦነስ ተቀብለዋል!");
              setTimeout(() => setPromoToast(null), 3500);
            }}
          />
        )}

        {activeTab === "wallet" && (
          <WalletView
            mainWallet={mainWallet}
            setMainWallet={setMainWallet}
            playWallet={playWallet}
            setPlayWallet={setPlayWallet}
          />
        )}

        {activeTab === "rank" && <RankView />}

        {activeTab === "profile" && (
          <ProfileView
            onOpenPromoModal={() => setShowPromoModal(true)}
            onNavigateAdmin={() => {
              window.location.hash = "admin";
              setActiveTab("admin");
            }}
            onNavigateFinance={() => {
              window.location.hash = "finance";
              setActiveTab("finance");
            }}
          />
        )}

        {activeTab === "admin" && (
          <div className="min-h-screen w-full bg-[#050810]">
            <AdminView
              isGameStarted={isGameStarted}
              setIsGameStarted={setIsGameStarted}
              globalCountdown={globalCountdown}
              setGlobalCountdown={setGlobalCountdown}
              drawn={drawn}
              setDrawn={setDrawn}
              mainWallet={mainWallet}
              setMainWallet={setMainWallet}
              playWallet={playWallet}
              setPlayWallet={setPlayWallet}
              pendingTicketsCount={pendingTickets.length}
              confirmedTicketsCount={confirmedTickets.length}
              announcementText={announcementText}
              setAnnouncementText={setAnnouncementText}
              onResetRound={handleNextRound}
              onNavigateFinance={() => {
                window.location.hash = "finance";
                setActiveTab("finance");
              }}
              onBackToGame={() => {
                window.location.hash = "home";
                setActiveTab("home");
              }}
              onInjectLiveBots={(count) => {
                setTakenTickets((prev) => {
                  const pool = new Set(prev);
                  let attempts = 0;
                  while (pool.size < Math.min(520, prev.length + count) && attempts < count * 3) {
                    attempts++;
                    const rand = Math.floor(Math.random() * TOTAL_TICKETS) + 1;
                    if (!pendingTickets.includes(rand) && !confirmedTickets.includes(rand)) {
                      pool.add(rand);
                    }
                  }
                  return Array.from(pool);
                });
              }}
              onClearLiveBots={() => {
                setTakenTickets([]);
              }}
            />
          </div>
        )}

        {activeTab === "finance" && (
          <div className="min-h-screen w-full bg-[#080b11]">
            <FinanceView
              onNavigateAdmin={() => {
                window.location.hash = "admin";
                setActiveTab("admin");
              }}
              onBackToGame={() => {
                window.location.hash = "home";
                setActiveTab("home");
              }}
              mainWallet={mainWallet}
              playWallet={playWallet}
              liveJackpot={liveJackpot}
              totalRoomTickets={totalRoomTickets}
              ticketPrice={STAKE_PER_TICKET}
            />
          </div>
        )}

        {activeTab !== "admin" && activeTab !== "finance" && (
          <BottomNav
            activeTab={activeTab}
            isGameActive={isGameStarted}
            onSelectTab={(tab: NavTab) => {
              setActiveTab(tab);
              try {
                window.location.hash = tab === "home" ? "" : tab;
              } catch {}
            }}
          />
        )}

        {/* Victory celebration modal */}
        <VictoryModal
          open={won}
          prize={liveJackpot}
          winners={winners}
          onNextRound={handleNextRound}
        />
      </main>
    </LanguageProvider>
  );
}
