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

function checkTicketBingo(ticketId: number, called: number[]): boolean {
  const board = generateBoard(ticketId);
  const calledSet = new Set(called);
  const grid: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));
  board.forEach((cell) => {
    grid[cell.row]![cell.col] = cell.value === "FREE" || (typeof cell.value === "number" && calledSet.has(cell.value));
  });
  return checkBingoPattern(grid);
}

function evaluateWinner(tickets: number[], balls: number[]) {
  if (!tickets || tickets.length === 0) {
    return { winningTicket: 0, winningBallCount: 0 };
  }
  for (let k = 4; k <= balls.length; k++) {
    const subBalls = balls.slice(0, k);
    for (const t of tickets) {
      if (checkTicketBingo(t, subBalls)) {
        return { winningTicket: t, winningBallCount: k };
      }
    }
  }
  return { winningTicket: tickets[0] || 0, winningBallCount: balls.length };
}

function getDeterministicOpponents(_roundId: number) {
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

function liveRoomSyncPlugin(): Plugin {
  // Authoritative Central Game State Engine (Spark Bingo architecture)
  let gameState: 'WAITING' | 'PLAYING' | 'FINISHED' = 'WAITING';
  let gameClock = 45; // Default 45 seconds countdown
  let gameTimerSetting = 45; // Resets back to 45 if no players take a cartela
  let ballTimer = 3; // 3 seconds interval between drawn balls
  let currentRoundId = Math.floor(Math.random() * 90000) + 10000;

  // Participating tickets: Map<ticketNumber, { userId, userName, userPhone, time }>
  const activeTickets = new Map<number, { userId: string; userName: string; userPhone?: string; time: number }>();

  let calledNumbers: number[] = [];
  let currentDrawSequence: number[] = [];
  let winnerInfo: any = null;

  // Active SSE clients
  const sseClients = new Set<any>();

  function injectBots(count: number) {
    const available: number[] = [];
    for (let i = 1; i <= 520; i++) {
      if (!activeTickets.has(i)) available.push(i);
    }
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = available[i]!;
      available[i] = available[j]!;
      available[j] = temp;
    }
    const toAdd = Math.min(count, available.length);
    for (let i = 0; i < toAdd; i++) {
      const ticketNum = available[i]!;
      const name = ETHIOPIAN_BOT_NAMES[Math.floor(Math.random() * ETHIOPIAN_BOT_NAMES.length)]!;
      const phone = generateBotPhone();
      const botId = `bot_${Math.random().toString(36).substring(2, 8)}`;
      activeTickets.set(ticketNum, {
        userId: botId,
        userName: name,
        userPhone: phone,
        time: Date.now(),
      });
    }
  }

  function getMasterRoomState() {
    const allTaken = Array.from(activeTickets.keys());
    const details: Record<number, { userId: string; userName: string; userPhone?: string }> = {};
    const uniqueUsers = new Set<string>();

    for (const [tNum, info] of activeTickets.entries()) {
      details[tNum] = { userId: info.userId, userName: info.userName, userPhone: info.userPhone };
      uniqueUsers.add(info.userId);
    }

    const phase = gameState === 'WAITING' ? 'lobby' : (gameState === 'PLAYING' ? 'game' : 'victory');
    const totalRoomTickets = allTaken.length;
    const jackpot = totalRoomTickets * 10;

    return {
      success: true,
      serverTime: Date.now(),
      roundId: currentRoundId,
      gameState,
      phase,
      countdown: gameClock,
      drawnBalls: [...calledNumbers].reverse(),
      currentBall: calledNumbers[calledNumbers.length - 1] || null,
      totalRoomTickets,
      takenTickets: allTaken,
      takenDetails: details,
      jackpot,
      winnerInfo,
      playersCount: uniqueUsers.size,
      lobbyDuration: gameTimerSetting * 1000,
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
      // Authoritative 1000ms Master Server Clock Loop
      const ticker = setInterval(() => {
        if (gameState === 'WAITING') {
          gameClock--;

          if (gameClock <= 0) {
            // 🔴 45 SECONDS REACHED!
            if (activeTickets.size > 0) {
              // PLAYERS ARE READY: START GAME FOR EVERYONE AT THE SAME SECOND!
              gameState = 'PLAYING';
              gameClock = 0;
              ballTimer = 2; // first ball in 2 seconds
              currentDrawSequence = Array.from({ length: 75 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
              calledNumbers = [];
              winnerInfo = null;
              broadcastMasterState({ type: 'GAME_STARTED' });
            } else {
              // 🔴 NO PLAYERS HAVE PURCHASED CARTELAS:
              // DO NOT START THE GAME! RESET TO 45 AND COUNT DOWN AGAIN!
              gameClock = gameTimerSetting; // resets to 45
              broadcastMasterState({ type: 'TIMER_RESET' });
            }
          } else {
            broadcastMasterState({ type: 'TICK' });
          }
        } else if (gameState === 'PLAYING') {
          ballTimer--;
          if (ballTimer <= 0) {
            ballTimer = 3; // next ball in 3 seconds
            if (currentDrawSequence.length > 0) {
              const nextBall = currentDrawSequence.pop()!;
              calledNumbers.push(nextBall);

              // Check if any participating ticket won
              let winTicket = 0;
              for (const tNum of activeTickets.keys()) {
                if (checkTicketBingo(tNum, calledNumbers)) {
                  winTicket = tNum;
                  break;
                }
              }

              if (winTicket > 0) {
                gameState = 'FINISHED';
                gameClock = 12; // 12 seconds victory celebration
                const owner = activeTickets.get(winTicket);
                winnerInfo = {
                  ticket: winTicket,
                  winningBallCount: calledNumbers.length,
                  name: owner?.userName || 'ተጫዋች',
                  phone: owner?.userPhone || '',
                  userId: owner?.userId || '',
                  prize: activeTickets.size * 10,
                };
                broadcastMasterState({ type: 'GAME_WINNER', winnerInfo });
              } else if (calledNumbers.length >= 75) {
                gameState = 'FINISHED';
                gameClock = 10;
                broadcastMasterState({ type: 'GAME_FINISHED' });
              } else {
                broadcastMasterState({ type: 'NEW_BALL', ball: nextBall });
              }
            } else {
              gameState = 'FINISHED';
              gameClock = 10;
              broadcastMasterState({ type: 'GAME_FINISHED' });
            }
          } else {
            broadcastMasterState({ type: 'TICK' });
          }
        } else if (gameState === 'FINISHED') {
          gameClock--;
          if (gameClock <= 0) {
            // Next round reset:
            gameState = 'WAITING';
            gameClock = gameTimerSetting; // 45s
            activeTickets.clear();
            calledNumbers = [];
            currentDrawSequence = [];
            winnerInfo = null;
            currentRoundId = Math.floor(Math.random() * 90000) + 10000;
            broadcastMasterState({ type: 'ROUND_RESET', roundId: currentRoundId });
          } else {
            broadcastMasterState({ type: 'TICK' });
          }
        }
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
              const { ticketNum, userId, userName, userPhone } = body;

              if (typeof ticketNum !== 'number' || !userId) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Invalid parameters' }));
                return;
              }

              // If game has already started, cannot buy cartela for current round
              if (gameState !== 'WAITING') {
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ...getMasterRoomState(),
                    success: false,
                    error: 'GAME_ALREADY_STARTED',
                  })
                );
                return;
              }

              // Check if ticket is already taken by a different user
              const existing = activeTickets.get(ticketNum);
              if (existing && existing.userId !== userId) {
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ...getMasterRoomState(),
                    success: false,
                    error: 'TICKET_ALREADY_TAKEN',
                  })
                );
                return;
              }

              // Claim ticket
              activeTickets.set(ticketNum, {
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
              const { ticketNum, userId } = body;

              if (gameState !== 'WAITING') {
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ...getMasterRoomState(),
                    success: false,
                    error: 'CANNOT_UNSELECT_DURING_GAME',
                  })
                );
                return;
              }

              const existing = activeTickets.get(ticketNum);
              // Allow releasing if owned or admin
              if (!existing || !userId || existing.userId === userId) {
                activeTickets.delete(ticketNum);
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
                if (activeTickets.size === 0) {
                  injectBots(2);
                }
                gameState = 'PLAYING';
                gameClock = 0;
                ballTimer = 2;
                currentDrawSequence = Array.from({ length: 75 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
                calledNumbers = [];
                winnerInfo = null;
              } else if (action === 'next_round' || action === 'reset') {
                gameState = 'WAITING';
                gameClock = gameTimerSetting;
                activeTickets.clear();
                calledNumbers = [];
                currentDrawSequence = [];
                winnerInfo = null;
                currentRoundId = Math.floor(Math.random() * 90000) + 10000;
              } else if (action === 'set_lobby_seconds' && typeof lobbySeconds === 'number') {
                gameTimerSetting = Math.max(10, Math.min(120, lobbySeconds));
                if (gameState === 'WAITING') {
                  gameClock = gameTimerSetting;
                }
              } else if (action === 'inject_bots') {
                const count = typeof body.botCount === 'number' ? Math.max(1, Math.min(200, body.botCount)) : 10;
                injectBots(count);
              } else if (action === 'clear_bots') {
                for (const [tNum, info] of Array.from(activeTickets.entries())) {
                  if (info.userId.startsWith('bot_')) {
                    activeTickets.delete(tNum);
                  }
                }
              } else if (action === 'update_bot_settings' && body.botSettings) {
                serverBotSettings = { ...serverBotSettings, ...body.botSettings };
                if (serverBotSettings.isBotSystemActive && activeTickets.size === 0 && (serverBotSettings.minBots || 10) > 0) {
                  injectBots(serverBotSettings.minBots || 10);
                } else if (!serverBotSettings.isBotSystemActive) {
                  for (const [tNum, info] of Array.from(activeTickets.entries())) {
                    if (info.userId.startsWith('bot_')) {
                      activeTickets.delete(tNum);
                    }
                  }
                }
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
