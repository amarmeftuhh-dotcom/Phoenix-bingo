import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

/**
 * Universal Multi-Device Live Room Synchronization Engine
 * Maintains real-time room state across multiple connected phones and tabs.
 */
const LOBBY_MS = 45000;
const CALLING_MS = 50000;
const VICTORY_MS = 3000;
const ROUND_DURATION_MS = 98000;
const BALL_INTERVAL_MS = 2500;

const OPPONENT_NAMES = [
  "አበበ ተፈራ", "ሰለሞን ካሳ", "ዳንኤል ወርቁ", "ኤርሚያስ ታደሰ",
  "ዮናስ በቀለ", "በረከት አያሌው", "ኪሩቤል አለሙ", "ያብስራ ተሾመ",
  "ሄኖክ ግርማ", "ናሆም ደጀኔ", "ቴዎድሮስ ካሳሁን", "አማኑኤል ጥላሁን",
  "ታምራት ደስታ", "ማህሌት ጌታቸው", "ራሄል ታደለ", "ህሊና ሰለሞን",
  "ዳዊት ከበደ", "ትዕግስት አለሙ", "ሳራ ታደሰ", "መሳይ አስፋው"
];

function createPRNG(seed: number) {
  let s = (seed * 1664525 + 1013904223) >>> 0;
  return function next(): number {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function getDeterministicBalls(roundId: number): number[] {
  const balls = Array.from({ length: 75 }, (_, i) => i + 1);
  const rand = createPRNG(roundId * 982451653);
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = balls[i]!;
    balls[i] = balls[j]!;
    balls[j] = temp;
  }
  return balls;
}

function generateBoard(ticketId: number) {
  let seed = (ticketId * 1234567) >>> 0;
  function nextRand() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  nextRand(); nextRand(); nextRand();

  function getCol(min: number, max: number): number[] {
    const arr: number[] = [];
    while (arr.length < 5) {
      const val = Math.floor(nextRand() * (max - min + 1)) + min;
      if (!arr.includes(val)) arr.push(val);
    }
    return arr.sort((a, b) => a - b);
  }

  const columns = [
    getCol(1, 15),
    getCol(16, 30),
    getCol(31, 45),
    getCol(46, 60),
    getCol(61, 75),
  ];

  const cells: { row: number; col: number; value: number | "FREE" }[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) {
        cells.push({ row: r, col: c, value: "FREE" });
      } else {
        cells.push({ row: r, col: c, value: columns[c]![r]! });
      }
    }
  }
  return cells;
}

function checkBingoPattern(grid: boolean[][]): boolean {
  for (let r = 0; r < 5; r++) {
    if (grid[r]!.every(Boolean)) return true;
  }
  for (let c = 0; c < 5; c++) {
    let colFull = true;
    for (let r = 0; r < 5; r++) {
      if (!grid[r]![c]) { colFull = false; break; }
    }
    if (colFull) return true;
  }
  let d1 = true;
  for (let i = 0; i < 5; i++) {
    if (!grid[i]![i]) { d1 = false; break; }
  }
  if (d1) return true;
  let d2 = true;
  for (let i = 0; i < 5; i++) {
    if (!grid[i]![4 - i]) { d2 = false; break; }
  }
  if (d2) return true;
  if (grid[0]![0] && grid[0]![4] && grid[4]![0] && grid[4]![4]) return true;
  return false;
}

function evaluateWinner(tickets: number[], balls: number[]) {
  if (!tickets || tickets.length === 0) {
    return { winningTicket: 0, winningBallCount: 0 };
  }
  const boards = tickets.map((t) => ({ t, cells: generateBoard(t) }));

  // 1. Check if any ticket hits true Bingo in balls 4 to 20
  for (let k = 4; k <= 20; k++) {
    const drawnSet = new Set(balls.slice(0, k));
    for (const b of boards) {
      const grid: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));
      b.cells.forEach((cell) => {
        grid[cell.row]![cell.col] = cell.value === "FREE" || (typeof cell.value === "number" && drawnSet.has(cell.value));
      });
      if (checkBingoPattern(grid)) {
        return { winningTicket: b.t, winningBallCount: k };
      }
    }
  }

  // 2. If no card hits full 5-line Bingo by ball 20, the ticket with highest matches among participants wins!
  const drawnSet20 = new Set(balls.slice(0, 20));
  let bestTicket = tickets[0]!;
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
      bestTicket = b.t;
    }
  }

  return { winningTicket: bestTicket, winningBallCount: 20 };
}

function getDeterministicOpponents(_roundId: number) {
  // Only real players: no automatic fake opponents or phantom 40 Birr jackpot!
  return [];
}

const ETHIOPIAN_BOT_NAMES = [
  "አበበ ተፈራ", "ጫላ ደበሌ", "መሰረት አበራ", "ዳዊት ታደሰ", "ሄለን ግርማ",
  "ኪሩቤል አለሙ", "ትዕግስት በቀለ", "ቢኒያም ሀይሉ", "ሳራ ካሳ", "ኤልያስ ፍቃዱ",
  "ራሄል ታዬ", "ተስፋዬ ወርቁ", "ማርታ በቀለ", "ናሆም ጌታቸው", "ሰላማዊት ደስታ",
  "ዮናስ መኮንን", "ቤቴልሄም ጥላሁን", "ብርሃኑ ዘውዴ", "ህይወት አሰፋ", "ግርማ ወልዴ",
  "ታምራት በቀለ", "አስቴር ካሳሁን", "ሙሉጌታ ገብሬ", "ሮዛ ሃይሌ", "ሰለሞን ታደሰ",
  "ፋሲል መንግስቱ", "ዘውዱ አያሌው", "ፅጌረዳ አለማየሁ", "ወንድሙ ገላው", "አሸናፊ ዘለቀ"
];

function generateBotPhone() {
  const prefixes = ["0911", "0912", "0920", "0923", "0934", "0945", "0978", "0913", "0918", "0929"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${prefix}***${suffix}`;
}

let serverBotSettings = {
  isBotSystemActive: false,
  minBots: 0,
  maxBots: 0,
  botWinnerForce: "ai",
};

interface ServerRoundData {
  tickets: Map<number, { userId: string; userName: string; userPhone?: string; time: number }>;
  firstTicketAt: number | null;
  forcedStartAt: number | null;
}

function injectBotsIntoRound(roundData: ServerRoundData, count: number) {
  const available: number[] = [];
  for (let i = 1; i <= 520; i++) {
    if (!roundData.tickets.has(i)) available.push(i);
  }
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  const toAdd = Math.min(count, available.length);
  for (let i = 0; i < toAdd; i++) {
    const ticketNum = available[i];
    const name = ETHIOPIAN_BOT_NAMES[Math.floor(Math.random() * ETHIOPIAN_BOT_NAMES.length)];
    const phone = generateBotPhone();
    const botId = `bot_${Math.random().toString(36).substring(2, 8)}`;
    roundData.tickets.set(ticketNum, {
      userId: botId,
      userName: name,
      userPhone: phone,
      time: Date.now(),
    });
  }

  if (toAdd > 0 && !roundData.firstTicketAt) {
    roundData.firstTicketAt = Date.now();
  }
}

function liveRoomSyncPlugin(): Plugin {
  // Master Clock & Room Store
  let customLobbyMs = 45000;
  let currentRoundId = Math.floor(Date.now() / ROUND_DURATION_MS);

  const roundsMap = new Map<number, ServerRoundData>();

  // Active SSE connection clients
  const sseClients = new Set<any>();

  function cleanOldRounds(latestRoundId: number) {
    if (roundsMap.size > 15) {
      for (const rId of roundsMap.keys()) {
        if (rId < latestRoundId - 5) {
          roundsMap.delete(rId);
        }
      }
    }
  }

  function getOrCreateRound(roundId: number): ServerRoundData {
    let roundData = roundsMap.get(roundId);
    if (!roundData) {
      roundData = {
        tickets: new Map(),
        firstTicketAt: null,
        forcedStartAt: null,
      };
      roundsMap.set(roundId, roundData);
    }
    cleanOldRounds(roundId);
    return roundData;
  }

  function getMasterRoomState() {
    const now = Date.now();
    const epochRoundId = Math.floor(now / ROUND_DURATION_MS);
    const elapsedInRound = now % ROUND_DURATION_MS;
    currentRoundId = epochRoundId;
    const roundData = getOrCreateRound(epochRoundId);
    const allTaken = Array.from(roundData.tickets.keys());

    // 1. IF NO TICKETS ARE TAKEN:
    // Game never plays empty rounds, but the seconds countdown MUST keep ticking down in real time!
    if (allTaken.length === 0) {
      const remainingSeconds = Math.max(0, Math.ceil((customLobbyMs - (elapsedInRound % customLobbyMs)) / 1000));
      return {
        success: true,
        serverTime: now,
        roundId: epochRoundId,
        phase: 'lobby',
        countdown: remainingSeconds,
        elapsedInRound,
        drawnBalls: [],
        currentBall: null,
        totalRoomTickets: 0,
        takenTickets: [],
        takenDetails: {},
        jackpot: 0,
        winnerInfo: null,
        playersCount: 0,
        lobbyDuration: customLobbyMs,
      };
    }

    // 2. AT LEAST ONE TICKET IS TAKEN: Universal synchronized timeline
    const roundDuration = customLobbyMs + CALLING_MS + VICTORY_MS;
    const balls = getDeterministicBalls(epochRoundId);

    let phase: 'lobby' | 'game' | 'victory' = 'lobby';
    let countdown = 0;
    let drawnBalls: number[] = [];

    if (elapsedInRound < customLobbyMs) {
      // 2A. Lobby Betting Phase (0 to 45s)
      phase = 'lobby';
      countdown = Math.max(0, Math.ceil((customLobbyMs - elapsedInRound) / 1000));
      drawnBalls = [];
    } else if (elapsedInRound < customLobbyMs + CALLING_MS) {
      // 2B. Live Calling Phase (45s to 95s: 20 balls @ 2.5s)
      phase = 'game';
      countdown = 0;
      const gameElapsed = elapsedInRound - customLobbyMs;
      const count = Math.min(20, Math.floor(gameElapsed / BALL_INTERVAL_MS) + 1);
      drawnBalls = balls.slice(0, count).reverse();
    } else {
      // 2C. Victory Celebration Phase (95s to 98s)
      phase = 'victory';
      countdown = Math.max(0, Math.ceil((roundDuration - elapsedInRound) / 1000));
      drawnBalls = balls.slice(0, 20).reverse();
    }

    const currentBall = drawnBalls[0] || null;
    const details: Record<number, { userId: string; userName: string; userPhone?: string }> = {};
    const uniqueUsers = new Set<string>();

    for (const [tNum, info] of roundData.tickets.entries()) {
      details[tNum] = { userId: info.userId, userName: info.userName, userPhone: info.userPhone };
      uniqueUsers.add(info.userId);
    }

    // Evaluate winner strictly among participating tickets
    const { winningTicket, winningBallCount } = evaluateWinner(allTaken, balls);
    const winnerRecord = winningTicket ? details[winningTicket] : null;
    const winnerInfo = winningTicket
      ? {
          ticket: winningTicket,
          winningBallCount: winningBallCount || 20,
          name: winnerRecord?.userName || 'ተጫዋች',
          phone: winnerRecord?.userPhone || '',
          userId: winnerRecord?.userId || '',
        }
      : null;

    const totalRoomTickets = allTaken.length;
    const jackpot = totalRoomTickets * 10;

    return {
      success: true,
      serverTime: now,
      roundId: epochRoundId,
      phase,
      countdown,
      elapsedInRound,
      drawnBalls,
      currentBall,
      totalRoomTickets,
      takenTickets: allTaken,
      takenDetails: details,
      jackpot,
      winnerInfo,
      playersCount: uniqueUsers.size,
      lobbyDuration: customLobbyMs,
    };
  }

  function broadcastMasterState(lastAction?: any) {
    if (sseClients.size === 0) return;
    const state = getMasterRoomState();
    const payload = JSON.stringify({ ...state, lastAction });
    const dataStr = `data: ${payload}\n\n`;

    for (const client of Array.from(sseClients)) {
      try {
        client.write(dataStr);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  return {
    name: 'live-room-sync-plugin',
    apply: 'serve',
    configureServer(server) {
      // Authoritative 1000ms Server Master Clock Ticker (Only runs during dev server)
      const ticker = setInterval(() => {
        broadcastMasterState({ type: "TICK" });
      }, 1000);
      if (ticker.unref) ticker.unref();

      server.httpServer?.on('close', () => {
        clearInterval(ticker);
      });

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);

        // CORS Headers for all room API routes
        if (url.pathname.startsWith('/api/room')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }
        }

        // 1. GET /api/room/stream (Server-Sent Events Realtime Push to all Phones)
        if (url.pathname === '/api/room/stream') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });

          // Send current state immediately
          const initial = getMasterRoomState();
          res.write(`data: ${JSON.stringify(initial)}\n\n`);

          sseClients.add(res);

          req.on('close', () => {
            sseClients.delete(res);
          });
          return;
        }

        // 2. GET /api/room/state (Authoritative Snapshot)
        if (url.pathname === '/api/room/state') {
          const state = getMasterRoomState();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.end(JSON.stringify(state));
          return;
        }

        // 3. POST /api/room/select (Claim cartela, instantly broadcast to other phones)
        if (url.pathname === '/api/room/select' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { roundId, ticketNum, userId, userName, userPhone } = body;

              if (typeof ticketNum !== 'number' || !userId) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Invalid parameters' }));
                return;
              }

              const currentState = getMasterRoomState();
              const effectiveRoundId = currentState.roundId;
              const roundData = getOrCreateRound(effectiveRoundId);

              // Check if ticket is already taken by a different user
              const existing = roundData.tickets.get(ticketNum);
              if (existing && existing.userId !== userId) {
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ...currentState,
                    success: false,
                    error: 'TICKET_ALREADY_TAKEN',
                  })
                );
                return;
              }

              // Claim ticket
              roundData.tickets.set(ticketNum, {
                userId,
                userName: userName || 'ተጫዋች',
                userPhone: userPhone || '',
                time: Date.now(),
              });

              // If this is the first ticket claimed, start the lobby timer now!
              if (!roundData.firstTicketAt) {
                roundData.firstTicketAt = Date.now();
              }

              // Instantly broadcast to all connected phones via SSE
              broadcastMasterState({
                type: 'SELECT',
                ticketNum,
                userName: userName || 'ተጫዋች',
                time: Date.now(),
              });

              const updatedState = getMasterRoomState();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(updatedState));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Bad Request' }));
            }
          });
          return;
        }

        // 4. POST /api/room/unselect (Release cartela)
        if (url.pathname === '/api/room/unselect' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { ticketNum, userId } = body;

              const currentState = getMasterRoomState();
              const effectiveRoundId = currentState.roundId;
              const roundData = getOrCreateRound(effectiveRoundId);
              const existing = roundData.tickets.get(ticketNum);

              // Allow releasing if owned or admin
              if (!existing || !userId || existing.userId === userId) {
                roundData.tickets.delete(ticketNum);
                if (roundData.tickets.size === 0) {
                  roundData.firstTicketAt = null;
                }
              }

              // Broadcast change
              broadcastMasterState({
                type: 'UNSELECT',
                ticketNum,
                time: Date.now(),
              });

              const updatedState = getMasterRoomState();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(updatedState));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Bad Request' }));
            }
          });
          return;
        }

        // 5. POST /api/room/admin/action (Master Admin Clock & Round Control)
        if (url.pathname === '/api/room/admin/action' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { action, lobbySeconds } = body;

              const state = getMasterRoomState();
              const roundData = getOrCreateRound(state.roundId);

              if (action === 'force_start') {
                roundData.forcedStartAt = Date.now();
              } else if (action === 'next_round') {
                currentRoundId += 1;
              } else if (action === 'set_lobby_seconds' && typeof lobbySeconds === 'number') {
                customLobbyMs = Math.max(10000, Math.min(120000, lobbySeconds * 1000));
              } else if (action === 'inject_bots') {
                const count = typeof body.botCount === 'number' ? Math.max(1, Math.min(200, body.botCount)) : 10;
                injectBotsIntoRound(roundData, count);
              } else if (action === 'clear_bots') {
                for (const [tNum, info] of Array.from(roundData.tickets.entries())) {
                  if (info.userId.startsWith('bot_')) {
                    roundData.tickets.delete(tNum);
                  }
                }
                if (roundData.tickets.size === 0) {
                  roundData.firstTicketAt = null;
                  roundData.forcedStartAt = null;
                }
              } else if (action === 'update_bot_settings' && body.botSettings) {
                serverBotSettings = { ...serverBotSettings, ...body.botSettings };
                if (serverBotSettings.isBotSystemActive && roundData.tickets.size === 0 && (serverBotSettings.minBots || 10) > 0) {
                  injectBotsIntoRound(roundData, serverBotSettings.minBots || 10);
                } else if (!serverBotSettings.isBotSystemActive) {
                  for (const [tNum, info] of Array.from(roundData.tickets.entries())) {
                    if (info.userId.startsWith('bot_')) {
                      roundData.tickets.delete(tNum);
                    }
                  }
                  if (roundData.tickets.size === 0) {
                    roundData.firstTicketAt = null;
                    roundData.forcedStartAt = null;
                  }
                }
              } else if (action === 'reset') {
                roundData.tickets.clear();
                roundData.firstTicketAt = null;
                roundData.forcedStartAt = null;
              }

              broadcastMasterState({ type: 'ADMIN_ACTION', action, time: Date.now() });
              const updatedState = getMasterRoomState();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(updatedState));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Bad Request' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), liveRoomSyncPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
