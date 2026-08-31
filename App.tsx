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
  type BotSettings,
  type BotWinnerForceMode,
} from "@/lib/botConfig";

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

function generateInitialTakenTickets(): number[] {
  const pool = new Set<number>();
  const initialCount = Math.floor(Math.random() * 35) + 85; // starts with 85 - 120 occupied tickets
  while (pool.size < initialCount) {
    pool.add(Math.floor(Math.random() * TOTAL_TICKETS) + 1);
  }
  return Array.from(pool);
}

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [pendingTickets, setPendingTickets] = useState<number[]>([]);
  const [confirmedTickets, setConfirmedTickets] = useState<number[]>([]);
  const [takenTickets, setTakenTickets] = useState<number[]>(generateInitialTakenTickets);
  const [mainWallet, setMainWallet] = useState(70.0);
  const [playWallet, setPlayWallet] = useState(25.0);

  // Online / Offline monitor
  const [isOffline, setIsOffline] = useState(false);

  // Floating bonus & Promo code modal
  const [showPromoFloat, setShowPromoFloat] = useState(true);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoToast, setPromoToast] = useState<string | null>(null);

  // Continuous Global Game Engine (Persists across tab navigation)
  const [globalCountdown, setGlobalCountdown] = useState(45);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [won, setWon] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [ticketsData, setTicketsData] = useState<Record<number, Cell[]>>({});

  const activeTickets = Array.from(new Set([...confirmedTickets, ...pendingTickets]));

  // REAL LIVE DYNAMIC JACKPOT CALCULATION:
  const userTicketsCount = isGameStarted ? confirmedTickets.length : pendingTickets.length;
  const totalRoomTickets = takenTickets.length + userTicketsCount;
  const liveJackpot = totalRoomTickets * STAKE_PER_TICKET;

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

  // Listen for dedicated standalone URLs (e.g. #admin, #finance, #babi2204, #papi2204, /admin, /finance, ?admin=true, ?finance=true)
  useEffect(() => {
    const checkSpecialRoutes = () => {
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();

      if (
        search.includes("papi") ||
        search.includes("finance") ||
        hash.includes("papi") ||
        hash.includes("finance") ||
        pathname.includes("papi") ||
        pathname.includes("finance")
      ) {
        setActiveTab("finance");
      } else if (
        search.includes("admin") ||
        search.includes("babi") ||
        hash.includes("admin") ||
        hash.includes("babi") ||
        pathname.includes("admin") ||
        pathname.includes("babi")
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
    window.addEventListener("phoenix_bot_settings_updated", handleSettingsUpdate);
    return () => {
      window.removeEventListener("phoenix_bot_settings_updated", handleSettingsUpdate);
    };
  }, []);

  // Target ball count for this round before a room player hits Bingo
  const targetWinningDrawRef = useRef<number>(22);
  const targetWinnerTypeRef = useRef<"user" | "bot">("bot");
  const roomWinnerBotRef = useRef<{ name: string; phone: string; ticket: number }>({
    name: "አበበ ተፈራ",
    phone: "0911***45",
    ticket: 214,
  });

  // 1. Live Room simulation: Bots and players actively buy/hold cartelas during countdown
  useEffect(() => {
    if (isGameStarted) return;

    const interval = setInterval(() => {
      if (!botSettings.isBotSystemActive) return;

      setTakenTickets((prev) => {
        if (prev.length >= 480) return prev;
        const additionsCount = Math.random() > 0.35 ? (Math.random() > 0.6 ? 3 : 1) : 0;
        if (additionsCount === 0) return prev;

        const next = [...prev];
        for (let i = 0; i < additionsCount; i++) {
          const candidate = Math.floor(Math.random() * TOTAL_TICKETS) + 1;
          if (!next.includes(candidate) && !pendingTickets.includes(candidate)) {
            next.push(candidate);
          }
        }
        return next;
      });
    }, 1400);

    return () => clearInterval(interval);
  }, [isGameStarted, pendingTickets, botSettings.isBotSystemActive]);

  // 2. Unified 45s countdown timer across all pages
  useEffect(() => {
    if (isGameStarted) return;

    const timer = setInterval(() => {
      setGlobalCountdown((prev) => {
        if (prev <= 1) {
          setIsGameStarted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGameStarted]);

  // When round starts, setup target winning draw count + bot winner + apply Admin Force Win Mode
  useEffect(() => {
    if (isGameStarted) {
      // Determine winner based on Admin Bot Control Mode:
      // Modes: "bots" | "real" | "mix" | "mix_real" | "mix_dep" | "ai"
      const mode = botSettings.botWinnerForce;
      const userHasTickets = activeTickets.length > 0;

      let willUserWin = false;

      if (!userHasTickets) {
        // If no real player is in the room, Bot 100% wins to keep the game exciting & alive
        willUserWin = false;
      } else if (!botSettings.isBotSystemActive) {
        // If bot system is turned off by Admin, real user wins
        willUserWin = true;
      } else if (mode === "real") {
        // 100% Real User Wins
        willUserWin = true;
      } else if (mode === "bots") {
        // 100% Bot Wins
        willUserWin = false;
      } else if (mode === "mix") {
        // 50/50 Balanced Mix between User and Bot
        willUserWin = Math.random() < 0.5;
      } else if (mode === "mix_real") {
        // 75% Real / 25% Bot Mix
        willUserWin = Math.random() < 0.75;
      } else if (mode === "mix_dep") {
        // High win rate for depositing users (65%)
        willUserWin = Math.random() < 0.65;
      } else {
        // "ai" - Smart Casino AI Algorithm:
        // Adapts based on user ticket count and streak
        const winProbability = Math.min(0.8, 0.25 + activeTickets.length * 0.15);
        willUserWin = Math.random() < winProbability;
      }

      targetWinnerTypeRef.current = willUserWin ? "user" : "bot";

      // If user is scheduled to win, set target draw between 18 - 25 balls
      // If bot wins, set between 16 - 28 balls
      targetWinningDrawRef.current = willUserWin
        ? Math.floor(Math.random() * 8) + 18
        : Math.floor(Math.random() * 12) + 16;

      const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] || "አበበ ተፈራ";
      const randomPhone = `09${Math.floor(10 + Math.random() * 80)}***${Math.floor(10 + Math.random() * 89)}`;
      let randomTicket = Math.floor(Math.random() * 500) + 1;
      while (activeTickets.includes(randomTicket)) {
        randomTicket = Math.floor(Math.random() * 500) + 1;
      }
      roomWinnerBotRef.current = {
        name: randomName,
        phone: randomPhone,
        ticket: randomTicket,
      };
    }
  }, [isGameStarted, botSettings, activeTickets.length]);

  // Automatically confirm pending cartelas when game starts
  useEffect(() => {
    if (isGameStarted && pendingTickets.length > 0) {
      setConfirmedTickets((prev) => Array.from(new Set([...prev, ...pendingTickets])));
      setPendingTickets([]);
    }
  }, [isGameStarted, pendingTickets]);

  // 3. Initialize ticket boards whenever active tickets change
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

  // 4. Continuous Ball Caller when round is active
  useEffect(() => {
    if (!isGameStarted || won) return;

    const id = setInterval(() => {
      setDrawn((prev) => {
        if (prev.length >= MAX_NUMBER) return prev;
        const newBall = randomDraw(prev);
        if (newBall) {
          buzz(12);
          playNumberCallVoice(newBall);
        }
        return [newBall, ...prev];
      });
    }, 2800);

    return () => clearInterval(id);
  }, [isGameStarted, won]);

  // 5. Automatic Bingo & Winner Evaluation on every drawn ball
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
        buzz([20, 50, 20, 50, 40]);
        setMainWallet((prev) => prev + liveJackpot);
        setWinners([
          {
            name: "እርስዎ (You)",
            phone: "0932***38",
            ticket: num,
            amount: liveJackpot,
            isUser: true,
          },
        ]);
        playBingoFanfare();
        setWon(true);
        return;
      }
    }

    // Check if room/bot won
    if (drawn.length >= targetWinningDrawRef.current) {
      buzz([15, 40, 20]);
      const bot = roomWinnerBotRef.current;
      setWinners([
        {
          name: bot.name,
          phone: bot.phone,
          ticket: bot.ticket,
          amount: liveJackpot,
          isUser: false,
        },
      ]);
      playBingoFanfare();
      setWon(true);
    }
  }, [drawn, ticketsData, activeTickets, won, isGameStarted, liveJackpot]);

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
    setDrawn([]);
    setIsGameStarted(false);
    setGlobalCountdown(45);
    setConfirmedTickets([]);
    setPendingTickets([]);
    setTakenTickets(generateInitialTakenTickets());
    setActiveTab("home");
  }, []);

  const handleManualStart = () => {
    setIsGameStarted(true);
    setActiveTab("game");
  };

  // Optimistic Cartela Selection / Refund Handler
  const handleToggleTicket = (ticketNum: number) => {
    if (isGameStarted) return;
    buzz(10);

    // If already selected: Refund 10 ETB back to Play Wallet
    if (pendingTickets.includes(ticketNum)) {
      setPendingTickets((prev) => prev.filter((x) => x !== ticketNum));
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

    setPendingTickets((prev) => [...prev, ticketNum]);
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
        {showPromoFloat && activeTab !== "admin" && (
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

        {/* GameView (Tickets Page) */}
        <div className={activeTab === "game" ? "block" : "hidden"}>
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
          />
        </div>

        {activeTab === "home" && (
          <LobbyView
            pendingTickets={pendingTickets}
            setPendingTickets={setPendingTickets}
            onToggleTicket={handleToggleTicket}
            takenTickets={takenTickets}
            mainWallet={mainWallet}
            playWallet={playWallet}
            globalCountdown={globalCountdown}
            isGameStarted={isGameStarted}
            onStartGame={handleManualStart}
            onNavigateWallet={() => setActiveTab("wallet")}
            announcementText={announcementText}
            jackpot={liveJackpot}
            totalRoomTickets={totalRoomTickets}
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
            onSelectTab={(tab) => {
              window.location.hash = tab;
              setActiveTab(tab);
            }}
          />
        )}

        {/* Global Victory Overlay - visible anywhere in the app */}
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

export default App;
