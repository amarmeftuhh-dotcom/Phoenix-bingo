/**
 * Phoenix Bingo - Production Telegram Bot Server
 * Single-Instance Polling, Clean Single Messages, 15 ETB Play Wallet, Password Generation.
 */

import https from "node:https";
import http from "node:http";
import { MongoClient } from "mongodb";

// 1. Render Web Service & Realtime Room Sync Server
const PORT = process.env.PORT || 10000;
const botRoundsMap = new Map();

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

function createPRNG(seed) {
  let s = (seed * 1664525 + 1013904223) >>> 0;
  return function next() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function getDeterministicBalls(roundId) {
  const balls = Array.from({ length: 75 }, (_, i) => i + 1);
  const rand = createPRNG(roundId * 982451653);
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = balls[i];
    balls[i] = balls[j];
    balls[j] = temp;
  }
  return balls;
}

function generateBoard(ticketId) {
  let seed = (ticketId * 1234567) >>> 0;
  function nextRand() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  nextRand(); nextRand(); nextRand();

  function getCol(min, max) {
    const arr = [];
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

  const cells = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) {
        cells.push({ row: r, col: c, value: "FREE" });
      } else {
        cells.push({ row: r, col: c, value: columns[c][r] });
      }
    }
  }
  return cells;
}

function checkBingoPattern(grid) {
  for (let r = 0; r < 5; r++) {
    if (grid[r].every(Boolean)) return true;
  }
  for (let c = 0; c < 5; c++) {
    let colFull = true;
    for (let r = 0; r < 5; r++) {
      if (!grid[r][c]) { colFull = false; break; }
    }
    if (colFull) return true;
  }
  let d1 = true;
  for (let i = 0; i < 5; i++) {
    if (!grid[i][i]) { d1 = false; break; }
  }
  if (d1) return true;
  let d2 = true;
  for (let i = 0; i < 5; i++) {
    if (!grid[i][4 - i]) { d2 = false; break; }
  }
  if (d2) return true;
  if (grid[0][0] && grid[0][4] && grid[4][0] && grid[4][4]) return true;
  return false;
}

function evaluateWinner(tickets, balls) {
  if (!tickets || tickets.length === 0) return { winningTicket: 0, winningBallCount: 0 };
  const boards = tickets.map((t) => ({ t, cells: generateBoard(t) }));

  // 1. Check for complete Bingo pattern in balls 4 to 20
  for (let k = 4; k <= 20; k++) {
    const drawnSet = new Set(balls.slice(0, k));
    for (const b of boards) {
      const grid = Array.from({ length: 5 }, () => Array(5).fill(false));
      b.cells.forEach((cell) => {
        grid[cell.row][cell.col] = cell.value === "FREE" || (typeof cell.value === "number" && drawnSet.has(cell.value));
      });
      if (checkBingoPattern(grid)) {
        return { winningTicket: b.t, winningBallCount: k };
      }
    }
  }

  // 2. If no card hits full 5-line Bingo by ball 20, the ticket with highest matches among participants wins!
  const drawnSet20 = new Set(balls.slice(0, 20));
  let bestTicket = tickets[0];
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

function getDeterministicOpponents(roundId) {
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

function injectBotsIntoRound(roundData, count) {
  const available = [];
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

let customLobbyMs = 45000;
let currentRoundId = Math.floor(Date.now() / 100000);
const sseClients = new Set();

function getOrCreateBotRound(roundId) {
  let roundData = botRoundsMap.get(roundId);
  if (!roundData) {
    roundData = {
      tickets: new Map(),
      firstTicketAt: null,
      forcedStartAt: null,
    };
    botRoundsMap.set(roundId, roundData);
  }
  if (botRoundsMap.size > 15) {
    for (const rId of botRoundsMap.keys()) {
      if (rId < roundId - 5) botRoundsMap.delete(rId);
    }
  }
  return roundData;
}

function getMasterRoomState() {
  const now = Date.now();
  const roundData = getOrCreateBotRound(currentRoundId);
  const allTaken = Array.from(roundData.tickets.keys());

  // 1. IF NO TICKETS ARE TAKEN: THE GAME NEVER STARTS! IT STAYS IN LOBBY WAITING FOR PLAYERS!
  if (allTaken.length === 0) {
    roundData.firstTicketAt = null;
    roundData.forcedStartAt = null;
    return {
      success: true,
      serverTime: now,
      roundId: currentRoundId,
      phase: "lobby",
      countdown: Math.round(customLobbyMs / 1000),
      elapsedInRound: 0,
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

  // 2. AT LEAST ONE TICKET IS TAKEN: Start countdown if not started!
  if (!roundData.firstTicketAt) {
    roundData.firstTicketAt = now;
  }

  let elapsed = now - roundData.firstTicketAt;
  if (roundData.forcedStartAt && now >= roundData.forcedStartAt && elapsed < customLobbyMs) {
    elapsed = customLobbyMs + (now - roundData.forcedStartAt);
  }

  const roundDuration = customLobbyMs + CALLING_MS + VICTORY_MS;
  const balls = getDeterministicBalls(currentRoundId);

  let phase = "lobby";
  let countdown = 0;
  let drawnBalls = [];

  if (elapsed < customLobbyMs) {
    // 2A. Lobby Betting Phase
    phase = "lobby";
    countdown = Math.max(0, Math.ceil((customLobbyMs - elapsed) / 1000));
    drawnBalls = [];
  } else if (elapsed < customLobbyMs + CALLING_MS) {
    // 2B. Live Calling Phase
    phase = "game";
    countdown = 0;
    const gameElapsed = elapsed - customLobbyMs;
    const count = Math.min(20, Math.floor(gameElapsed / BALL_INTERVAL_MS) + 1);
    drawnBalls = balls.slice(0, count).reverse();
  } else if (elapsed < roundDuration) {
    // 2C. Victory Celebration Phase
    phase = "victory";
    countdown = Math.max(0, Math.ceil((roundDuration - elapsed) / 1000));
    drawnBalls = balls.slice(0, 20).reverse();
  } else {
    // 2D. Victory finished! Advance cleanly to next round
    currentRoundId += 1;
    const nextRound = getOrCreateBotRound(currentRoundId);
    if (serverBotSettings.isBotSystemActive && (serverBotSettings.minBots || 0) > 0) {
      const botMin = Math.max(1, serverBotSettings.minBots);
      const botMax = Math.max(botMin, serverBotSettings.maxBots || botMin);
      const count = Math.floor(Math.random() * (botMax - botMin + 1)) + botMin;
      injectBotsIntoRound(nextRound, count);
    }
    return {
      success: true,
      serverTime: now,
      roundId: currentRoundId,
      phase: "lobby",
      countdown: Math.round(customLobbyMs / 1000),
      elapsedInRound: 0,
      drawnBalls: [],
      currentBall: null,
      totalRoomTickets: nextRound.tickets.size,
      takenTickets: Array.from(nextRound.tickets.keys()),
      takenDetails: {},
      jackpot: nextRound.tickets.size * 10,
      winnerInfo: null,
      playersCount: 0,
      lobbyDuration: customLobbyMs,
    };
  }

  const currentBall = drawnBalls[0] || null;
  const details = {};
  const uniqueUsers = new Set();

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
        name: winnerRecord?.userName || "ተጫዋች",
        phone: winnerRecord?.userPhone || "",
        userId: winnerRecord?.userId || "",
      }
    : null;

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
    playersCount: uniqueUsers.size,
    lobbyDuration: customLobbyMs,
  };
}

function broadcastMasterState(lastAction) {
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

setInterval(() => {
  broadcastMasterState({ type: "TICK" });
}, 1000);

http.createServer((req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/room/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    const initial = getMasterRoomState();
    res.write(`data: ${JSON.stringify(initial)}\n\n`);
    sseClients.add(res);

    req.on("close", () => {
      sseClients.delete(res);
    });
    return;
  }

  if (url.pathname === "/api/room/state") {
    const state = getMasterRoomState();
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
    res.end(JSON.stringify(state));
    return;
  }

  if (url.pathname === "/api/room/select" && req.method === "POST") {
    let bodyStr = "";
    req.on("data", (chunk) => { bodyStr += chunk; });
    req.on("end", () => {
      try {
        const body = JSON.parse(bodyStr || "{}");
        const currentState = getMasterRoomState();
        const roundId = typeof body.roundId === "number" ? body.roundId : currentState.roundId;
        const roundMap = getOrCreateBotRound(roundId);

        if (body.ticketNum && body.userId) {
          const existing = roundMap.get(body.ticketNum);
          if (existing && existing.userId !== body.userId) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ...currentState, success: false, error: "TICKET_ALREADY_TAKEN" }));
            return;
          }
          roundMap.set(body.ticketNum, { userId: body.userId, userName: body.userName || "ተጫዋች", userPhone: body.userPhone || "", time: Date.now() });
        }

        broadcastMasterState({ type: "SELECT", ticketNum: body.ticketNum, userName: body.userName || "ተጫዋች", time: Date.now() });
        const updatedState = getMasterRoomState();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(updatedState));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return;
  }

  if (url.pathname === "/api/room/unselect" && req.method === "POST") {
    let bodyStr = "";
    req.on("data", (chunk) => { bodyStr += chunk; });
    req.on("end", () => {
      try {
        const body = JSON.parse(bodyStr || "{}");
        const currentState = getMasterRoomState();
        const roundId = typeof body.roundId === "number" ? body.roundId : currentState.roundId;
        const roundMap = getOrCreateBotRound(roundId);
        if (body.ticketNum) {
          roundMap.delete(body.ticketNum);
        }

        broadcastMasterState({ type: "UNSELECT", ticketNum: body.ticketNum, time: Date.now() });
        const updatedState = getMasterRoomState();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(updatedState));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return;
  }

  if (url.pathname === "/api/room/admin/action" && req.method === "POST") {
    let bodyStr = "";
    req.on("data", (chunk) => { bodyStr += chunk; });
    req.on("end", () => {
      try {
        const body = JSON.parse(bodyStr || "{}");
        const { action, lobbySeconds } = body;

        if (action === "force_start") {
          forceGameStartAt = Date.now();
        } else if (action === "next_round") {
          roundOffset += 1;
          forceGameStartAt = null;
        } else if (action === "set_lobby_seconds" && typeof lobbySeconds === "number") {
          customLobbyMs = Math.max(10000, Math.min(120000, lobbySeconds * 1000));
        } else if (action === "inject_bots") {
          const state = getMasterRoomState();
          const roundData = getOrCreateBotRound(state.roundId);
          const count = typeof body.botCount === "number" ? Math.max(1, Math.min(200, body.botCount)) : 10;
          injectBotsIntoRound(roundData, count);
        } else if (action === "clear_bots") {
          const state = getMasterRoomState();
          const roundData = getOrCreateBotRound(state.roundId);
          for (const [tNum, info] of Array.from(roundData.tickets.entries())) {
            if (info.userId.startsWith("bot_")) {
              roundData.tickets.delete(tNum);
            }
          }
          if (roundData.tickets.size === 0) {
            roundData.firstTicketAt = null;
            roundData.forcedStartAt = null;
          }
        } else if (action === "update_bot_settings" && body.botSettings) {
          serverBotSettings = { ...serverBotSettings, ...body.botSettings };
          const state = getMasterRoomState();
          const roundData = getOrCreateBotRound(state.roundId);
          if (serverBotSettings.isBotSystemActive && roundData.tickets.size === 0 && (serverBotSettings.minBots || 10) > 0) {
            injectBotsIntoRound(roundData, serverBotSettings.minBots || 10);
          } else if (!serverBotSettings.isBotSystemActive) {
            for (const [tNum, info] of Array.from(roundData.tickets.entries())) {
              if (info.userId.startsWith("bot_")) {
                roundData.tickets.delete(tNum);
              }
            }
            if (roundData.tickets.size === 0) {
              roundData.firstTicketAt = null;
              roundData.forcedStartAt = null;
            }
          }
        } else if (action === "reset") {
          forceGameStartAt = null;
          const state = getMasterRoomState();
          const roundMap = getOrCreateBotRound(state.roundId);
          roundMap.clear();
        }

        broadcastMasterState({ type: "ADMIN_ACTION", action, time: Date.now() });
        const updatedState = getMasterRoomState();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(updatedState));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return;
  }

  if (url.pathname === "/api/room/unselect" && req.method === "POST") {
    let bodyStr = "";
    req.on("data", (chunk) => { bodyStr += chunk; });
    req.on("end", () => {
      try {
        const body = JSON.parse(bodyStr || "{}");
        if (body.ticketNum) {
          botServerTakenTickets.delete(body.ticketNum);
        }
        const taken = Array.from(botServerTakenTickets.keys());
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, takenTickets: taken }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Phoenix Bingo Bot & Live Sync Server is running 24/7 with MongoDB Atlas!\n");
}).listen(PORT, () => {
  console.log("HTTP health-check and room-sync server listening on port " + PORT);
});

// 2. Constants & Settings
const BOT_TOKEN = process.env.BOT_TOKEN || "8606075616:AAFmq_dQ_eCRDzEqnw5N2Ybc9_dkOS5BiDg";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://phoenix-bingo.onrender.com/#home";
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://Phoenix:761724@cluster0.pivq9lg.mongodb.net/phoenix_bingo?retryWrites=true&w=majority";

const ADMIN_CONFIG = {
  adminTelegramId: 389547943,
  supportUsername: "@Phonix_s",
  telebirrNumber: "+251956998368",
  cbeAccount: "+251956998368",
  minWithdraw: 50,
  initialPlayBonus: 15.00, // 15 ETB መጫወቻ ቦነስ
};

// 📱 ስልኩን ያላረጋገጠ ሰው የሚያየው አንድ እና ብቸኛ ቁልፍ
const CONTACT_KEYBOARD = {
  keyboard: [
    [
      {
        text: "📱 ስልክ ቁጥርዎን ያጋሩ (Register Phone)",
        request_contact: true,
      },
    ],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
};

// 🎮 ስልኩን ያረጋገጠ ሰው ብቻ የሚያየው ዋና ኪቦርድ (በብሮውዘር ክፈት የሌለበት!)
function getVerifiedKeyboard(user) {
  const bonus = user.bonus != null ? user.bonus : ADMIN_CONFIG.initialPlayBonus;
  const balance = user.balance != null ? user.balance : 0;
  const cleanBase = (process.env.WEBAPP_URL || "https://phoenix-bingo.onrender.com").replace(/#.*$/, "");
  const playUrl = `${cleanBase}?tgId=${user.userId}&phone=${encodeURIComponent(user.phone || "")}&name=${encodeURIComponent(user.name || "")}&bonus=${bonus}&balance=${balance}#home`;
  return {
    keyboard: [
      [{ text: "🎮 ጌም ይጫወቱ (PLAY)", web_app: { url: playUrl } }],
      [{ text: "👤 ፕሮፋይል" }, { text: "💰 ሂሳብ" }],
      [{ text: "📥 ገቢ (Deposit)" }, { text: "📤 ወጪ (Withdraw)" }],
      [{ text: "🔗 ጋብዝ & አግኝ" }, { text: "🗣 ድርጅቱን አስተዋውቅ" }],
      [{ text: "📖 መመሪያ" }, { text: "🆘 እርዳታ" }, { text: "📜 ደንቦች" }],
      [{ text: "🌐 ቋንቋ (Language)" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

let dbClient = null;
let db = null;

async function getDatabase() {
  if (db) return db;
  try {
    dbClient = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    await dbClient.connect();
    db = dbClient.db("phoenix_bingo");
    console.log("🍃 MongoDB Atlas connected successfully!");
    return db;
  } catch (err) {
    console.error("MongoDB Error:", err.message);
    return null;
  }
}

// አጭር የይለፍ ቃል ማመንጫ (6 ፊደላት)
function generatePassword() {
  return Math.random().toString(36).substring(2, 8);
}

// ተጠቃሚን በ MongoDB መመዝገብ
async function getOrCreateUser(userId, userName, username) {
  const database = await getDatabase();
  if (!database) {
    return {
      userId: String(userId),
      name: userName || "ተጫዋች",
      phone: "",
      balance: 0.00,
      bonus: ADMIN_CONFIG.initialPlayBonus,
      totalWon: 0.00,
      password: generatePassword(),
    };
  }
  const usersCollection = database.collection("users");
  
  let user = await usersCollection.findOne({ userId: String(userId) });
  if (!user) {
    const password = generatePassword();
    user = {
      userId: String(userId),
      name: userName || "ተጫዋች",
      username: username ? "@" + username : "",
      phone: "",
      password: password,
      balance: 0.00, // ዋና ሂሳብ: 0.00 ETB
      bonus: ADMIN_CONFIG.initialPlayBonus, // መጫወቻ ሂሳብ: 15.00 ETB
      totalWon: 0.00,
      createdAt: new Date(),
      lastSeen: new Date(),
      status: "active",
    };
    await usersCollection.insertOne(user);
    console.log("👤 New user registered: " + userName + " with 15 ETB play bonus!");
  } else {
    if (!user.password) {
      const password = generatePassword();
      await usersCollection.updateOne({ userId: String(userId) }, { $set: { password: password } });
      user.password = password;
    }
    await usersCollection.updateOne(
      { userId: String(userId) },
      { $set: { lastSeen: new Date(), name: userName || user.name } }
    );
  }
  return user;
}

// ስልክ ቁጥር ማረጋገጥ
async function registerUserPhone(userId, phone) {
  const database = await getDatabase();
  if (!database) return phone;
  const usersCollection = database.collection("users");
  
  let cleanPhone = String(phone).replace(/\s+/g, "");
  if (cleanPhone.startsWith("+251")) cleanPhone = "0" + cleanPhone.substring(4);
  else if (cleanPhone.startsWith("251")) cleanPhone = "0" + cleanPhone.substring(3);
  else if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;

  await usersCollection.updateOne(
    { userId: String(userId) },
    { $set: { phone: cleanPhone, phoneVerifiedAt: new Date() } }
  );
  return cleanPhone;
}

// ቴሌግራም ጥሪ
function telegramRequest(method, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: "api.telegram.org",
      port: 443,
      path: "/bot" + BOT_TOKEN + "/" + method,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ ok: false, error: e.message });
        }
      });
    });

    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.write(payload);
    req.end();
  });
}

// መልእክት መላኪያ
async function sendMessage(chatId, text, replyMarkup) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

// ደረሰኝ ለአድሚን ማስተላለፊያ
async function forwardDepositToAdmin(user, update) {
  const textMsg = update.message.text || "(ደረሰኝ/ስክሪንሾት ነው)";
  const adminNotification = [
    "📥 <b>አዲስ የገንዘብ ገቢ (Deposit) ደረሰኝ!</b>",
    "━━━━━━━━━━━━━━━━━━",
    "👤 <b>ተጫዋች:</b> " + user.name,
    "🆔 <b>የቴሌግራም ID:</b> <code>" + user.userId + "</code>",
    "📱 <b>ስልክ:</b> <code>" + (user.phone || "አልተገኘም") + "</code>",
    "💵 <b>ዋና ሂሳብ:</b> " + (user.balance || 0).toFixed(2) + " ETB",
    "🎁 <b>መጫወቻ ሂሳብ:</b> " + (user.bonus || 0).toFixed(2) + " ETB",
    "━━━━━━━━━━━━━━━━━━",
    "📝 <b>የላከው መልእክት/ደረሰኝ፦</b>",
    textMsg,
  ].join("\n");

  await sendMessage(ADMIN_CONFIG.adminTelegramId, adminNotification);

  if (update.message.photo && update.message.photo.length > 0) {
    const photoId = update.message.photo[update.message.photo.length - 1].file_id;
    await telegramRequest("sendPhoto", {
      chat_id: ADMIN_CONFIG.adminTelegramId,
      photo: photoId,
      caption: "📸 ደረሰኝ ከ " + user.name + " (" + user.userId + ")",
    });
  }

  const confirmUser = [
    "✅ <b>ደረሰኝዎ በቀጥታ ለአድሚን ተላልፏል!</b>",
    "",
    "የሂሳብ ባለሙያዎቻችን በ 2 ደቂቃ ውስጥ አረጋግጠው ዋሌትዎ ላይ ይጨምሩልዎታል።",
    "እናመሰግናለን!"
  ].join("\n");
  await sendMessage(user.userId, confirmUser, getVerifiedKeyboard(user));
}

// ዋናው መልእክት ተቀባይ
async function handleUpdate(update) {
  let chatId, rawText, userName, userId, username;

  if (update.callback_query) {
    chatId = update.callback_query.message.chat.id;
    rawText = update.callback_query.data;
    userName = update.callback_query.from.first_name || "ተጫዋች";
    userId = update.callback_query.from.id;
    username = update.callback_query.from.username;
    telegramRequest("answerCallbackQuery", { callback_query_id: update.callback_query.id });
  } else if (update.message) {
    chatId = update.message.chat.id;
    userName = [update.message.from.first_name, update.message.from.last_name].filter(Boolean).join(" ") || "ተጫዋች";
    userId = update.message.from.id;
    username = update.message.from.username;
    rawText = update.message.text ? update.message.text.trim() : "";
  } else {
    return;
  }

  const user = await getOrCreateUser(userId, userName, username);

  // 1. 📱 ተጠቃሚው ስልክ ቁጥሩን ሲያጋራ
  if (update.message && update.message.contact) {
    const contactPhone = update.message.contact.phone_number;
    const cleanPhone = await registerUserPhone(userId, contactPhone);
    user.phone = cleanPhone;

    const bonus = user.bonus != null ? user.bonus : ADMIN_CONFIG.initialPlayBonus;
    const balance = user.balance != null ? user.balance : 0;
    const playUrl = WEBAPP_URL + "?tgId=" + userId + "&phone=" + encodeURIComponent(cleanPhone) + "&name=" + encodeURIComponent(userName) + "&bonus=" + bonus + "&balance=" + balance;

    const welcomeMsg = [
      "🎉 <b>እንኳን ደስ አሎት " + userName + "! ምዝገባው ተጠናቋል።</b>",
      "",
      "👤 <b>የእርስዎ ፕሮፋይል</b>",
      "",
      "🔹 <b>ስም:</b> " + userName,
      "🔹 <b>ስልክ:</b> <code>" + cleanPhone + "</code>",
      "🔑 <b>የይለፍ ቃል:</b> <code>" + user.password + "</code>",
      "",
      "💰 <b>መጫወቻ ሂሳብ:</b> <b>" + bonus.toFixed(2) + " ETB</b>",
      "💰 <b>ዋና ሂሳብ:</b> <b>" + balance.toFixed(2) + " ETB</b>",
      "",
      "👇 <b>ጌሙን ለመጀመር ከታች '🎮 ጌም ይጫወቱ (PLAY)' የሚለውን ይጫኑ።</b>"
    ].join("\n");

    const singlePlayButton = {
      inline_keyboard: [
        [{ text: "🎮 ጌም ይጫወቱ (PLAY)", web_app: { url: playUrl } }],
      ],
    };

    await sendMessage(chatId, welcomeMsg, singlePlayButton);
    return;
  }

  // 2. 🛑 ስልኩን ያላጋራ ሰው ሌላ ምንም ነገር እንዳያይ መከልከል
  if (!user.phone) {
    const askPhoneMsg = [
      "🇪🇹 <b>እንኳን ወደ ፊኒክስ ቢንጎ በደህና መጡ!</b> 🦅",
      "",
      "ወደ ጨዋታው ለመግባት፣ የ <b>15.00 ETB</b> መጫወቻ ቦነስ ለመውሰድ እና አካውንትዎ ደህንነቱ የተጠበቀ እንዲሆን <b>ስልክ ቁጥርዎን ማጋራት ግዴታ ነው</b>።",
      "",
      "👇 <b>ከታች ያለውን «📱 ስልክ ቁጥርዎን ያጋሩ» የሚለውን ቁልፍ ይጫኑ፦</b>"
    ].join("\n");

    await sendMessage(chatId, askPhoneMsg, CONTACT_KEYBOARD);
    return;
  }

  // 3. 📥 ደረሰኝ ወይም SMS ማስተላለፊያ
  if (update.message && (update.message.photo || (rawText && (rawText.toLowerCase().includes("trans") || rawText.toLowerCase().includes("telebirr") || rawText.toLowerCase().includes("cbe") || rawText.length > 20)))) {
    if (!rawText.startsWith("/")) {
      await forwardDepositToAdmin(user, update);
      return;
    }
  }

  const text = rawText.toLowerCase();

  // 4. 🎮 ጌም ይጫወቱ (ስልካቸውን ላረጋገጡ ብቻ — "በብሮውዘር ክፈት" የሌለበት!)
  if (text === "/play" || text === "/start" || text.includes("play") || text.includes("ጌም")) {
    const bonus = user.bonus != null ? user.bonus : ADMIN_CONFIG.initialPlayBonus;
    const balance = user.balance != null ? user.balance : 0;
    const playUrl = WEBAPP_URL + "?tgId=" + userId + "&phone=" + encodeURIComponent(user.phone) + "&name=" + encodeURIComponent(userName) + "&bonus=" + bonus + "&balance=" + balance;

    const msg = [
      "🇪🇹 <b>እንኳን ወደ ፊኒክስ ቢንጎ በደህና መጡ፣ " + userName + "!</b> 🎮",
      "",
      "📱 <b>ስልክ:</b> <code>" + user.phone + "</code>",
      "💰 <b>መጫወቻ ሂሳብ:</b> <b>" + bonus.toFixed(2) + " ETB</b>",
      "💰 <b>ዋና ሂሳብ:</b> <b>" + balance.toFixed(2) + " ETB</b>",
      "",
      "👇 <b>ከታች ያለውን ሰማያዊ ቁልፍ ተጭነው ጨዋታውን ይክፈቱ፦</b>"
    ].join("\n");

    const singlePlayInline = {
      inline_keyboard: [
        [{ text: "🎮 ጌም ይጫወቱ (PLAY)", web_app: { url: playUrl } }],
      ],
    };

    await sendMessage(chatId, msg, singlePlayInline);
    return;
  }

  // 5. 💰 ሒሳብ ማረጋገጫ
  if (text === "/account" || text.includes("account") || text.includes("ሂሳብ") || text.includes("ሒሳብ")) {
    const balanceStr = (user.balance || 0).toFixed(2);
    const bonusStr = (user.bonus != null ? user.bonus : ADMIN_CONFIG.initialPlayBonus).toFixed(2);
    const wonStr = (user.totalWon || 0).toFixed(2);

    const msg = [
      "💰 <b>የሒሳብ ማረጋገጫ (Wallet Balance)</b>",
      "",
      "👤 <b>ተጫዋች:</b> " + userName,
      "🆔 <b>የቴሌግራም ID:</b> <code>" + userId + "</code>",
      "📱 <b>የተመዘገበው ስልክ:</b> <code>" + user.phone + "</code>",
      "🔑 <b>የይለፍ ቃል:</b> <code>" + (user.password || "******") + "</code>",
      "",
      "💰 <b>መጫወቻ ሂሳብ (Play Wallet):</b> <b>" + bonusStr + " ETB</b>",
      "💰 <b>ዋና ሂሳብ (Main Cash Wallet):</b> <b>" + balanceStr + " ETB</b>",
      "🏆 <b>ያሸነፉት ጠቅላላ:</b> <b>" + wonStr + " ETB</b>",
      "",
      "<i>ገንዘብ ገቢ ለማድረግ ከታች «📥 ገቢ ማድረግ» የሚለውን ይጫኑ።</i>"
    ].join("\n");

    const inlineBal = {
      inline_keyboard: [
        [
          { text: "📥 ገቢ ማድረግ", callback_data: "/deposit" },
          { text: "📤 ወጪ ማድረግ", callback_data: "/withdraw" },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineBal);
    return;
  }

  // 6. 📥 ገቢ ማድረግ
  if (text === "/deposit" || text.includes("deposit") || text.includes("ገቢ")) {
    const msg = [
      "📥 <b>ገንዘብ ወደ አካውንትዎ ገቢ ማድረጊያ መመሪያ</b>",
      "",
      "📱 <b>ቴሌብር (Telebirr):</b>",
      "ቁጥር: <code>" + ADMIN_CONFIG.telebirrNumber + "</code>",
      "",
      "🏦 <b>የኢትዮጵያ ንግድ ባንክ (CBE):</b>",
      "የሂሳብ ቁጥር: <code>" + ADMIN_CONFIG.cbeAccount + "</code>",
      "",
      "⚠️ <b>ማሳሰቢያ፦</b>",
      "ገንዘቡን ካስተላለፉ በኋላ የደረሰኝ ስክሪንሾት ወይም የቴሌብር SMS መልእክቱን <b>እዚሁ ቦት ላይ ይላኩት!</b>",
      "ቦቱ በቀጥታ ለአድሚን አስተላልፎ በ 2 ደቂቃ ውስጥ ዋና ሂሳብዎ ላይ ይሞላልዎታል!"
    ].join("\n");

    await sendMessage(chatId, msg, getVerifiedKeyboard(user));
    return;
  }

  // 7. 📤 ወጪ ማድረግ (Locked to Phone)
  if (text === "/withdraw" || text.includes("withdraw") || text.includes("ወጪ")) {
    const balanceStr = (user.balance || 0).toFixed(2);
    const msg = [
      "📤 <b>ያሸነፉትን ገንዘብ ወጪ ማድረጊያ</b>",
      "",
      "• <b>ዋና ሂሳብ (ሊወጣ የሚችል):</b> <b>" + balanceStr + " ETB</b>",
      "• <b>ዝቅተኛ የወጪ መጠን:</b> " + ADMIN_CONFIG.minWithdraw + " ETB",
      "• <b>የሚከፈልበት ስልክ ቁጥር:</b> <code>" + user.phone + "</code> (የተቆለፈ)",
      "• <b>የክፍያ ጊዜ:</b> ከ 5 እስከ 15 ደቂቃዎች ውስጥ",
      "",
      "🔒 <b>ማሳሰቢያ፦</b> ወጪ የሚደረገው ከተጫወቱ በኋላ ያሸነፉት ወይም ያስገቡት <b>ዋና ሂሳብ</b> ብቻ ነው።",
      "ወጪ ለማድረግ ለአድሚን <b>" + ADMIN_CONFIG.supportUsername + "</b> ይላኩ።"
    ].join("\n");

    const inlineWith = {
      inline_keyboard: [
        [{ text: "📤 ወጪ ለማዘዝ አድሚንን ያነጋግሩ", url: "https://t.me/" + ADMIN_CONFIG.supportUsername.replace("@", "") }],
      ],
    };

    await sendMessage(chatId, msg, inlineWith);
    return;
  }

  // 8. 👤 ፕሮፋይል
  if (text.includes("ፕሮፋይል")) {
    const msg = [
      "👤 <b>የተጠቃሚ ፕሮፋይል (Profile)</b>",
      "",
      "• <b>ስም:</b> " + userName,
      "• <b>የቴሌግራም ID:</b> <code>" + userId + "</code>",
      "• <b>ስልክ:</b> <code>" + user.phone + "</code> ✅",
      "• <b>የይለፍ ቃል:</b> <code>" + (user.password || "******") + "</code>",
      "• <b>የአካውንት ደረጃ:</b> ቪአይፒ (VIP Player) ⭐"
    ].join("\n");
    await sendMessage(chatId, msg, getVerifiedKeyboard(user));
    return;
  }

  // 9. 🔗 ጋብዝ & አግኝ
  if (text === "/referral" || text.includes("referral") || text.includes("ጋብዝ") || text.includes("ጓደኛ")) {
    const refLink = "https://t.me/Phoenix_Bingo_Bot?start=ref_" + userId;
    const msg = [
      "🤝 <b>ጓደኛዎን ይጋብዙ — ነፃ ቦነስ ያግኙ!</b>",
      "",
      "ለእያንዳንዱ በእርስዎ ሊንክ ስልኩን አረጋግጦ ለሚመዘገብ ጓደኛ ነፃ ቦነስ ያገኛሉ!",
      "",
      "🔗 <b>የእርስዎ መጋበዣ ሊንክ፦</b>",
      "<code>" + refLink + "</code>"
    ].join("\n");

    const inlineShare = {
      inline_keyboard: [
        [{ text: "📤 ሊንኩን ለጓደኛ አጋራ (Share)", url: "https://t.me/share/url?url=" + encodeURIComponent(refLink) + "&text=" + encodeURIComponent("🔥 ና እዚህ ፈጣን የቀጥታ ካርቴላ ቢንጎ እንጫወት! 15 ETB መጫወቻ ቦነስ ተቀበል!") }],
      ],
    };

    await sendMessage(chatId, msg, inlineShare);
    return;
  }

  // 10. 📖 መመሪያ
  if (text.includes("መመሪያ")) {
    const msg = [
      "📖 <b>የካርቴላ ቢንጎ አጨዋወት መመሪያ</b>",
      "",
      "1. <b>ካርቴላ ይምረጡ፦</b> ከመጫወቻ ሂሳብዎ ወይም ከዋና ሂሳብዎ ካርቴላ ይግዙ።",
      "2. <b>ቁጥሮችን ይከታተሉ፦</b> የሚወጡትን እጣ ቁጥሮች በካርቴላዎ ላይ ያመሳክሩ።",
      "3. <b>ቢንጎ ይበሉ፦</b> መስመር ሲሞላ «BINGO» የሚለውን ተጭነው ያሸንፉ!"
    ].join("\n");
    await sendMessage(chatId, msg, getVerifiedKeyboard(user));
    return;
  }

  // 11. 🆘 እርዳታ
  if (text === "/help" || text.includes("help") || text.includes("እርዳታ") || text.includes("ድጋፍ")) {
    const msg = "🆘 <b>የደንበኞች ድጋፍ እና እርዳታ</b>\n\nማንኛውም ጥያቄ ካለዎት አድሚናችንን ያነጋግሩ፦\n👉 <b>" + ADMIN_CONFIG.supportUsername + "</b>";
    await sendMessage(chatId, msg, getVerifiedKeyboard(user));
    return;
  }

  // 12. 📜 ደንቦች
  if (text.includes("ደንብ")) {
    const msg = [
      "📜 <b>የፕላትፎርሙ ደንቦች</b>",
      "",
      "1. እድሜያቸው ከ 18 ዓመት በላይ ለሆኑ ብቻ የተፈቀደ ነው።",
      "2. ሁሉም ተጫዋች በተመዘገበበት ስልክ ቁጥር ብቻ ነው ወጪ የሚከፈለው።",
      "3. የሀሰት ደረሰኝ ማቅረብ ከአካውንት ያግዳል!"
    ].join("\n");
    await sendMessage(chatId, msg, getVerifiedKeyboard(user));
    return;
  }

  // 13. 🌐 ቋንቋ
  if (text.includes("ቋንቋ")) {
    await sendMessage(chatId, "🇪🇹 <b>የአሁኑ ቋንቋ፦</b> አማርኛ (Amharic)", getVerifiedKeyboard(user));
    return;
  }

  // 14. 🗣 ድርጅቱን አስተዋውቅ
  if (text.includes("አስተዋውቅ")) {
    const msg = "🦅 <b>ስለ ፊኒክስ ቢንጎ (About Phoenix Bingo)</b>\n\nፊኒክስ ቢንጎ በኢትዮጵያ ውስጥ ፈጣን፣ አስተማማኝ እና ፍትሃዊ የቀጥታ የካርቴላ ቢንጎ ጨዋታ መድረክ ነው።\n• 24/7 ፈጣን የቴሌብር እና የባንክ ክፍያዎች";
    await sendMessage(chatId, msg, getVerifiedKeyboard(user));
    return;
  }

  await sendMessage(chatId, "ሰላም " + userName + "፣ ከታች ያሉትን አማራጮች በመጠቀም ይምረጡ፦", getVerifiedKeyboard(user));
}

let offset = 0;
async function pollUpdates() {
  console.log("🚀 Phoenix Bingo Bot: Single Poller Active with 15 ETB Bonus!");
  await getDatabase();

  while (true) {
    try {
      const data = await telegramRequest("getUpdates", { offset: offset, timeout: 30 });
      if (data && data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await handleUpdate(update);
        }
      }
    } catch (err) {
      console.error("Polling error:", err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

pollUpdates();
