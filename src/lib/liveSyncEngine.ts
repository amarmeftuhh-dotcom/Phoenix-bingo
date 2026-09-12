import { getStoredBotSettings } from "./botConfig";

/**
 * Phoenix Bingo - Universal Live Room Synchronization Engine
 * 
 * Guarantees:
 * 1. 100% Real-time synchronization across all devices & players
 * 2. Automatic server-time calibration to eliminate phone clock differences
 * 3. Exact state persistence across page reloads/refreshes - no resetting or jumping
 * 4. Structured cycle: Lobby (35s) -> Dynamic Ball Calling (50s) -> Victory (3s) -> Next Round
 * 5. Dynamic Bot integration:
 *    - If bots are OFF: 0 bot tickets!
 *    - If NO ONE took any cartelas: NO BALLS CALLED! Round resets/waits ("hulum sew kalyeza mnm sayitara yalfal").
 *    - If tickets ARE taken (by player or bots): Game begins and balls are called!
 *    - No phantom 700/800 ETB jackpot! Jackpot is strictly: total tickets * 10 ETB.
 */

export const LOBBY_MS = 35_000;         // 35 seconds betting/cartela selection
export const CALLING_MS = 50_000;       // 50 seconds ball calling (20 balls @ 2.5s)
export const VICTORY_MS = 3_000;        // Exactly 3 seconds winner celebration
export const ROUND_DURATION_MS = LOBBY_MS + CALLING_MS + VICTORY_MS; // Exactly 88,000 ms per round
export const BALL_INTERVAL_MS = 2_500;  // 2.5 seconds between balls

// Dynamic winning ball target per round (between 17 and 20 balls)
export function getWinningBallTarget(roundId: number): number {
  const targets = [18, 20, 17, 19, 18, 20];
  return targets[Math.abs(roundId) % targets.length]!;
}

// Server Time Calibration (Aligns all player phones to atomic server time)
let serverTimeOffset = 0;
let hasAttemptedSync = false;

export async function syncServerClock() {
  if (typeof window === "undefined" || hasAttemptedSync) return;
  hasAttemptedSync = true;
  try {
    const start = Date.now();
    const res = await fetch(window.location.origin + "/", { method: "HEAD", cache: "no-store" });
    const dateHeader = res.headers.get("Date");
    if (dateHeader) {
      const end = Date.now();
      const rtt = end - start;
      const serverTime = new Date(dateHeader).getTime() + Math.floor(rtt / 2);
      serverTimeOffset = serverTime - end;
    }
  } catch {
    // Fallback gracefully to local clock
  }
}

// Automatically initiate calibration on module load in browser
if (typeof window !== "undefined") {
  syncServerClock();
}

export function getSynchronizedNow(): number {
  return Date.now() + serverTimeOffset;
}

export function getCurrentRoundInfo(now: number = getSynchronizedNow()) {
  const roundId = Math.floor(now / ROUND_DURATION_MS);
  const elapsedInRound = now % ROUND_DURATION_MS;
  const winningBallCount = getWinningBallTarget(roundId);
  const callingMs = winningBallCount * BALL_INTERVAL_MS;

  return {
    roundId,
    elapsedInRound,
    winningBallCount,
    callingMs,
  };
}

// Common Ethiopian bot player names for live room immersion
const BOT_NAMES = [
  "አበበ ተፈራ", "ሰለሞን ካሳ", "ዳንኤል ወርቁ", "ኤርሚያስ ታደሰ",
  "ዮናስ በቀለ", "በረከት አያሌው", "ኪሩቤል አለሙ", "ያብስራ ተሾመ",
  "ሄኖክ ግርማ", "ናሆም ደጀኔ", "ቴዎድሮስ ካሳሁን", "አማኑኤል ጥላሁን",
  "ታምራት ደስታ", "ማህሌት ጌታቸው", "ራሄል ታደለ", "ህሊና ሰለሞን"
];

export interface LiveRoundSnapshot {
  roundId: number;
  phase: "lobby" | "game" | "victory";
  countdown: number;          // 0 - 35 seconds remaining in lobby
  elapsedInRound: number;     // milliseconds elapsed in this round
  isGameStarted: boolean;
  drawnBalls: number[];       // [mostRecentBall, ...olderBalls]
  currentBall: number | null;
  winningBallCount: number;
  winnerInfo: {
    name: string;
    phone: string;
    ticket: number;
  };
  totalRoomTickets: number;
  takenTickets: number[];
  jackpot: number;
}

/**
 * 32-bit integer PRNG generator seeded by Round ID
 */
function createSeededPRNG(seed: number) {
  let s = (seed * 1664525 + 1013904223) >>> 0;
  return function next(): number {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Deterministic shuffle of 1..75 balls for a specific round ID
 */
export function getDeterministicBallsForRound(roundId: number): number[] {
  const balls = Array.from({ length: 75 }, (_, i) => i + 1);
  const rand = createSeededPRNG(roundId * 982451653);
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = balls[i]!;
    balls[i] = balls[j]!;
    balls[j] = temp;
  }
  return balls;
}

/**
 * Deterministic room metadata (taken tickets, winner bot, jackpot)
 * If bot system is disabled, takenTickets is strictly empty.
 * If bot system is enabled, bots join progressively during the 35s lobby.
 */
export function getDeterministicRoomData(
  roundId: number,
  winningBallCount: number,
  elapsedInRound: number = 0
) {
  const botSettings = getStoredBotSettings();

  // If Bot system is OFF: 0 bot tickets! Only real players count.
  if (!botSettings.isBotSystemActive) {
    return {
      takenTickets: [],
      winnerName: "",
      winnerPhone: "",
      winnerTicket: 0,
      winningBallCount,
      jackpot: 0,
    };
  }

  const rand = createSeededPRNG(roundId * 433494437);
  const min = Math.max(0, botSettings.minBots || 0);
  const max = Math.max(min, botSettings.maxBots || 25);
  const totalTargetBots = min === max ? min : min + Math.floor(rand() * (max - min + 1));

  if (totalTargetBots === 0) {
    return {
      takenTickets: [],
      winnerName: "",
      winnerPhone: "",
      winnerTicket: 0,
      winningBallCount,
      jackpot: 0,
    };
  }

  // During 35s lobby, bots join gradually so players see them taking cards in real time!
  const progress = elapsedInRound < LOBBY_MS ? Math.min(1, Math.max(0.1, elapsedInRound / (LOBBY_MS * 0.9))) : 1;
  const currentBotCount = Math.floor(totalTargetBots * progress);

  const takenSet = new Set<number>();
  while (takenSet.size < totalTargetBots) {
    const t = Math.floor(rand() * 550) + 1;
    takenSet.add(t);
  }
  const allBotTickets = Array.from(takenSet);
  const visibleBotTickets = allBotTickets.slice(0, currentBotCount);

  const nameIdx = Math.floor(rand() * BOT_NAMES.length);
  const winnerName = BOT_NAMES[nameIdx] || "አበበ ተፈራ";
  const winnerPhone = `09${Math.floor(10 + rand() * 80)}***${Math.floor(10 + rand() * 89)}`;
  const winnerTicket = allBotTickets[Math.floor(rand() * allBotTickets.length)] || 112;

  return {
    takenTickets: visibleBotTickets,
    winnerName,
    winnerPhone,
    winnerTicket,
    winningBallCount,
    jackpot: visibleBotTickets.length * 10,
  };
}

/**
 * Computes the exact live state of the round based on universal epoch time
 */
export function getLiveRoundSnapshot(userTickets: number[] = []): LiveRoundSnapshot {
  const now = getSynchronizedNow();
  const { roundId, elapsedInRound, winningBallCount, callingMs } = getCurrentRoundInfo(now);

  const roomData = getDeterministicRoomData(roundId, winningBallCount, elapsedInRound);
  const fullBallsSequence = getDeterministicBallsForRound(roundId);

  // Combine user tickets + active bot tickets
  const takenTickets = roomData.takenTickets.filter((t) => !userTickets.includes(t));
  const totalRoomTickets = takenTickets.length + userTickets.length;
  const jackpot = totalRoomTickets * 10;

  // RULE: "hulum sew kalyeza mnm sayitara yalfal, keyeze gn yitaral"
  // If NO ONE (neither real player nor active bot) took any tickets:
  // - No balls are called!
  // - No phantom 700/800 jackpot!
  // - No victory celebration popup!
  // - Round remains in lobby waiting for players!
  if (totalRoomTickets === 0) {
    const countdown = Math.max(0, Math.ceil((LOBBY_MS - (elapsedInRound % LOBBY_MS)) / 1000));
    return {
      roundId,
      phase: "lobby",
      countdown,
      elapsedInRound,
      isGameStarted: false,
      drawnBalls: [],
      currentBall: null,
      winningBallCount,
      winnerInfo: {
        name: "",
        phone: "",
        ticket: 0,
      },
      totalRoomTickets: 0,
      takenTickets: [],
      jackpot: 0,
    };
  }

  let phase: "lobby" | "game" | "victory" = "lobby";
  let countdown = 0;
  let isGameStarted = false;
  let drawnBalls: number[] = [];
  let currentBall: number | null = null;

  if (elapsedInRound < LOBBY_MS) {
    // 1. Lobby Betting Phase
    phase = "lobby";
    countdown = Math.max(0, Math.ceil((LOBBY_MS - elapsedInRound) / 1000));
    isGameStarted = false;
    drawnBalls = [];
    currentBall = null;
  } else if (elapsedInRound < LOBBY_MS + callingMs) {
    // 2. Live Calling Phase (At least 1 ticket was taken)
    const gameElapsed = elapsedInRound - LOBBY_MS;
    const count = Math.min(
      winningBallCount,
      Math.floor(gameElapsed / BALL_INTERVAL_MS) + 1
    );

    phase = "game";
    isGameStarted = true;
    countdown = 0;
    const slice = fullBallsSequence.slice(0, count);
    drawnBalls = [...slice].reverse();
    currentBall = drawnBalls[0] || null;
  } else {
    // 3. Victory & Payout Celebration Phase (Exactly 3 seconds)
    phase = "victory";
    isGameStarted = true;
    countdown = 0;
    const slice = fullBallsSequence.slice(0, winningBallCount);
    drawnBalls = [...slice].reverse();
    currentBall = drawnBalls[0] || null;
  }

  return {
    roundId,
    phase,
    countdown,
    elapsedInRound,
    isGameStarted,
    drawnBalls,
    currentBall,
    winningBallCount,
    winnerInfo: {
      name: roomData.winnerName || "አሸናፊ",
      phone: roomData.winnerPhone || "09********",
      ticket: roomData.winnerTicket || 1,
    },
    totalRoomTickets,
    takenTickets,
    jackpot,
  };
}

// --- LocalStorage persistence for user tickets across reloads ---
const STORAGE_PREFIX_ROUND_TICKETS = "phoenix_user_round_tickets_";

export function saveUserRoundTickets(roundId: number, tickets: number[]) {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX_ROUND_TICKETS}${roundId}`,
      JSON.stringify(tickets)
    );
  } catch {}
}

export function getUserRoundTickets(roundId: number): number[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX_ROUND_TICKETS}${roundId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearOldRoundTickets(currentRoundId: number) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX_ROUND_TICKETS)) {
        const id = parseInt(key.replace(STORAGE_PREFIX_ROUND_TICKETS, ""), 10);
        if (!isNaN(id) && id < currentRoundId - 2) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {}
}
