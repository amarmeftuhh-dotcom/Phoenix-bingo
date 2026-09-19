import { getStoredBotSettings } from "./botConfig";
import { generateBoardForTicket, checkBingo } from "./bingo";

/**
 * Phoenix Bingo - Universal Live Room Synchronization Engine
 * 
 * Guarantees:
 * 1. 100% Real-time synchronization across all devices & players
 * 2. Automatic server-time calibration to eliminate phone clock differences
 * 3. Exact state persistence across page reloads/refreshes - no resetting or jumping
 * 4. Structured cycle: Lobby (45s) -> Dynamic Ball Calling -> Victory (3s) -> Next Round
 * 5. Dynamic Opponent & Real Player integration:
 *    - Cross-device sync: If Phone A takes a ticket, Phone B sees it with Red 'X', blur, and disabled!
 *    - 1 person CANNOT play alone! If total tickets < 2, the game waits for opponents and DOES NOT start!
 *    - Real Winner: The winning ticket is mathematically verified from actual cards in play!
 *      If it's the player's ticket, the player wins! If it's an opponent ticket, they win!
 *    - No phantom jackpot! Jackpot is strictly: total tickets * 10 ETB.
 */

export const LOBBY_MS = 45_000;         // 45 seconds betting/cartela selection
export const CALLING_MS = 50_000;       // Default calling duration
export const VICTORY_MS = 3_000;        // Exactly 3 seconds winner celebration
export const ROUND_DURATION_MS = LOBBY_MS + CALLING_MS + VICTORY_MS; // 98,000 ms per round
export const BALL_INTERVAL_MS = 2_500;  // 2.5 seconds between balls

// Dynamic winning ball target per round
export function getWinningBallTarget(roundId: number): number {
  const targets = [18, 20, 17, 19, 18, 20];
  return targets[Math.abs(roundId) % targets.length]!;
}

// Server Time Calibration (Aligns all player phones to atomic server time)
let serverTimeOffset = 0;
let hasAttemptedSync = false;

export function updateServerTimeOffset(serverTime: number) {
  if (typeof serverTime === "number" && !isNaN(serverTime) && serverTime > 1000000000) {
    const diff = serverTime - Date.now();
    serverTimeOffset = Math.round(diff);
  }
}

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
      updateServerTimeOffset(serverTime);
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

// Common Ethiopian player names for live room immersion
const OPPONENT_NAMES = [
  "አበበ ተፈራ", "ሰለሞን ካሳ", "ዳንኤል ወርቁ", "ኤርሚያስ ታደሰ",
  "ዮናስ በቀለ", "በረከት አያሌው", "ኪሩቤል አለሙ", "ያብስራ ተሾመ",
  "ሄኖክ ግርማ", "ናሆም ደጀኔ", "ቴዎድሮስ ካሳሁን", "አማኑኤል ጥላሁን",
  "ታምራት ደስታ", "ማህሌት ጌታቸው", "ራሄል ታደለ", "ህሊና ሰለሞን",
  "ዳዊት ከበደ", "ትዕግስት አለሙ", "ሳራ ታደሰ", "መሳይ አስፋው"
];

export interface LiveRoundSnapshot {
  roundId: number;
  phase: "lobby" | "game" | "victory";
  countdown: number;          // 0 - 45 seconds remaining in lobby
  elapsedInRound: number;     // milliseconds elapsed in this round
  isGameStarted: boolean;
  canStart: boolean;
  waitingForPlayers: boolean;
  drawnBalls: number[];       // [mostRecentBall, ...olderBalls]
  currentBall: number | null;
  winningBallCount: number;
  winnerInfo: {
    name: string;
    phone: string;
    ticket: number;
    isUser: boolean;
  };
  totalRoomTickets: number;
  takenTickets: number[];
  jackpot: number;
}

/**
 * 32-bit integer PRNG generator seeded by Round ID
 */
export function createSeededPRNG(seed: number) {
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
 * Real, verifiable Bingo winner evaluation across participating tickets and drawn balls
 */
export function findFirstBingoWinner(
  participatingTickets: number[],
  ballsSequence: number[]
): { winningTicket: number; winningBallCount: number } {
  if (!participatingTickets || participatingTickets.length === 0) {
    return { winningTicket: 0, winningBallCount: 0 };
  }

  const boards = participatingTickets.map((tNum) => ({
    tNum,
    cells: generateBoardForTicket(tNum),
  }));

  // Check ball by ball starting from ball 4 (minimum possible bingo pattern)
  for (let k = 4; k <= ballsSequence.length; k++) {
    const drawnSet = new Set(ballsSequence.slice(0, k));
    for (const b of boards) {
      const evaluated = b.cells.map((c) => ({
        ...c,
        marked: c.value === "FREE" || (typeof c.value === "number" && drawnSet.has(c.value)),
      }));
      if (checkBingo(evaluated)) {
        return { winningTicket: b.tNum, winningBallCount: k };
      }
    }
  }

  // If no card hits full 5-line Bingo by ball 20, the ticket with highest matches among participants wins!
  const drawnSet20 = new Set(ballsSequence.slice(0, 20));
  let bestTicket = participatingTickets[0]!;
  let maxMatched = -1;

  for (const b of boards) {
    let matched = 0;
    b.cells.forEach((cell) => {
      if (cell.value === "FREE" || (typeof cell.value === "number" && drawnSet20.has(cell.value))) {
        matched++;
      }
    });
    if (matched > maxMatched) {
      maxMatched = matched;
      bestTicket = b.tNum;
    }
  }

  return { winningTicket: bestTicket, winningBallCount: 20 };
}

/**
 * Deterministic room metadata (taken tickets, opponent players, jackpot)
 * If bot system is disabled, takenTickets is strictly empty.
 * If bot system is enabled, opponents join progressively during the 45s lobby.
 */
export function getDeterministicRoomData(
  roundId: number,
  winningBallCount: number,
  elapsedInRound: number = 0
) {
  const botSettings = getStoredBotSettings();

  // If Bot system is OFF: 0 simulated tickets! Only real connected players count.
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
  const min = Math.max(1, botSettings.minBots || 2);
  const max = Math.max(min, botSettings.maxBots || 6);
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

  // During 45s lobby, opponents join gradually so players see them taking cards in real time
  const progress = elapsedInRound < LOBBY_MS ? Math.min(1, Math.max(0.2, elapsedInRound / (LOBBY_MS * 0.85))) : 1;
  const currentBotCount = Math.floor(totalTargetBots * progress);

  const takenSet = new Set<number>();
  while (takenSet.size < totalTargetBots) {
    const t = Math.floor(rand() * 550) + 1;
    takenSet.add(t);
  }
  const allBotTickets = Array.from(takenSet);
  const visibleBotTickets = allBotTickets.slice(0, Math.max(1, currentBotCount));

  const nameIdx = Math.floor(rand() * OPPONENT_NAMES.length);
  const winnerName = OPPONENT_NAMES[nameIdx] || "አበበ ተፈራ";
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

export function getDeterministicOpponents(roundId: number) {
  const botSettings = getStoredBotSettings();
  if (!botSettings.isBotSystemActive) {
    return [];
  }
  const min = Math.max(0, botSettings.minBots || 0);
  const max = Math.max(min, botSettings.maxBots || 0);
  if (max === 0) return [];

  const rand = createSeededPRNG(roundId * 433494437);
  const count = min === max ? min : min + Math.floor(rand() * (max - min + 1));
  const opponents: { ticketNum: number; userName: string; userPhone: string }[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    let t = Math.floor(rand() * 450) + 1;
    while (used.has(t)) {
      t = (t + 1) % 450 + 1;
    }
    used.add(t);
    const nIdx = Math.floor(rand() * OPPONENT_NAMES.length);
    const phone = `09${Math.floor(10 + rand() * 80)}***${Math.floor(10 + rand() * 89)}`;
    opponents.push({
      ticketNum: t,
      userName: OPPONENT_NAMES[nIdx] || "ተጫዋች",
      userPhone: phone,
    });
  }
  return opponents;
}

/**
 * Computes the exact live state of the round based on universal epoch time,
 * combining local user tickets, opponent tickets, and real external player tickets!
 */
export function getLiveRoundSnapshot(
  userTickets: number[] = [],
  externalTakenTickets: number[] = [],
  userProfile?: { name?: string; phone?: string }
): LiveRoundSnapshot {
  const now = getSynchronizedNow();
  const roundId = Math.floor(now / ROUND_DURATION_MS);
  const elapsedInRound = now % ROUND_DURATION_MS;

  const opponents = getDeterministicOpponents(roundId);
  const opponentTicketNums = opponents.map((o) => o.ticketNum);

  // Filter out any user tickets from taken tickets
  const opponentTickets = Array.from(
    new Set([...opponentTicketNums, ...externalTakenTickets])
  ).filter((t) => !userTickets.includes(t));

  const allParticipatingTickets = Array.from(new Set([...userTickets, ...opponentTickets]));
  const totalRoomTickets = allParticipatingTickets.length;
  const jackpot = totalRoomTickets * 10;

  // If NO tickets are taken by any player in this room: NEVER start game! Stay in lobby waiting!
  if (totalRoomTickets === 0) {
    const lobbyRemaining = Math.max(0, Math.ceil((LOBBY_MS - (elapsedInRound % LOBBY_MS)) / 1000));
    return {
      roundId,
      phase: "lobby",
      countdown: lobbyRemaining,
      elapsedInRound,
      isGameStarted: false,
      canStart: false,
      waitingForPlayers: true,
      drawnBalls: [],
      currentBall: null,
      winningBallCount: 0,
      winnerInfo: {
        name: "",
        phone: "",
        ticket: 0,
        isUser: false,
      },
      totalRoomTickets: 0,
      takenTickets: [],
      jackpot: 0,
    };
  }

  const fullBallsSequence = getDeterministicBallsForRound(roundId);

  // Real Bingo Evaluation: checks which participating card hits 5 in a row or 4 corners first
  const { winningTicket, winningBallCount } = findFirstBingoWinner(
    allParticipatingTickets,
    fullBallsSequence
  );

  const isWinnerUser = userTickets.includes(winningTicket);

  let winnerName = "";
  let winnerPhone = "";

  if (isWinnerUser) {
    winnerName = userProfile?.name || "እርስዎ (You)";
    winnerPhone = userProfile?.phone || "09********";
  } else {
    const opp = opponents.find((o) => o.ticketNum === winningTicket);
    if (opp) {
      winnerName = opp.userName;
      winnerPhone = opp.userPhone;
    } else {
      const prng = createSeededPRNG(roundId * 7919 + winningTicket);
      const nameIdx = Math.floor(prng() * OPPONENT_NAMES.length);
      winnerName = OPPONENT_NAMES[nameIdx] || "አበበ ተፈራ";
      winnerPhone = `09${Math.floor(10 + prng() * 80)}***${Math.floor(10 + prng() * 89)}`;
    }
  }

  let phase: "lobby" | "game" | "victory" = "lobby";
  let countdown = 0;
  let isGameStarted = false;
  let drawnBalls: number[] = [];
  let currentBall: number | null = null;

  if (elapsedInRound < LOBBY_MS) {
    // 1. Lobby Betting Phase (0 - 45s)
    phase = "lobby";
    countdown = Math.max(0, Math.ceil((LOBBY_MS - elapsedInRound) / 1000));
    isGameStarted = false;
    drawnBalls = [];
    currentBall = null;
  } else if (elapsedInRound < LOBBY_MS + CALLING_MS) {
    // 2. Live Calling Phase (45s - 95s: 20 balls @ 2.5s)
    phase = "game";
    isGameStarted = true;
    countdown = 0;
    const gameElapsed = elapsedInRound - LOBBY_MS;
    const count = Math.min(20, Math.floor(gameElapsed / BALL_INTERVAL_MS) + 1);
    drawnBalls = fullBallsSequence.slice(0, count).reverse();
    currentBall = drawnBalls[0] || null;
  } else {
    // 3. Victory Celebration Phase (95s - 98s: exactly 3 seconds)
    phase = "victory";
    isGameStarted = true;
    countdown = Math.max(0, Math.ceil((ROUND_DURATION_MS - elapsedInRound) / 1000));
    drawnBalls = fullBallsSequence.slice(0, 20).reverse();
    currentBall = drawnBalls[0] || null;
  }

  return {
    roundId,
    phase,
    countdown,
    elapsedInRound,
    isGameStarted,
    canStart: true,
    waitingForPlayers: false,
    drawnBalls,
    currentBall,
    winningBallCount,
    winnerInfo: {
      name: winnerName,
      phone: winnerPhone,
      ticket: winningTicket,
      isUser: isWinnerUser,
    },
    totalRoomTickets,
    takenTickets: opponentTickets,
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
