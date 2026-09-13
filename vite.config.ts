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
  if (tickets.length === 0) {
    return { winningTicket: 1, winningBallCount: 20 };
  }
  const boards = tickets.map((t) => ({ t, cells: generateBoard(t) }));
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
  // Default to ticket with closest match at ball 20
  return { winningTicket: tickets[0] || 1, winningBallCount: 20 };
}

function getDeterministicOpponents(roundId: number) {
  const rand = createPRNG(roundId * 433494437);
  const count = 4 + Math.floor(rand() * 4); // 4 to 7 opponent tickets
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

function liveRoomSyncPlugin(): Plugin {
  // Master Clock & Room Store
  let customLobbyMs = 45000;
  let roundOffset = 0;
  let forceGameStartAt: number | null = null;

  const roundsMap = new Map<
    number,
    Map<
      number,
      { userId: string; userName: string; userPhone?: string; time: number }
    >
  >();

  // Active SSE connection clients
  const sseClients = new Set<any>();

  function cleanOldRounds(latestRoundId: number) {
    if (roundsMap.size > 8) {
      for (const rId of roundsMap.keys()) {
        if (rId < latestRoundId - 5) {
          roundsMap.delete(rId);
        }
      }
    }
  }

  function getOrCreateRound(roundId: number) {
    let roundMap = roundsMap.get(roundId);
    if (!roundMap) {
      roundMap = new Map();
      roundsMap.set(roundId, roundMap);
    }
    cleanOldRounds(roundId);
    return roundMap;
  }

  function getMasterRoomState() {
    const now = Date.now();
    const roundDuration = customLobbyMs + CALLING_MS + VICTORY_MS;
    const baseRoundId = Math.floor(now / roundDuration);
    const currentRoundId = baseRoundId + roundOffset;
    let elapsed = now % roundDuration;

    let phase: "lobby" | "game" | "victory" = "lobby";
    let countdown = 0;

    if (forceGameStartAt && now >= forceGameStartAt && elapsed < customLobbyMs) {
      // Admin forced early game start
      elapsed = customLobbyMs + (now - forceGameStartAt);
    }

    const balls = getDeterministicBalls(currentRoundId);
    let drawnBalls: number[] = [];

    if (elapsed < customLobbyMs) {
      phase = "lobby";
      countdown = Math.max(0, Math.ceil((customLobbyMs - elapsed) / 1000));
      drawnBalls = [];
    } else if (elapsed < customLobbyMs + CALLING_MS) {
      phase = "game";
      countdown = 0;
      const gameElapsed = elapsed - customLobbyMs;
      const count = Math.min(20, Math.floor(gameElapsed / BALL_INTERVAL_MS) + 1);
      drawnBalls = balls.slice(0, count).reverse();
    } else {
      phase = "victory";
      countdown = Math.max(0, Math.ceil((roundDuration - elapsed) / 1000));
      drawnBalls = balls.slice(0, 20).reverse();
    }

    const currentBall = drawnBalls[0] || null;
    const roundMap = getOrCreateRound(currentRoundId);
    const realTickets = Array.from(roundMap.keys());
    const opponentList = getDeterministicOpponents(currentRoundId);
    const filteredOpponents = opponentList.filter((o) => !roundMap.has(o.ticketNum));
    const allTaken = Array.from(new Set([...realTickets, ...filteredOpponents.map((o) => o.ticketNum)]));

    const details: Record<number, { userId: string; userName: string; userPhone?: string }> = {};
    const uniqueUsers = new Set<string>();

    for (const [tNum, info] of roundMap.entries()) {
      details[tNum] = { userId: info.userId, userName: info.userName, userPhone: info.userPhone };
      uniqueUsers.add(info.userId);
    }
    for (const o of filteredOpponents) {
      details[o.ticketNum] = { userId: `opp_${o.ticketNum}`, userName: o.userName, userPhone: o.userPhone };
    }

    const { winningTicket, winningBallCount } = evaluateWinner(allTaken, balls);
    const winnerRecord = details[winningTicket];
    const winnerInfo = {
      ticket: winningTicket,
      winningBallCount,
      name: winnerRecord?.userName || "አበበ ተፈራ",
      phone: winnerRecord?.userPhone || "0911***89",
      userId: winnerRecord?.userId || `opp_${winningTicket}`,
    };

    const totalRoomTickets = allTaken.length;
    const jackpot = totalRoomTickets * 10;

    return {
      success: true,
      serverTime: now,
      roundId: currentRoundId,
      phase,
      countdown,
      elapsedInRound: elapsed,
      drawnBalls,
      currentBall,
      totalRoomTickets,
      takenTickets: allTaken,
      takenDetails: details,
      jackpot,
      winnerInfo,
      playersCount: uniqueUsers.size + filteredOpponents.length,
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

  // Authoritative 1000ms Server Master Clock Ticker
  setInterval(() => {
    broadcastMasterState({ type: "TICK" });
  }, 1000);

  return {
    name: 'live-room-sync-plugin',
    configureServer(server) {
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
              const effectiveRoundId = typeof roundId === 'number' ? roundId : currentState.roundId;
              const roundMap = getOrCreateRound(effectiveRoundId);

              // Check if ticket is already taken by a different user
              const existing = roundMap.get(ticketNum);
              if (existing && existing.userId !== userId) {
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: false,
                    error: 'TICKET_ALREADY_TAKEN',
                    ...currentState,
                  })
                );
                return;
              }

              // Claim ticket
              roundMap.set(ticketNum, {
                userId,
                userName: userName || 'ተጫዋች',
                userPhone: userPhone || '',
                time: Date.now(),
              });

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
              const { roundId, ticketNum, userId } = body;

              const currentState = getMasterRoomState();
              const effectiveRoundId = typeof roundId === 'number' ? roundId : currentState.roundId;
              const roundMap = getOrCreateRound(effectiveRoundId);
              const existing = roundMap.get(ticketNum);

              // Allow releasing if owned or admin
              if (!existing || !userId || existing.userId === userId) {
                roundMap.delete(ticketNum);
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

              if (action === 'force_start') {
                forceGameStartAt = Date.now();
              } else if (action === 'next_round') {
                roundOffset += 1;
                forceGameStartAt = null;
              } else if (action === 'set_lobby_seconds' && typeof lobbySeconds === 'number') {
                customLobbyMs = Math.max(10000, Math.min(120000, lobbySeconds * 1000));
              } else if (action === 'reset') {
                forceGameStartAt = null;
                const state = getMasterRoomState();
                const roundMap = getOrCreateRound(state.roundId);
                roundMap.clear();
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
