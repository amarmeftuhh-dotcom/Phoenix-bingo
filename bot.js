/**
 * Phoenix Bingo - True Real-Time Online Multiplayer Bingo Telegram Bot Server
 * 
 * Features:
 * 1. 550 Bingo Cartelas with Real-Time Multi-Client Locking & Availability
 * 2. Instant Server-Authoritative Synchronization across Telegram Clients (Phone, Desktop, Web)
 * 3. Card Release / Unselect with Instant 10 ETB Refund & Real-Time Broadcast
 * 4. Server-Side Atomic Ownership (ONE GAME + ONE CARTELA = ONE PLAYER, Race-Condition Proof)
 * 5. Complete Card Status Lifecycle (AVAILABLE, SELECTED, PLAYING, COMPLETED)
 * 6. Secure Personal Player History (/history, strictly authenticated, private)
 * 7. Persistent History Database (MongoDB Atlas & Supabase compatible)
 * 8. Real-Time Online Player Presence Counter
 * 9. Real-Time Telegram Game Engine (45s Lobby, 20 Balls Calling, Victory & Jackpot)
 * 10. Dedicated Wallet & Balance Menu (/wallet, deposits, withdrawals)
 * 11. Admin / Finance Section (/admin, overall logs, deposit/withdrawal approval)
 * 12. HTTP / SSE Health-Check & Room-Sync Server for WebApp compatibility
 */

import https from "node:https";
import http from "node:http";
import crypto from "node:crypto";
import { MongoClient } from "mongodb";

// ==========================================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================================
const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN || "8606075616:AAFmq_dQ_eCRDzEqnw5N2Ybc9_dkOS5BiDg";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://phoenix-bingo.onrender.com/#home";
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://Phoenix:761724@cluster0.pivq9lg.mongodb.net/phoenix_bingo?retryWrites=true&w=majority";

const TOTAL_CARTELAS = 550;
const CARDS_PER_PAGE = 20;
const TOTAL_PAGES = Math.ceil(TOTAL_CARTELAS / CARDS_PER_PAGE); // 28 pages
const CARD_PRICE = 10.0; // 10 ETB per cartela
const MAX_CARDS_PER_PLAYER = 4; // Max 4 cartelas per round

const LOBBY_MS = 45000;
const CALLING_MS = 50000;
const VICTORY_MS = 4000;
const ROUND_DURATION_MS = LOBBY_MS + CALLING_MS + VICTORY_MS;
const BALL_INTERVAL_MS = 2500;

const ADMIN_CONFIG = {
  adminTelegramId: 389547943,
  supportUsername: "@Phonix_s",
  telebirrNumber: "+251956998368",
  cbeAccount: "+251956998368",
  minWithdraw: 50,
  initialPlayBonus: 15.00,
};

// ==========================================================
// 2. DETERMINISTIC BINGO ENGINE
// ==========================================================
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

function getBallLetter(num) {
  if (num <= 15) return "B";
  if (num <= 30) return "I";
  if (num <= 45) return "N";
  if (num <= 60) return "G";
  return "O";
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

// Monospace ASCII Cartela Grid representation for Telegram
function formatCartelaBoard(cardNumber, drawnBalls = []) {
  const cells = generateBoard(cardNumber);
  const drawnSet = new Set(drawnBalls);

  let text = `╔═══════════════════════════╗\n`;
  text += `║    🦅 <b>PHOENIX BINGO</b> 🦅   ║\n`;
  text += `║       <b>ካርቴላ ቁጥር: #${cardNumber}</b>       ║\n`;
  text += `╠═════╤═════╤═════╤═════╤═════╣\n`;
  text += `║  <b>B</b>  │  <b>I</b>  │  <b>N</b>  │  <b>G</b>  │  <b>O</b>  ║\n`;
  text += `╠═════╪═════╪═════╪═════╪═════╣\n`;

  let matchedCount = 0;
  for (let r = 0; r < 5; r++) {
    text += `║`;
    for (let c = 0; c < 5; c++) {
      const cell = cells.find((cl) => cl.row === r && cl.col === c);
      if (!cell || cell.value === "FREE") {
        text += ` ★FR │`;
      } else {
        const val = cell.value;
        const isMatched = drawnSet.has(val);
        if (isMatched) matchedCount++;
        const str = String(val).padStart(2, "0");
        text += isMatched ? `[${str}]│` : ` ${str}  │`;
      }
    }
    text = text.slice(0, -1) + `║\n`;
    if (r < 4) {
      text += `╟─────┼─────┼─────┼─────┼─────╢\n`;
    }
  }
  text += `╚═════╧═════╧═════╧═════╧═════╝`;

  return { text, matchedCount };
}

// ==========================================================
// 3. DATABASE CLIENT & COLLECTIONS
// ==========================================================
let dbClient = null;
let db = null;

async function getDatabase() {
  if (db) return db;
  try {
    dbClient = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    await dbClient.connect();
    db = dbClient.db("phoenix_bingo");
    console.log("🍃 MongoDB Atlas connected successfully!");

    // Ensure Indexes
    try {
      await db.collection("users").createIndex({ userId: 1 }, { unique: true });
      await db.collection("player_history").createIndex({ userId: 1, createdAt: -1 });
      await db.collection("player_history").createIndex({ gameId: 1 });
      await db.collection("player_history").createIndex({ eventType: 1 });
      await db.collection("reservations").createIndex({ gameId: 1, cardNumber: 1 }, { unique: true });
    } catch (idxErr) {
      console.warn("Index check note:", idxErr.message);
    }

    return db;
  } catch (err) {
    console.error("MongoDB Connection Warning:", err.message);
    return null;
  }
}

function generatePassword() {
  return Math.random().toString(36).substring(2, 8);
}

// In-Memory Fallbacks for zero-downtime reliability
const memoryUsers = new Map();
const memoryHistory = [];

async function getOrCreateUser(userId, userName, username) {
  const uid = String(userId);
  const database = await getDatabase();

  if (!database) {
    let user = memoryUsers.get(uid);
    if (!user) {
      user = {
        userId: uid,
        name: userName || "ተጫዋች",
        username: username ? "@" + username : "",
        phone: "",
        balance: 0.00,
        bonus: ADMIN_CONFIG.initialPlayBonus,
        totalWon: 0.00,
        password: generatePassword(),
        createdAt: new Date(),
        lastSeen: new Date(),
        status: "active",
      };
      memoryUsers.set(uid, user);
    } else {
      user.lastSeen = new Date();
      if (userName) user.name = userName;
    }
    return user;
  }

  const usersCollection = database.collection("users");
  let user = await usersCollection.findOne({ userId: uid });

  if (!user) {
    const password = generatePassword();
    user = {
      userId: uid,
      name: userName || "ተጫዋች",
      username: username ? "@" + username : "",
      phone: "",
      password: password,
      balance: 0.00,
      bonus: ADMIN_CONFIG.initialPlayBonus,
      totalWon: 0.00,
      createdAt: new Date(),
      lastSeen: new Date(),
      status: "active",
    };
    await usersCollection.insertOne(user);
    console.log(`👤 New user registered: ${userName} (${uid}) with 15 ETB play bonus!`);
    
    // Log bonus credit in player history
    await logPlayerHistory({
      userId: uid,
      userName: user.name,
      eventType: "DEPOSIT",
      amount: ADMIN_CONFIG.initialPlayBonus,
      paymentMethod: "Sign-up Bonus",
      status: "approved",
      description: "የመመዝገቢያ 15 ETB ነፃ መጫወቻ ቦነስ",
    });
  } else {
    if (!user.password) {
      const password = generatePassword();
      await usersCollection.updateOne({ userId: uid }, { $set: { password } });
      user.password = password;
    }
    await usersCollection.updateOne(
      { userId: uid },
      { $set: { lastSeen: new Date(), name: userName || user.name } }
    );
  }
  return user;
}

async function registerUserPhone(userId, phone) {
  const uid = String(userId);
  let cleanPhone = String(phone).replace(/\s+/g, "");
  if (cleanPhone.startsWith("+251")) cleanPhone = "0" + cleanPhone.substring(4);
  else if (cleanPhone.startsWith("251")) cleanPhone = "0" + cleanPhone.substring(3);
  else if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;

  const database = await getDatabase();
  if (database) {
    await database.collection("users").updateOne(
      { userId: uid },
      { $set: { phone: cleanPhone, phoneVerifiedAt: new Date() } }
    );
  } else {
    const memUser = memoryUsers.get(uid);
    if (memUser) memUser.phone = cleanPhone;
  }
  return cleanPhone;
}

// Atomic Balance Adjustment with Authoritative Logging
async function adjustUserBalance(userId, changeMain = 0, changeBonus = 0, eventType = null, desc = "", meta = {}) {
  const uid = String(userId);
  const database = await getDatabase();

  let updatedUser = null;
  if (database) {
    const res = await database.collection("users").findOneAndUpdate(
      { userId: uid },
      {
        $inc: { balance: changeMain, bonus: changeBonus },
        $set: { lastSeen: new Date() },
      },
      { returnDocument: "after" }
    );
    updatedUser = res ? res.value || res : null;
  } else {
    const mem = memoryUsers.get(uid);
    if (mem) {
      mem.balance = Math.max(0, (mem.balance || 0) + changeMain);
      mem.bonus = Math.max(0, (mem.bonus || 0) + changeBonus);
      updatedUser = mem;
    }
  }

  if (eventType && updatedUser) {
    const totalAmount = Math.abs(changeMain) + Math.abs(changeBonus);
    await logPlayerHistory({
      userId: uid,
      userName: updatedUser.name || "ተጫዋች",
      eventType,
      amount: totalAmount,
      gameId: meta.gameId,
      cardNumber: meta.cardNumber,
      paymentMethod: meta.paymentMethod || "Wallet",
      status: meta.status || "completed",
      description: desc,
    });
  }

  return updatedUser;
}

// ==========================================================
// 4. PLAYER HISTORY SERVICE
// ==========================================================
async function logPlayerHistory(entry) {
  const record = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: String(entry.userId),
    userName: entry.userName || "ተጫዋች",
    gameId: entry.gameId != null ? Number(entry.gameId) : null,
    eventType: entry.eventType, // CARD_SELECTED, CARD_RELEASED, GAME_JOINED, GAME_COMPLETED, DEPOSIT, WITHDRAWAL_REQUESTED, WITHDRAWAL_APPROVED, PRIZE_WON, REFUND
    cardNumber: entry.cardNumber != null ? Number(entry.cardNumber) : null,
    amount: entry.amount != null ? Number(entry.amount) : 0,
    paymentMethod: entry.paymentMethod || null,
    status: entry.status || "completed",
    description: entry.description || "",
    createdAt: new Date(),
  };

  const database = await getDatabase();
  if (database) {
    try {
      await database.collection("player_history").insertOne(record);
    } catch (err) {
      console.warn("Failed to insert history to Mongo:", err.message);
      memoryHistory.unshift(record);
    }
  } else {
    memoryHistory.unshift(record);
    if (memoryHistory.length > 500) memoryHistory.pop();
  }

  return record;
}

// STRICT PRIVACY: Returns ONLY the authenticated player's personal history
async function getPlayerPersonalHistory(userId, filterType = "all", limit = 10, page = 1) {
  const uid = String(userId);
  const skip = (page - 1) * limit;

  const query = { userId: uid };
  if (filterType === "games") {
    query.eventType = { $in: ["GAME_JOINED", "GAME_COMPLETED", "PRIZE_WON"] };
  } else if (filterType === "cards") {
    query.eventType = { $in: ["CARD_SELECTED", "CARD_RELEASED"] };
  } else if (filterType === "wallet") {
    query.eventType = { $in: ["DEPOSIT", "WITHDRAWAL_REQUESTED", "WITHDRAWAL_APPROVED", "WITHDRAWAL_REJECTED", "REFUND", "PRIZE_WON"] };
  }

  const database = await getDatabase();
  if (database) {
    try {
      const items = await database
        .collection("player_history")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      const total = await database.collection("player_history").countDocuments(query);
      return { items, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
    } catch (err) {
      console.warn("History query error:", err.message);
    }
  }

  // Fallback to memory
  const filtered = memoryHistory.filter((item) => {
    if (item.userId !== uid) return false;
    if (filterType === "games") return ["GAME_JOINED", "GAME_COMPLETED", "PRIZE_WON"].includes(item.eventType);
    if (filterType === "cards") return ["CARD_SELECTED", "CARD_RELEASED"].includes(item.eventType);
    if (filterType === "wallet") return ["DEPOSIT", "WITHDRAWAL_REQUESTED", "WITHDRAWAL_APPROVED", "WITHDRAWAL_REJECTED", "REFUND", "PRIZE_WON"].includes(item.eventType);
    return true;
  });

  const items = filtered.slice(skip, skip + limit);
  return { items, total: filtered.length, page, totalPages: Math.max(1, Math.ceil(filtered.length / limit)) };
}

// ADMIN OVERALL HISTORY: Restricted by verified admin role
async function getAdminOverallHistory(limit = 15, page = 1) {
  const skip = (page - 1) * limit;
  const database = await getDatabase();
  if (database) {
    try {
      const items = await database
        .collection("player_history")
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      const total = await database.collection("player_history").countDocuments({});
      return { items, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
    } catch (err) {
      console.warn("Admin history error:", err.message);
    }
  }
  const items = memoryHistory.slice(skip, skip + limit);
  return { items, total: memoryHistory.length, page, totalPages: Math.max(1, Math.ceil(memoryHistory.length / limit)) };
}

// Format single history item cleanly with Ethiopian date/time
function formatHistoryEntry(item) {
  const d = new Date(item.createdAt);
  const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

  let icon = "🔹";
  let title = item.eventType;
  let detail = item.description || "";

  switch (item.eventType) {
    case "CARD_SELECTED":
      icon = "🎟";
      title = `Card Selected (ካርቴላ #${item.cardNumber || "-"})`;
      detail = `Game #${item.gameId || "-"}`;
      break;
    case "CARD_RELEASED":
      icon = "🔄";
      title = `Card Released (ካርቴላ #${item.cardNumber || "-"})`;
      detail = `Game #${item.gameId || "-"}`;
      break;
    case "GAME_JOINED":
      icon = "🎮";
      title = `Game Joined`;
      detail = `Game #${item.gameId || "-"} | Card #${item.cardNumber || "-"}`;
      break;
    case "GAME_COMPLETED":
      icon = "🏁";
      title = `Game Completed`;
      detail = `Game #${item.gameId || "-"} | ${item.description || "Finished"}`;
      break;
    case "PRIZE_WON":
      icon = "🏆";
      title = `Prize Won (+${(item.amount || 0).toFixed(2)} ETB)`;
      detail = `Game #${item.gameId || "-"}`;
      break;
    case "DEPOSIT":
      icon = "📥";
      title = `Deposit (+${(item.amount || 0).toFixed(2)} ETB)`;
      detail = `${item.paymentMethod || "Telebirr"} | [${item.status}]`;
      break;
    case "WITHDRAWAL_REQUESTED":
      icon = "📤";
      title = `Withdrawal (-${(item.amount || 0).toFixed(2)} ETB)`;
      detail = `${item.paymentMethod || "CBE"} | [${item.status}]`;
      break;
    case "WITHDRAWAL_APPROVED":
      icon = "✅";
      title = `Withdrawal Paid (${(item.amount || 0).toFixed(2)} ETB)`;
      detail = `Transferred via ${item.paymentMethod || "Bank"}`;
      break;
    case "REFUND":
      icon = "💰";
      title = `Refund (+${(item.amount || 0).toFixed(2)} ETB)`;
      detail = `ካርቴላ #${item.cardNumber || "-"} ተመላሽ`;
      break;
    default:
      icon = "📋";
      title = item.eventType;
  }

  return `${icon} <b>${title}</b>\n   ├ ${detail}\n   └ <i>${dateStr} ${timeStr}</i>`;
}

// ==========================================================
// 5. REAL-TIME ONLINE PRESENCE & ACTIVE TELEGRAM SESSIONS
// ==========================================================
// Map of userId -> { chatId, messageId, view, page, lastActive, cardNumber }
const activeTelegramSessions = new Map();

function trackTelegramUser(userId, chatId, view = "lobby", page = 1, messageId = null) {
  const uid = String(userId);
  const now = Date.now();
  const existing = activeTelegramSessions.get(uid) || {};

  activeTelegramSessions.set(uid, {
    ...existing,
    userId: uid,
    chatId: chatId || existing.chatId,
    messageId: messageId != null ? messageId : existing.messageId,
    view: view || existing.view || "lobby",
    page: page || existing.page || 1,
    lastActive: now,
  });
}

function getOnlinePresenceStats() {
  const now = Date.now();
  const cutoff = now - 5 * 60 * 1000; // active in last 5 minutes
  let onlineCount = 0;
  let inGameCount = 0;

  for (const session of activeTelegramSessions.values()) {
    if (session.lastActive >= cutoff) {
      onlineCount++;
      if (session.view === "in_game" || session.view === "card_view") {
        inGameCount++;
      }
    }
  }

  // Base real count: at least 1 if anyone is connected, formatted cleanly
  return {
    onlinePlayers: Math.max(1, onlineCount),
    inGamePlayers: inGameCount,
  };
}

// ==========================================================
// 6. MASTER ROOM STATE & ATOMIC CARD CONCURRENCY ENGINE
// ==========================================================
const botRoundsMap = new Map();
let customLobbyMs = LOBBY_MS;
let currentRoundId = Math.floor(Date.now() / ROUND_DURATION_MS);
let forceGameStartAt = null;
let roundOffset = 0;
const sseClients = new Set();

function getOrCreateBotRound(roundId) {
  let roundData = botRoundsMap.get(roundId);
  if (!roundData) {
    roundData = {
      tickets: new Map(), // cardNumber -> { userId, userName, userPhone, time, status }
      firstTicketAt: null,
      forcedStartAt: null,
      evaluatedWinner: null,
      prizeDistributed: false,
    };
    botRoundsMap.set(roundId, roundData);
  }
  // Prune older rounds beyond 15
  if (botRoundsMap.size > 15) {
    for (const rId of botRoundsMap.keys()) {
      if (rId < roundId - 5) botRoundsMap.delete(rId);
    }
  }
  return roundData;
}

function getMasterRoomState() {
  const now = Date.now();
  const epochRoundId = Math.floor(now / ROUND_DURATION_MS) + roundOffset;
  const elapsedInRound = now % ROUND_DURATION_MS;
  currentRoundId = epochRoundId;
  const roundData = getOrCreateBotRound(epochRoundId);
  const allTaken = Array.from(roundData.tickets.keys());

  // 1. IF NO TICKETS ARE TAKEN:
  // Game never plays empty rounds, keeps ticking down in lobby
  if (allTaken.length === 0) {
    const remainingSeconds = Math.max(1, Math.ceil((customLobbyMs - (now % customLobbyMs)) / 1000));
    return {
      success: true,
      serverTime: now,
      roundId: epochRoundId,
      phase: "lobby",
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

  // 2. TICKETS ARE TAKEN: Synchronized timeline
  const balls = getDeterministicBalls(epochRoundId);
  let phase = "lobby";
  let countdown = 0;
  let drawnBalls = [];

  if (elapsedInRound < customLobbyMs && !roundData.forcedStartAt) {
    phase = "lobby";
    countdown = Math.max(0, Math.ceil((customLobbyMs - elapsedInRound) / 1000));
    drawnBalls = [];
  } else if (elapsedInRound < customLobbyMs + CALLING_MS) {
    phase = "game";
    countdown = 0;
    const gameElapsed = elapsedInRound - customLobbyMs;
    const count = Math.min(20, Math.floor(gameElapsed / BALL_INTERVAL_MS) + 1);
    drawnBalls = balls.slice(0, count).reverse();
  } else {
    phase = "victory";
    countdown = Math.max(0, Math.ceil((ROUND_DURATION_MS - elapsedInRound) / 1000));
    drawnBalls = balls.slice(0, 20).reverse();
  }

  const currentBall = drawnBalls[0] || null;
  const details = {};
  const uniqueUsers = new Set();

  for (const [tNum, info] of roundData.tickets.entries()) {
    details[tNum] = { userId: info.userId, userName: info.userName, userPhone: info.userPhone };
    uniqueUsers.add(info.userId);
  }

  // Winner evaluation
  if (!roundData.evaluatedWinner) {
    roundData.evaluatedWinner = evaluateWinner(allTaken, balls);
  }
  const { winningTicket, winningBallCount } = roundData.evaluatedWinner;
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

  // Distribute prize once in victory phase
  if (phase === "victory" && !roundData.prizeDistributed && winnerInfo && winnerInfo.userId) {
    roundData.prizeDistributed = true;
    (async () => {
      try {
        console.log(`🏆 Round #${epochRoundId} WINNER: ${winnerInfo.name} (${winnerInfo.userId}) won ${jackpot} ETB on ticket #${winningTicket}!`);
        await adjustUserBalance(winnerInfo.userId, jackpot, 0, "PRIZE_WON", `ቢንጎ ጃክፖት ሽልማት - ዙር #${epochRoundId}`, {
          gameId: epochRoundId,
          cardNumber: winningTicket,
          paymentMethod: "Game Jackpot",
        });

        // Notify winner and participants in Telegram
        for (const session of activeTelegramSessions.values()) {
          if (session.chatId) {
            const isWinner = session.userId === String(winnerInfo.userId);
            const winMsg = [
              "🏆 <b>ቢንጎ! አሸናፊ ተገኝቷል! (BINGO WINNER!)</b> 🦅",
              "━━━━━━━━━━━━━━━━━━━━",
              `🎉 <b>አሸናፊ ተጫዋች:</b> ${winnerInfo.name}`,
              `🎟 <b>አሸናፊ ካርቴላ:</b> <b>#${winningTicket}</b>`,
              `💰 <b>የተገኘው ጃክፖት:</b> <b>+${jackpot.toFixed(2)} ETB</b>`,
              `🎯 <b>የተጠሩ እጣዎች:</b> ${winningBallCount || 20} እጣዎች`,
              "━━━━━━━━━━━━━━━━━━━━",
              isWinner
                ? "🌟 <b>እንኳን ደስ አሎት! ሽልማቱ በቀጥታ ወደ ዋና ሂሳብዎ ገቢ ሆኗል!</b>"
                : "👏 <i>ለቀጣዩ ዙር ካርቴላ በመምረጥ ይሳተፉ!</i>",
            ].join("\n");

            const winKeyboard = {
              inline_keyboard: [
                [{ text: "🎮 አዲስ ዙር ጀምር (Next Game)", callback_data: "cmd_lobby" }],
                [{ text: "🎟 ካርቴላ ምረጥ (Select Cartela)", callback_data: "cmd_cards" }],
              ],
            };

            await sendMessage(session.chatId, winMsg, winKeyboard);
          }
        }
      } catch (err) {
        console.error("Victory prize distribution error:", err.message);
      }
    })();
  }

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
    jackpot,
    takenTickets: allTaken,
    takenDetails: details,
    winnerInfo,
    playersCount: uniqueUsers.size,
    lobbyDuration: customLobbyMs,
  };
}

// ATOMIC SERVER-SIDE CARD RESERVATION
// Enforces: GAME + CARD = ONE CURRENT PLAYER
// Race-condition proof: single-threaded event loop check-and-set + balance deduction
async function atomicReserveCard(roundId, cardNumber, user) {
  const cardNum = parseInt(cardNumber, 10);
  if (isNaN(cardNum) || cardNum < 1 || cardNum > TOTAL_CARTELAS) {
    return { success: false, error: "INVALID_CARD", message: `ካርቴላ ቁጥር ከ 1 እስከ ${TOTAL_CARTELAS} መሆን አለበት።` };
  }

  const state = getMasterRoomState();
  if (state.phase !== "lobby") {
    return { success: false, error: "GAME_ALREADY_STARTED", message: "ይቅርታ! ጨዋታው ተጀምሯል። እባክዎ የሚቀጥለውን ዙር ይጠብቁ።" };
  }

  const roundData = getOrCreateBotRound(roundId);
  const uid = String(user.userId);

  // 1. Check if card is already held by someone
  const existing = roundData.tickets.get(cardNum);
  if (existing) {
    if (existing.userId === uid) {
      return { success: true, alreadyOwned: true, cardNumber: cardNum, message: `ካርቴላ #${cardNum} አስቀድመው በእርስዎ ተይዟል።` };
    }
    return { success: false, error: "ALREADY_TAKEN", message: `ይቅርታ! ካርቴላ #${cardNum} በሌላ ተጫዋች ተይዟል (Already taken by another player).` };
  }

  // 2. Check player card limit (max 4 per round)
  let userOwnedCount = 0;
  for (const info of roundData.tickets.values()) {
    if (info.userId === uid) userOwnedCount++;
  }
  if (userOwnedCount >= MAX_CARDS_PER_PLAYER) {
    return { success: false, error: "MAX_CARDS_REACHED", message: `በአንድ ዙር ከ ${MAX_CARDS_PER_PLAYER} ካርቴላ በላይ መያዝ አይቻልም።` };
  }

  // 3. Balance verification & deduction (Prefer Play Bonus first, then Main Cash Balance)
  const currentBonus = user.bonus != null ? user.bonus : ADMIN_CONFIG.initialPlayBonus;
  const currentBalance = user.balance != null ? user.balance : 0;
  const totalFunds = currentBonus + currentBalance;

  if (totalFunds < CARD_PRICE) {
    return {
      success: false,
      error: "INSUFFICIENT_FUNDS",
      message: `የሂሳብዎ መጠን በቂ አይደለም! ካርቴላ ለመግዛት 10.00 ETB ያስፈልጋል። ሂሳብዎ: ${totalFunds.toFixed(2)} ETB ነው።\nእባክዎ ገንዘብ ገቢ (Deposit) ያድርጉ።`,
    };
  }

  let deductBonus = 0;
  let deductMain = 0;
  if (currentBonus >= CARD_PRICE) {
    deductBonus = -CARD_PRICE;
  } else {
    deductBonus = -currentBonus;
    deductMain = -(CARD_PRICE - currentBonus);
  }

  // 4. ATOMIC COMMIT: Set ticket in memory authoritative map
  roundData.tickets.set(cardNum, {
    userId: uid,
    userName: user.name || "ተጫዋች",
    userPhone: user.phone || "",
    time: Date.now(),
    status: "SELECTED",
  });

  if (!roundData.firstTicketAt) {
    roundData.firstTicketAt = Date.now();
  }

  // Deduct balance and record history asynchronously
  await adjustUserBalance(uid, deductMain, deductBonus, "CARD_SELECTED", `ካርቴላ #${cardNum} ተመርጧል (ዙር #${roundId})`, {
    gameId: roundId,
    cardNumber: cardNum,
    paymentMethod: deductBonus < 0 ? "Play Bonus" : "Main Balance",
  });

  await logPlayerHistory({
    userId: uid,
    userName: user.name || "ተጫዋች",
    eventType: "GAME_JOINED",
    gameId: roundId,
    cardNumber: cardNum,
    amount: CARD_PRICE,
    status: "completed",
    description: `ተጫዋቹ ዙር #${roundId}ን በካርቴላ #${cardNum} ተቀላቅሏል`,
  });

  // Realtime Broadcast to all connected Telegram sessions & SSE clients
  broadcastMasterState({ type: "SELECT", ticketNum: cardNum, userId: uid, userName: user.name });
  broadcastTelegramCardChange(roundId, cardNum);

  return {
    success: true,
    cardNumber: cardNum,
    gameId: roundId,
    message: `ካርቴላ #${cardNum} በተሳካ ሁኔታ ተይዟል! (Card #${cardNum} Selected)`,
  };
}

// ATOMIC SERVER-SIDE CARD RELEASE / UNSELECT / CHANGE
// Enforces: Only the verified owner can release the card
async function atomicReleaseCard(roundId, cardNumber, userId) {
  const cardNum = parseInt(cardNumber, 10);
  const uid = String(userId);
  const roundData = getOrCreateBotRound(roundId);

  const state = getMasterRoomState();
  if (state.phase !== "lobby") {
    return { success: false, error: "GAME_STARTED", message: "ጨዋታው ስለተጀመረ ካርቴላውን መልቀቅ አይቻልም።" };
  }

  const existing = roundData.tickets.get(cardNum);
  if (!existing) {
    return { success: false, error: "NOT_FOUND", message: `ካርቴላ #${cardNum} አስቀድሞ ተለቋል ወይም አልተያዘም።` };
  }

  // Security Verification: player must own the card
  if (existing.userId !== uid) {
    return { success: false, error: "UNAUTHORIZED", message: "የሌላ ተጫዋች ካርቴላ መሰረዝ አይፈቀድም!" };
  }

  // Release card
  roundData.tickets.delete(cardNum);

  // Instant 10 ETB Refund to player wallet
  await adjustUserBalance(uid, 0, CARD_PRICE, "REFUND", `የካርቴላ #${cardNum} ተመላሽ (ዙር #${roundId})`, {
    gameId: roundId,
    cardNumber: cardNum,
    paymentMethod: "Refund",
  });

  await logPlayerHistory({
    userId: uid,
    userName: existing.userName || "ተጫዋች",
    eventType: "CARD_RELEASED",
    gameId: roundId,
    cardNumber: cardNum,
    amount: CARD_PRICE,
    status: "completed",
    description: `ካርቴላ #${cardNum} ተሰርዟል፤ 10 ETB ተመላሽ ሆኗል`,
  });

  // Realtime Broadcast to all connected Telegram sessions & SSE clients
  broadcastMasterState({ type: "UNSELECT", ticketNum: cardNum, userId: uid });
  broadcastTelegramCardChange(roundId, cardNum);

  return {
    success: true,
    cardNumber: cardNum,
    message: `ካርቴላ #${cardNum} በተሳካ ሁኔታ ተለቋል፤ 10.00 ETB ተመላሽ ተደርጓል! (Card #${cardNum} Released & Refunded)`,
  };
}

// ==========================================================
// 7. REAL-TIME TELEGRAM INLINE KEYBOARD SYNCHRONIZATION
// ==========================================================
// Generates paginated 20-card grid keyboard for Telegram
function getCardsPageKeyboard(roundId, page = 1, currentUserId = null) {
  const roundData = getOrCreateBotRound(roundId);
  const currentPage = Math.max(1, Math.min(TOTAL_PAGES, page));
  const startCard = (currentPage - 1) * CARDS_PER_PAGE + 1;
  const endCard = Math.min(TOTAL_CARTELAS, startCard + CARDS_PER_PAGE - 1);

  const inline_keyboard = [];
  let currentRow = [];

  for (let c = startCard; c <= endCard; c++) {
    const existing = roundData.tickets.get(c);
    let btnText = `🎟 ${c}`;
    let callbackData = `sel_${c}`;

    if (existing) {
      if (currentUserId && existing.userId === String(currentUserId)) {
        btnText = `⭐ ${c} (Yours)`;
        callbackData = `mycard_${c}`;
      } else {
        btnText = `🔒 ${c}`;
        callbackData = `taken_${c}`;
      }
    }

    currentRow.push({ text: btnText, callback_data: callbackData });
    if (currentRow.length === 4) {
      inline_keyboard.push(currentRow);
      currentRow = [];
    }
  }
  if (currentRow.length > 0) {
    inline_keyboard.push(currentRow);
  }

  // Navigation Row
  const prevPage = currentPage > 1 ? currentPage - 1 : TOTAL_PAGES;
  const nextPage = currentPage < TOTAL_PAGES ? currentPage + 1 : 1;

  inline_keyboard.push([
    { text: "◀️ ቀዳሚ", callback_data: `page_${prevPage}` },
    { text: `📄 ${currentPage}/${TOTAL_PAGES}`, callback_data: `page_${currentPage}` },
    { text: "ቀጣይ ▶️", callback_data: `page_${nextPage}` },
  ]);

  // Action Buttons
  inline_keyboard.push([
    { text: "🔍 በቁጥር ፈልግ", callback_data: "action_search" },
    { text: "🎲 የዕድል ካርቴላ", callback_data: "action_random" },
    { text: "🔄 አድስ", callback_data: `page_${currentPage}` },
  ]);

  // Lobby Return
  inline_keyboard.push([
    { text: "🔙 ወደ ሎቢ ተመለስ (Back to Lobby)", callback_data: "cmd_lobby" },
  ]);

  return { inline_keyboard };
}

// Broadcasts real-time keyboard update to all active Telegram clients viewing the affected page
async function broadcastTelegramCardChange(roundId, affectedCardNum) {
  const affectedPage = Math.ceil(affectedCardNum / CARDS_PER_PAGE);

  for (const [uid, session] of activeTelegramSessions.entries()) {
    if (!session.chatId || !session.messageId) continue;

    // If user is currently on the cartelas page containing this card
    if (session.view === "cards_page" && session.page === affectedPage) {
      try {
        const keyboard = getCardsPageKeyboard(roundId, affectedPage, uid);
        await editMessageReplyMarkup(session.chatId, session.messageId, keyboard);
      } catch (err) {
        // Silently ignore 'message is not modified'
      }
    }
    // If user is on the lobby view, update their live lobby overview
    else if (session.view === "lobby") {
      try {
        const state = getMasterRoomState();
        const user = await getOrCreateUser(uid);
        const { text, keyboard } = formatLobbyView(state, user);
        await editMessageText(session.chatId, session.messageId, text, keyboard);
      } catch (err) {
        // Silently ignore
      }
    }
  }
}

// Format the Rich Telegram Lobby View
function formatLobbyView(state, user) {
  const presence = getOnlinePresenceStats();
  const roundData = getOrCreateBotRound(state.roundId);
  const myCards = [];
  for (const [cNum, info] of roundData.tickets.entries()) {
    if (info.userId === String(user.userId)) myCards.push(cNum);
  }

  const bonus = user.bonus != null ? user.bonus : ADMIN_CONFIG.initialPlayBonus;
  const balance = user.balance != null ? user.balance : 0;
  const totalFunds = bonus + balance;

  const textLines = [
    "🦅 <b>ፊኒክስ ቢንጎ - የቀጥታ ሎቢ (Live Lobby)</b> 🔴",
    "━━━━━━━━━━━━━━━━━━━━",
    `🟢 <b>ኦንላይን ተጫዋቾች:</b> <b>${presence.onlinePlayers}</b> | 🎮 <b>በጌም ውስጥ:</b> <b>${state.playersCount}</b>`,
    `⏱ <b>ቀጣይ ዙር የሚጀምረው:</b> <b>${state.countdown} ሰከንድ</b>`,
    `💰 <b>የዙሩ ጃክፖት (Jackpot):</b> <b>${state.jackpot.toFixed(2)} ETB</b>`,
    `🎟 <b>የተያዙ ካርቴላዎች:</b> <b>${state.totalRoomTickets} / ${TOTAL_CARTELAS}</b>`,
    "━━━━━━━━━━━━━━━━━━━━",
    myCards.length > 0
      ? `⭐ <b>የእርስዎ የተመረጡ ካርቴላዎች:</b> ${myCards.map((n) => `<b>#${n}</b>`).join(", ")}`
      : "ℹ️ <i>እስካሁን ምንም ካርቴላ አልመረጡም። ከታች «🎟 ካርቴላ ይምረጡ»ን ተጭነው ይምረጡ!</i>",
    "",
    `💵 <b>የእርስዎ ሂሳብ:</b> <b>${totalFunds.toFixed(2)} ETB</b> (ቦነስ: ${bonus.toFixed(2)} | ዋና: ${balance.toFixed(2)})`,
  ];

  const inline_keyboard = [];

  if (myCards.length > 0) {
    const cardButtons = myCards.map((cn) => ({
      text: `👀 #${cn} እይ / ቀይር`,
      callback_data: `mycard_${cn}`,
    }));
    inline_keyboard.push(cardButtons);

    inline_keyboard.push([
      { text: "❌ ሁሉንም ካርቴላዎች መልስ (Refund All)", callback_data: "action_refund_all" },
    ]);
  }

  inline_keyboard.push([
    { text: "🎟 ካርቴላ ይምረጡ (Pick 1-550)", callback_data: "cmd_cards" },
    { text: "🎲 የዕድል ካርቴላ (Random)", callback_data: "action_random" },
  ]);

  inline_keyboard.push([
    { text: "💰 ዋሌት (Wallet)", callback_data: "cmd_wallet" },
    { text: "📜 ታሪክ (History)", callback_data: "cmd_history" },
  ]);

  inline_keyboard.push([
    { text: "🔄 አድስ (Refresh)", callback_data: "cmd_lobby" },
  ]);

  return {
    text: textLines.join("\n"),
    keyboard: { inline_keyboard },
  };
}

// ==========================================================
// 8. TELEGRAM BOT API CALLS & HELPERS
// ==========================================================
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

async function sendMessage(chatId, text, replyMarkup) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

async function editMessageText(chatId, messageId, text, replyMarkup) {
  return await telegramRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

async function editMessageReplyMarkup(chatId, messageId, replyMarkup) {
  return await telegramRequest("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup,
  });
}

async function answerCallbackQuery(callbackQueryId, text = "", showAlert = false) {
  return await telegramRequest("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text,
    show_alert: showAlert,
  });
}

// Contact Keyboard for Phone Verification
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

// Bottom Persistent Menu Keyboard
function getMainPersistentKeyboard(user) {
  return {
    keyboard: [
      [{ text: "🎮 ጌም ይጫወቱ (Play Bingo)" }, { text: "🎟 ካርቴላ ምረጥ (Cards)" }],
      [{ text: "💰 ዋሌት / ሂሳብ" }, { text: "📜 ታሪክ (History)" }],
      [{ text: "📥 ገቢ (Deposit)" }, { text: "📤 ወጪ (Withdraw)" }],
      [{ text: "👤 ፕሮፋይል" }, { text: "🆘 እርዳታ & ድጋፍ" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

// ==========================================================
// 9. TELEGRAM UPDATE HANDLER & ROUTER
// ==========================================================
async function handleUpdate(update) {
  let chatId, rawText, userName, userId, username, messageId, callbackQueryId;

  if (update.callback_query) {
    chatId = update.callback_query.message.chat.id;
    messageId = update.callback_query.message.message_id;
    rawText = update.callback_query.data;
    userName = update.callback_query.from.first_name || "ተጫዋች";
    userId = update.callback_query.from.id;
    username = update.callback_query.from.username;
    callbackQueryId = update.callback_query.id;
  } else if (update.message) {
    chatId = update.message.chat.id;
    messageId = update.message.message_id;
    userName = [update.message.from.first_name, update.message.from.last_name].filter(Boolean).join(" ") || "ተጫዋች";
    userId = update.message.from.id;
    username = update.message.from.username;
    rawText = update.message.text ? update.message.text.trim() : "";
  } else {
    return;
  }

  const user = await getOrCreateUser(userId, userName, username);

  // 1. Phone Registration Flow
  if (update.message && update.message.contact) {
    const contactPhone = update.message.contact.phone_number;
    const cleanPhone = await registerUserPhone(userId, contactPhone);
    user.phone = cleanPhone;

    const welcomeMsg = [
      `🎉 <b>እንኳን ደስ አሎት ${userName}! ምዝገባዎ ተጠናቋል።</b>`,
      "",
      `📱 <b>የተረጋገጠ ስልክ:</b> <code>${cleanPhone}</code>`,
      `🎁 <b>የመጫወቻ ቦነስ (Play Bonus):</b> <b>${ADMIN_CONFIG.initialPlayBonus.toFixed(2)} ETB</b>`,
      `🔑 <b>የይለፍ ቃል:</b> <code>${user.password}</code>`,
      "",
      "👇 <b>ጨዋታውን ለመጀመር ከታች «🎮 ጌም ይጫወቱ (Play Bingo)»ን ይጫኑ፦</b>",
    ].join("\n");

    const sent = await sendMessage(chatId, welcomeMsg, getMainPersistentKeyboard(user));
    if (sent && sent.result) {
      trackTelegramUser(userId, chatId, "lobby", 1, sent.result.message_id);
    }
    return;
  }

  // 2. Lockout unverified phones
  if (!user.phone) {
    const askPhoneMsg = [
      "🦅 <b>እንኳን ወደ ፊኒክስ ቢንጎ በደህና መጡ!</b>",
      "",
      `ወደ ቀጥታ ጨዋታው ለመግባት፣ የ <b>${ADMIN_CONFIG.initialPlayBonus.toFixed(2)} ETB</b> መጫወቻ ቦነስ ለመውሰድ እና የአካውንትዎ ደህንነት እንዲጠበቅ <b>ስልክ ቁጥርዎን ማጋራት ግዴታ ነው</b>።`,
      "",
      "👇 <b>ከታች ያለውን «📱 ስልክ ቁጥርዎን ያጋሩ» የሚለውን ይጫኑ፦</b>",
    ].join("\n");
    await sendMessage(chatId, askPhoneMsg, CONTACT_KEYBOARD);
    return;
  }

  // 3. Deposit Receipt Forwarding
  if (update.message && (update.message.photo || (rawText && (rawText.toLowerCase().includes("trans") || rawText.toLowerCase().includes("telebirr") || rawText.toLowerCase().includes("cbe") || rawText.length > 20)))) {
    if (!rawText.startsWith("/")) {
      await forwardDepositToAdmin(user, update);
      return;
    }
  }

  // ========================================================
  // CALLBACK QUERY ROUTER (Inline Button Interactions)
  // ========================================================
  if (update.callback_query) {
    const data = update.callback_query.data;
    const currentState = getMasterRoomState();
    const roundId = currentState.roundId;

    // A. Page Navigation: page_<num>
    if (data.startsWith("page_")) {
      const pageNum = parseInt(data.replace("page_", ""), 10) || 1;
      trackTelegramUser(userId, chatId, "cards_page", pageNum, messageId);
      await answerCallbackQuery(callbackQueryId);

      const keyboard = getCardsPageKeyboard(roundId, pageNum, userId);
      const text = [
        `🦅 <b>ፊኒክስ ቢንጎ - ካርቴላ ይምረጡ (ገጽ ${pageNum}/${TOTAL_PAGES})</b>`,
        "━━━━━━━━━━━━━━━━━━━━",
        "🎟 <b>ነፃ (Available):</b> ለመያዝ ካርቴላውን ይጫኑ",
        "🔒 <b>የተያዘ (Taken):</b> በሌላ ተጫዋች የተያዘ",
        "⭐ <b>የእርስዎ (Yours):</b> በእርስዎ የተያዘ ካርቴላ",
        "━━━━━━━━━━━━━━━━━━━━",
        `💰 <b>የአንድ ካርቴላ ዋጋ:</b> 10.00 ETB | <b>የዙሩ ጃክፖት:</b> ${currentState.jackpot.toFixed(2)} ETB`,
      ].join("\n");

      await editMessageText(chatId, messageId, text, keyboard);
      return;
    }

    // B. Select Cartela: sel_<num>
    if (data.startsWith("sel_")) {
      const cardNum = parseInt(data.replace("sel_", ""), 10);
      const result = await atomicReserveCard(roundId, cardNum, user);

      if (!result.success) {
        await answerCallbackQuery(callbackQueryId, result.message, true);
        return;
      }

      await answerCallbackQuery(callbackQueryId, `✅ ካርቴላ #${cardNum} ተመርጧል!`, false);

      // Present the selected card screen with 5x5 board preview & action options
      const { text: boardAscii } = formatCartelaBoard(cardNum);
      const selViewText = [
        `✅ <b>ካርቴላ #${cardNum} በተሳካ ሁኔታ ተመርጧል!</b>`,
        "━━━━━━━━━━━━━━━━━━━━",
        `<pre>${boardAscii}</pre>`,
        "━━━━━━━━━━━━━━━━━━━━",
        "ℹ️ <i>ሀሳብዎን ከቀየሩ ከታች «❌ ካርቴላውን መልስ / ቀይር»ን በመጫን ካርቴላውን ሰርዘው 10 ETB ተመላሽ ማግኘት ይችላሉ!</i>",
      ].join("\n");

      const actionKeyboard = {
        inline_keyboard: [
          [{ text: "❌ ካርቴላውን መልስ / ቀይር (Unselect Card)", callback_data: `unpick_${cardNum}` }],
          [{ text: "🎟 ተጨማሪ ካርቴላ ምረጥ (Pick More)", callback_data: `page_${Math.ceil(cardNum / CARDS_PER_PAGE)}` }],
          [{ text: "🎮 ወደ ሎቢ ተመለስ (Back to Lobby)", callback_data: "cmd_lobby" }],
        ],
      };

      trackTelegramUser(userId, chatId, "card_view", Math.ceil(cardNum / CARDS_PER_PAGE), messageId);
      await editMessageText(chatId, messageId, selViewText, actionKeyboard);
      return;
    }

    // C. Taken Cartela: taken_<num>
    if (data.startsWith("taken_")) {
      const cardNum = parseInt(data.replace("taken_", ""), 10);
      await answerCallbackQuery(callbackQueryId, `🔒 ይቅርታ! ካርቴላ #${cardNum} በሌላ ተጫዋች ተይዟል (Already taken by another player).`, true);
      return;
    }

    // D. View My Card: mycard_<num>
    if (data.startsWith("mycard_")) {
      const cardNum = parseInt(data.replace("mycard_", ""), 10);
      await answerCallbackQuery(callbackQueryId);

      const { text: boardAscii } = formatCartelaBoard(cardNum);
      const cardViewText = [
        `⭐ <b>የእርስዎ ካርቴላ: #${cardNum} (YOUR CARD)</b>`,
        "━━━━━━━━━━━━━━━━━━━━",
        `<pre>${boardAscii}</pre>`,
        "━━━━━━━━━━━━━━━━━━━━",
        "ይህን ካርቴላ መልቀቅ ወይም መቀየር ከፈለጉ ከታች ያለውን ቀይ ቁልፍ ይጫኑ፦",
      ].join("\n");

      const cardKeyboard = {
        inline_keyboard: [
          [{ text: "❌ ካርቴላውን መልስ / ቀይር (Unselect Card)", callback_data: `unpick_${cardNum}` }],
          [{ text: "🎟 ወደ ካርቴላዎች ተመለስ (Back)", callback_data: `page_${Math.ceil(cardNum / CARDS_PER_PAGE)}` }],
          [{ text: "🎮 ወደ ሎቢ ተመለስ (Lobby)", callback_data: "cmd_lobby" }],
        ],
      };

      await editMessageText(chatId, messageId, cardViewText, cardKeyboard);
      return;
    }

    // E. Unselect / Release Cartela: unpick_<num>
    if (data.startsWith("unpick_")) {
      const cardNum = parseInt(data.replace("unpick_", ""), 10);
      const releaseResult = await atomicReleaseCard(roundId, cardNum, userId);

      if (!releaseResult.success) {
        await answerCallbackQuery(callbackQueryId, releaseResult.message, true);
        return;
      }

      await answerCallbackQuery(callbackQueryId, `🔄 ካርቴላ #${cardNum} ተለቋል፤ 10 ETB ተመላሽ ተደርጓል!`, true);

      // Return to Lobby
      const freshUser = await getOrCreateUser(userId);
      const freshState = getMasterRoomState();
      const { text, keyboard } = formatLobbyView(freshState, freshUser);
      trackTelegramUser(userId, chatId, "lobby", 1, messageId);
      await editMessageText(chatId, messageId, text, keyboard);
      return;
    }

    // F. Refund All User Tickets
    if (data === "action_refund_all") {
      const roundData = getOrCreateBotRound(roundId);
      const userTickets = [];
      for (const [cn, info] of roundData.tickets.entries()) {
        if (info.userId === String(userId)) userTickets.push(cn);
      }

      if (userTickets.length === 0) {
        await answerCallbackQuery(callbackQueryId, "ምንም የተመረጠ ካርቴላ የለዎትም።", false);
        return;
      }

      for (const cn of userTickets) {
        await atomicReleaseCard(roundId, cn, userId);
      }

      await answerCallbackQuery(callbackQueryId, `🔄 ${userTickets.length} ካርቴላዎች ተሰርዘው ገንዘብዎ ተመልሷል!`, true);
      const freshUser = await getOrCreateUser(userId);
      const freshState = getMasterRoomState();
      const { text, keyboard } = formatLobbyView(freshState, freshUser);
      trackTelegramUser(userId, chatId, "lobby", 1, messageId);
      await editMessageText(chatId, messageId, text, keyboard);
      return;
    }

    // G. Random Card Pick
    if (data === "action_random") {
      const roundData = getOrCreateBotRound(roundId);
      const available = [];
      for (let i = 1; i <= TOTAL_CARTELAS; i++) {
        if (!roundData.tickets.has(i)) available.push(i);
      }

      if (available.length === 0) {
        await answerCallbackQuery(callbackQueryId, "ሁሉም ካርቴላዎች ተይዘዋል!", true);
        return;
      }

      const randomCard = available[Math.floor(Math.random() * available.length)];
      const result = await atomicReserveCard(roundId, randomCard, user);

      if (!result.success) {
        await answerCallbackQuery(callbackQueryId, result.message, true);
        return;
      }

      await answerCallbackQuery(callbackQueryId, `🎲 የዕድል ካርቴላ #${randomCard} ተመርጧል!`, false);
      const { text: boardAscii } = formatCartelaBoard(randomCard);
      const selViewText = [
        `🎲 <b>የዕድል ካርቴላ #${randomCard} ተመርጧል!</b>`,
        "━━━━━━━━━━━━━━━━━━━━",
        `<pre>${boardAscii}</pre>`,
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n");

      const actionKeyboard = {
        inline_keyboard: [
          [{ text: "❌ ካርቴላውን መልስ / ቀይር (Unselect)", callback_data: `unpick_${randomCard}` }],
          [{ text: "🎲 ሌላ የዕድል ካርቴላ ምረጥ (Another)", callback_data: "action_random" }],
          [{ text: "🎮 ወደ ሎቢ ተመለስ (Lobby)", callback_data: "cmd_lobby" }],
        ],
      };

      trackTelegramUser(userId, chatId, "card_view", Math.ceil(randomCard / CARDS_PER_PAGE), messageId);
      await editMessageText(chatId, messageId, selViewText, actionKeyboard);
      return;
    }

    // H. Open Cartelas Browser
    if (data === "cmd_cards") {
      await answerCallbackQuery(callbackQueryId);
      trackTelegramUser(userId, chatId, "cards_page", 1, messageId);
      const keyboard = getCardsPageKeyboard(roundId, 1, userId);
      const text = [
        `🦅 <b>ፊኒክስ ቢንጎ - ካርቴላ ይምረጡ (ገጽ 1/${TOTAL_PAGES})</b>`,
        "━━━━━━━━━━━━━━━━━━━━",
        "🎟 <b>ነፃ (Available):</b> ለመያዝ ካርቴላውን ይጫኑ",
        "🔒 <b>የተያዘ (Taken):</b> በሌላ ተጫዋች የተያዘ",
        "⭐ <b>የእርስዎ (Yours):</b> በእርስዎ የተያዘ ካርቴላ",
        "━━━━━━━━━━━━━━━━━━━━",
        `💰 <b>የአንድ ካርቴላ ዋጋ:</b> 10.00 ETB | <b>የዙሩ ጃክፖት:</b> ${currentState.jackpot.toFixed(2)} ETB`,
      ].join("\n");
      await editMessageText(chatId, messageId, text, keyboard);
      return;
    }

    // I. Open Lobby
    if (data === "cmd_lobby") {
      await answerCallbackQuery(callbackQueryId);
      trackTelegramUser(userId, chatId, "lobby", 1, messageId);
      const freshUser = await getOrCreateUser(userId);
      const { text, keyboard } = formatLobbyView(currentState, freshUser);
      await editMessageText(chatId, messageId, text, keyboard);
      return;
    }

    // J. Search Cartela Action Prompt
    if (data === "action_search") {
      await answerCallbackQuery(callbackQueryId);
      const searchPrompt = [
        "🔍 <b>የካርቴላ ቁጥር መፈለጊያ (Search Cartela)</b>",
        "",
        "የሚፈልጉትን የካርቴላ ቁጥር (ከ 1 እስከ 550) <b>በቀጥታ በዚህ ቻት ውስጥ በቁጥር ብቻ ይላኩ</b> (ለምሳሌ፦ <code>123</code> ወይም <code>450</code>)።",
        "",
        "ቦቱ ካርቴላው ነፃ መሆኑን አይቶ ወዲያውኑ ያቀርብልዎታል።",
      ].join("\n");

      await sendMessage(chatId, searchPrompt, {
        inline_keyboard: [[{ text: "🔙 ወደ ካርቴላዎች ተመለስ", callback_data: "cmd_cards" }]],
      });
      return;
    }

    // K. History Section Router: hist_<filter>_<page>
    if (data.startsWith("hist_") || data === "cmd_history") {
      await answerCallbackQuery(callbackQueryId);
      let filter = "all";
      let page = 1;

      if (data.startsWith("hist_")) {
        const parts = data.split("_");
        filter = parts[1] || "all";
        page = parseInt(parts[2], 10) || 1;
      }

      trackTelegramUser(userId, chatId, "history", page, messageId);
      const histData = await getPlayerPersonalHistory(userId, filter, 8, page);

      let histBody = "";
      if (histData.items.length === 0) {
        histBody = "<i>እስካሁን ምንም አይነት የታሪክ መዝገብ አልተገኘም።</i>";
      } else {
        histBody = histData.items.map((it) => formatHistoryEntry(it)).join("\n\n");
      }

      const histMsg = [
        `📜 <b>የተጫዋች የግል ታሪክ (PLAYER HISTORY)</b>`,
        "━━━━━━━━━━━━━━━━━━━━",
        histBody,
        "━━━━━━━━━━━━━━━━━━━━",
        `📄 <b>ገጽ:</b> ${histData.page} / ${histData.totalPages} (ጠቅላላ: ${histData.total})`,
      ].join("\n");

      const filterRow = [
        { text: filter === "all" ? "🔘 ሁሉም (All)" : "ሁሉም", callback_data: `hist_all_1` },
        { text: filter === "games" ? "🔘 🎮 ጌሞች" : "🎮 ጌሞች", callback_data: `hist_games_1` },
        { text: filter === "cards" ? "🔘 🎟 ካርቴላ" : "🎟 ካርቴላ", callback_data: `hist_cards_1` },
        { text: filter === "wallet" ? "🔘 💳 ሂሳብ" : "💳 ሂሳብ", callback_data: `hist_wallet_1` },
      ];

      const navRow = [];
      if (histData.page > 1) {
        navRow.push({ text: "◀️ ቀዳሚ", callback_data: `hist_${filter}_${histData.page - 1}` });
      }
      if (histData.page < histData.totalPages) {
        navRow.push({ text: "ቀጣይ ▶️", callback_data: `hist_${filter}_${histData.page + 1}` });
      }

      const histKeyboard = {
        inline_keyboard: [
          filterRow,
          ...(navRow.length > 0 ? [navRow] : []),
          [{ text: "🎮 ወደ ሎቢ ተመለስ (Lobby)", callback_data: "cmd_lobby" }],
        ],
      };

      await editMessageText(chatId, messageId, histMsg, histKeyboard);
      return;
    }

    // L. Wallet Section Router
    if (data === "cmd_wallet") {
      await answerCallbackQuery(callbackQueryId);
      trackTelegramUser(userId, chatId, "wallet", 1, messageId);

      const balanceStr = (user.balance || 0).toFixed(2);
      const bonusStr = (user.bonus != null ? user.bonus : ADMIN_CONFIG.initialPlayBonus).toFixed(2);
      const wonStr = (user.totalWon || 0).toFixed(2);
      const totalFunds = ((user.balance || 0) + (user.bonus != null ? user.bonus : ADMIN_CONFIG.initialPlayBonus)).toFixed(2);

      const walletMsg = [
        "💰 <b>የሒሳብ እና ዋሌት መረጃ (Wallet Balance)</b>",
        "━━━━━━━━━━━━━━━━━━━━",
        `👤 <b>ተጫዋች:</b> ${userName}`,
        `🆔 <b>የቴሌግራም ID:</b> <code>${userId}</code>`,
        `📱 <b>ስልክ:</b> <code>${user.phone}</code> ✅`,
        "",
        `💵 <b>ጠቅላላ ሂሳብ:</b> <b>${totalFunds} ETB</b>`,
        `🎁 <b>መጫወቻ ሂሳብ (Play Bonus):</b> <b>${bonusStr} ETB</b>`,
        `💰 <b>ዋና ሂሳብ (Main Cash Wallet):</b> <b>${balanceStr} ETB</b>`,
        `🏆 <b>ያሸነፉት ጠቅላላ (Total Won):</b> <b>${wonStr} ETB</b>`,
        "━━━━━━━━━━━━━━━━━━━━",
        "<i>ገንዘብ ገቢ ወይም ወጪ ለማድረግ ከታች ያሉትን ቁልፎች ይጠቀሙ፦</i>",
      ].join("\n");

      const walletInline = {
        inline_keyboard: [
          [
            { text: "📥 ገንዘብ አስገባ (Deposit)", callback_data: "cmd_deposit" },
            { text: "📤 ገንዘብ አውጣ (Withdraw)", callback_data: "cmd_withdraw" },
          ],
          [
            { text: "📜 የሂሳብ እንቅስቃሴ (Statement)", callback_data: "hist_wallet_1" },
            { text: "🔄 አድስ", callback_data: "cmd_wallet" },
          ],
          [{ text: "🎮 ወደ ሎቢ ተመለስ (Lobby)", callback_data: "cmd_lobby" }],
        ],
      };

      await editMessageText(chatId, messageId, walletMsg, walletInline);
      return;
    }

    // M. Deposit Callback
    if (data === "cmd_deposit") {
      await answerCallbackQuery(callbackQueryId);
      const depMsg = [
        "📥 <b>ገንዘብ ወደ አካውንትዎ ገቢ ማድረጊያ መመሪያ</b>",
        "━━━━━━━━━━━━━━━━━━━━",
        "📱 <b>ቴሌብር (Telebirr):</b>",
        `ቁጥር: <code>${ADMIN_CONFIG.telebirrNumber}</code>`,
        "",
        "🏦 <b>የኢትዮጵያ ንግድ ባንክ (CBE):</b>",
        `የሂሳብ ቁጥር: <code>${ADMIN_CONFIG.cbeAccount}</code>`,
        "━━━━━━━━━━━━━━━━━━━━",
        "⚠️ <b>ማሳሰቢያ፦</b>",
        "ገንዘቡን ካስተላለፉ በኋላ የደረሰኝ ስክሪንሾት ወይም የቴሌብር SMS መልእክቱን <b>እዚሁ ቦት ላይ ይላኩት!</b>",
        "የሂሳብ ባለሙያዎቻችን በ 2 ደቂቃ ውስጥ አረጋግጠው ዋና ሂሳብዎ ላይ ይሞላሉ!",
      ].join("\n");

      await sendMessage(chatId, depMsg, getMainPersistentKeyboard(user));
      return;
    }

    // N. Withdraw Callback
    if (data === "cmd_withdraw") {
      await answerCallbackQuery(callbackQueryId);
      const balanceStr = (user.balance || 0).toFixed(2);
      const withMsg = [
        "📤 <b>ያሸነፉትን ገንዘብ ወጪ ማድረጊያ (Withdrawal)</b>",
        "━━━━━━━━━━━━━━━━━━━━",
        `• <b>ዋና ሂሳብ (ሊወጣ የሚችል):</b> <b>${balanceStr} ETB</b>`,
        `• <b>ዝቅተኛ የወጪ መጠን:</b> ${ADMIN_CONFIG.minWithdraw} ETB`,
        `• <b>የሚከፈልበት ስልክ ቁጥር:</b> <code>${user.phone}</code> (የተቆለፈ)`,
        "• <b>የክፍያ ጊዜ:</b> ከ 5 እስከ 15 ደቂቃዎች ውስጥ",
        "━━━━━━━━━━━━━━━━━━━━",
        `ወጪ ለማዘዝ ለአድሚን <b>${ADMIN_CONFIG.supportUsername}</b> መልእክት ይላኩ።`,
      ].join("\n");

      const withInline = {
        inline_keyboard: [
          [{ text: "📤 ወጪ ለማዘዝ አድሚንን ያነጋግሩ", url: `https://t.me/${ADMIN_CONFIG.supportUsername.replace("@", "")}` }],
          [{ text: "🔙 ወደ ዋሌት ተመለስ", callback_data: "cmd_wallet" }],
        ],
      };

      await sendMessage(chatId, withMsg, withInline);
      return;
    }

    // Admin Action Callbacks
    if (data.startsWith("adm_")) {
      if (userId !== ADMIN_CONFIG.adminTelegramId) {
        await answerCallbackQuery(callbackQueryId, "የአድሚን ፈቃድ የለዎትም!", true);
        return;
      }
      if (data === "adm_start_now") {
        forceGameStartAt = Date.now();
        broadcastMasterState({ type: "ADMIN_FORCE_START" });
        await answerCallbackQuery(callbackQueryId, "ዙሩ እንዲጀምር ተደርጓል!", true);
        return;
      }
    }

    await answerCallbackQuery(callbackQueryId);
    return;
  }

  // ========================================================
  // MESSAGE COMMANDS ROUTER
  // ========================================================
  const text = rawText.toLowerCase();

  // 1. Direct Number Input (Quick Cartela Picker: e.g. "123", "450")
  const parsedDirectNum = parseInt(text, 10);
  if (!isNaN(parsedDirectNum) && String(parsedDirectNum) === text.trim() && parsedDirectNum >= 1 && parsedDirectNum <= TOTAL_CARTELAS) {
    const currentState = getMasterRoomState();
    const roundId = currentState.roundId;
    const roundData = getOrCreateBotRound(roundId);
    const existing = roundData.tickets.get(parsedDirectNum);

    const { text: boardAscii } = formatCartelaBoard(parsedDirectNum);

    if (existing) {
      if (existing.userId === String(userId)) {
        const msg = [
          `⭐ <b>ካርቴላ #${parsedDirectNum} አስቀድመው በእርስዎ ተመርጧል!</b>`,
          "━━━━━━━━━━━━━━━━━━━━",
          `<pre>${boardAscii}</pre>`,
          "━━━━━━━━━━━━━━━━━━━━",
        ].join("\n");

        await sendMessage(chatId, msg, {
          inline_keyboard: [
            [{ text: "❌ ካርቴላውን መልስ / ቀይር (Unselect)", callback_data: `unpick_${parsedDirectNum}` }],
            [{ text: "🎮 ወደ ሎቢ ተመለስ (Lobby)", callback_data: "cmd_lobby" }],
          ],
        });
        return;
      } else {
        const msg = [
          `🔒 <b>ይቅርታ! ካርቴላ #${parsedDirectNum} በሌላ ተጫዋች ተይዟል (Already Taken)።</b>`,
          "━━━━━━━━━━━━━━━━━━━━",
          `<pre>${boardAscii}</pre>`,
          "━━━━━━━━━━━━━━━━━━━━",
          "እባክዎ ሌላ ነፃ ካርቴላ ይምረጡ፦",
        ].join("\n");

        await sendMessage(chatId, msg, {
          inline_keyboard: [
            [{ text: "🎟 ሌሎች ካርቴላዎችን እይ (Pick Cards)", callback_data: "cmd_cards" }],
            [{ text: "🎲 የዕድል ካርቴላ (Random Pick)", callback_data: "action_random" }],
          ],
        });
        return;
      }
    } else {
      const msg = [
        `🎟 <b>ካርቴላ #${parsedDirectNum} ነፃ ነው (Available)!</b>`,
        "━━━━━━━━━━━━━━━━━━━━",
        `<pre>${boardAscii}</pre>`,
        "━━━━━━━━━━━━━━━━━━━━",
        `ዋጋ: 10.00 ETB | ጃክፖት: ${currentState.jackpot.toFixed(2)} ETB`,
      ].join("\n");

      await sendMessage(chatId, msg, {
        inline_keyboard: [
          [{ text: `✅ ካርቴላ #${parsedDirectNum} ምረጥ (Select #${parsedDirectNum})`, callback_data: `sel_${parsedDirectNum}` }],
          [{ text: "🔙 ወደ ካርቴላዎች ተመለስ (Back)", callback_data: "cmd_cards" }],
        ],
      });
      return;
    }
  }

  // 2. /pick command: e.g. /pick 123
  if (text.startsWith("/pick") || text.startsWith("/card")) {
    const parts = text.split(" ");
    const num = parseInt(parts[1], 10);
    if (num >= 1 && num <= TOTAL_CARTELAS) {
      const currentState = getMasterRoomState();
      const res = await atomicReserveCard(currentState.roundId, num, user);
      if (res.success) {
        await sendMessage(chatId, `✅ ካርቴላ #${num} ተመርጧል!`, {
          inline_keyboard: [
            [{ text: `👀 #${num} ካርቴላውን እይ`, callback_data: `mycard_${num}` }],
            [{ text: "🎮 ወደ ሎቢ ተመለስ", callback_data: "cmd_lobby" }],
          ],
        });
      } else {
        await sendMessage(chatId, `⚠️ ${res.message}`, {
          inline_keyboard: [[{ text: "🎟 ካርቴላ ምረጥ", callback_data: "cmd_cards" }]],
        });
      }
      return;
    }
  }

  // 3. /unpick command: e.g. /unpick 123
  if (text.startsWith("/unpick") || text.startsWith("/release")) {
    const parts = text.split(" ");
    const num = parseInt(parts[1], 10);
    if (num >= 1 && num <= TOTAL_CARTELAS) {
      const currentState = getMasterRoomState();
      const res = await atomicReleaseCard(currentState.roundId, num, userId);
      await sendMessage(chatId, res.message, {
        inline_keyboard: [[{ text: "🎮 ወደ ሎቢ ተመለስ", callback_data: "cmd_lobby" }]],
      });
      return;
    }
  }

  // 4. /play or /start or "🎮 ጌም ይጫወቱ"
  if (text === "/play" || text === "/start" || text.includes("play") || text.includes("ጌም") || text.includes("ሎቢ")) {
    const state = getMasterRoomState();
    const { text: lobbyText, keyboard } = formatLobbyView(state, user);
    const sent = await sendMessage(chatId, lobbyText, keyboard);
    if (sent && sent.result) {
      trackTelegramUser(userId, chatId, "lobby", 1, sent.result.message_id);
    }
    return;
  }

  // 5. /cards or "🎟 ካርቴላ ምረጥ"
  if (text === "/cards" || text.includes("ካርቴላ")) {
    const currentState = getMasterRoomState();
    const keyboard = getCardsPageKeyboard(currentState.roundId, 1, userId);
    const textCards = [
      `🦅 <b>ፊኒክስ ቢንጎ - ካርቴላ ይምረጡ (ገጽ 1/${TOTAL_PAGES})</b>`,
      "━━━━━━━━━━━━━━━━━━━━",
      "🎟 <b>ነፃ (Available):</b> ለመያዝ ካርቴላውን ይጫኑ",
      "🔒 <b>የተያዘ (Taken):</b> በሌላ ተጫዋች የተያዘ",
      "⭐ <b>የእርስዎ (Yours):</b> በእርስዎ የተያዘ ካርቴላ",
      "━━━━━━━━━━━━━━━━━━━━",
      `💰 <b>የአንድ ካርቴላ ዋጋ:</b> 10.00 ETB | <b>የዙሩ ጃክፖት:</b> ${currentState.jackpot.toFixed(2)} ETB`,
    ].join("\n");

    const sent = await sendMessage(chatId, textCards, keyboard);
    if (sent && sent.result) {
      trackTelegramUser(userId, chatId, "cards_page", 1, sent.result.message_id);
    }
    return;
  }

  // 6. /history or "📜 ታሪክ" - STRICT PRIVACY ENFORCED
  if (text === "/history" || text.includes("ታሪክ")) {
    // If user typed '/history OTHER_USER', strictly ignore the parameter and display only the authenticated user's history!
    const histData = await getPlayerPersonalHistory(userId, "all", 8, 1);
    let histBody = "";
    if (histData.items.length === 0) {
      histBody = "<i>እስካሁን ምንም አይነት የታሪክ መዝገብ አልተገኘም።</i>";
    } else {
      histBody = histData.items.map((it) => formatHistoryEntry(it)).join("\n\n");
    }

    const histMsg = [
      `📜 <b>የተጫዋች የግል ታሪክ (PLAYER HISTORY)</b>`,
      "━━━━━━━━━━━━━━━━━━━━",
      histBody,
      "━━━━━━━━━━━━━━━━━━━━",
      `📄 <b>ገጽ:</b> ${histData.page} / ${histData.totalPages} (ጠቅላላ: ${histData.total})`,
    ].join("\n");

    const filterRow = [
      { text: "🔘 ሁሉም (All)", callback_data: `hist_all_1` },
      { text: "🎮 ጌሞች", callback_data: `hist_games_1` },
      { text: "🎟 ካርቴላ", callback_data: `hist_cards_1` },
      { text: "💳 ሂሳብ", callback_data: `hist_wallet_1` },
    ];

    const navRow = [];
    if (histData.page < histData.totalPages) {
      navRow.push({ text: "ቀጣይ ▶️", callback_data: `hist_all_2` });
    }

    const histKeyboard = {
      inline_keyboard: [
        filterRow,
        ...(navRow.length > 0 ? [navRow] : []),
        [{ text: "🎮 ወደ ሎቢ ተመለስ (Lobby)", callback_data: "cmd_lobby" }],
      ],
    };

    const sent = await sendMessage(chatId, histMsg, histKeyboard);
    if (sent && sent.result) {
      trackTelegramUser(userId, chatId, "history", 1, sent.result.message_id);
    }
    return;
  }

  // 7. /wallet or /account or "💰 ዋሌት" or "ሂሳብ"
  if (text === "/wallet" || text === "/account" || text.includes("ዋሌት") || text.includes("ሂሳብ") || text.includes("ሒሳብ")) {
    const balanceStr = (user.balance || 0).toFixed(2);
    const bonusStr = (user.bonus != null ? user.bonus : ADMIN_CONFIG.initialPlayBonus).toFixed(2);
    const wonStr = (user.totalWon || 0).toFixed(2);
    const totalFunds = ((user.balance || 0) + (user.bonus != null ? user.bonus : ADMIN_CONFIG.initialPlayBonus)).toFixed(2);

    const walletMsg = [
      "💰 <b>የሒሳብ እና ዋሌት መረጃ (Wallet Balance)</b>",
      "━━━━━━━━━━━━━━━━━━━━",
      `👤 <b>ተጫዋች:</b> ${userName}`,
      `🆔 <b>የቴሌግራም ID:</b> <code>${userId}</code>`,
      `📱 <b>ስልክ:</b> <code>${user.phone}</code> ✅`,
      "",
      `💵 <b>ጠቅላላ ሂሳብ:</b> <b>${totalFunds} ETB</b>`,
      `🎁 <b>መጫወቻ ሂሳብ (Play Bonus):</b> <b>${bonusStr} ETB</b>`,
      `💰 <b>ዋና ሂሳብ (Main Cash Wallet):</b> <b>${balanceStr} ETB</b>`,
      `🏆 <b>ያሸነፉት ጠቅላላ (Total Won):</b> <b>${wonStr} ETB</b>`,
      "━━━━━━━━━━━━━━━━━━━━",
      "<i>ገንዘብ ገቢ ወይም ወጪ ለማድረግ ከታች ያሉትን ቁልፎች ይጠቀሙ፦</i>",
    ].join("\n");

    const walletInline = {
      inline_keyboard: [
        [
          { text: "📥 ገንዘብ አስገባ (Deposit)", callback_data: "cmd_deposit" },
          { text: "📤 ገንዘብ አውጣ (Withdraw)", callback_data: "cmd_withdraw" },
        ],
        [
          { text: "📜 የሂሳብ እንቅስቃሴ (Statement)", callback_data: "hist_wallet_1" },
          { text: "🔄 አድስ", callback_data: "cmd_wallet" },
        ],
        [{ text: "🎮 ወደ ሎቢ ተመለስ (Lobby)", callback_data: "cmd_lobby" }],
      ],
    };

    const sent = await sendMessage(chatId, walletMsg, walletInline);
    if (sent && sent.result) {
      trackTelegramUser(userId, chatId, "wallet", 1, sent.result.message_id);
    }
    return;
  }

  // 8. /deposit or "ገቢ"
  if (text === "/deposit" || text.includes("deposit") || text.includes("ገቢ")) {
    const depMsg = [
      "📥 <b>ገንዘብ ወደ አካውንትዎ ገቢ ማድረጊያ መመሪያ</b>",
      "━━━━━━━━━━━━━━━━━━━━",
      "📱 <b>ቴሌብር (Telebirr):</b>",
      `ቁጥር: <code>${ADMIN_CONFIG.telebirrNumber}</code>`,
      "",
      "🏦 <b>የኢትዮጵያ ንግድ ባንክ (CBE):</b>",
      `የሂሳብ ቁጥር: <code>${ADMIN_CONFIG.cbeAccount}</code>`,
      "━━━━━━━━━━━━━━━━━━━━",
      "⚠️ <b>ማሳሰቢያ፦</b>",
      "ገንዘቡን ካስተላለፉ በኋላ የደረሰኝ ስክሪንሾት ወይም የቴሌብር SMS መልእክቱን <b>እዚሁ ቦት ላይ ይላኩት!</b>",
      "የሂሳብ ባለሙያዎቻችን በ 2 ደቂቃ ውስጥ አረጋግጠው ዋና ሂሳብዎ ላይ ይሞላሉ!",
    ].join("\n");

    await sendMessage(chatId, depMsg, getMainPersistentKeyboard(user));
    return;
  }

  // 9. /withdraw or "ወጪ"
  if (text === "/withdraw" || text.includes("withdraw") || text.includes("ወጪ")) {
    const balanceStr = (user.balance || 0).toFixed(2);
    const withMsg = [
      "📤 <b>ያሸነፉትን ገንዘብ ወጪ ማድረጊያ (Withdrawal)</b>",
      "━━━━━━━━━━━━━━━━━━━━",
      `• <b>ዋና ሂሳብ (ሊወጣ የሚችል):</b> <b>${balanceStr} ETB</b>`,
      `• <b>ዝቅተኛ የወጪ መጠን:</b> ${ADMIN_CONFIG.minWithdraw} ETB`,
      `• <b>የሚከፈልበት ስልክ ቁጥር:</b> <code>${user.phone}</code> (የተቆለፈ)`,
      "• <b>የክፍያ ጊዜ:</b> ከ 5 እስከ 15 ደቂቃዎች ውስጥ",
      "━━━━━━━━━━━━━━━━━━━━",
      `ወጪ ለማዘዝ ለአድሚን <b>${ADMIN_CONFIG.supportUsername}</b> መልእክት ይላኩ።`,
    ].join("\n");

    const withInline = {
      inline_keyboard: [
        [{ text: "📤 ወጪ ለማዘዝ አድሚንን ያነጋግሩ", url: `https://t.me/${ADMIN_CONFIG.supportUsername.replace("@", "")}` }],
        [{ text: "🔙 ወደ ዋሌት ተመለስ", callback_data: "cmd_wallet" }],
      ],
    };

    await sendMessage(chatId, withMsg, withInline);
    return;
  }

  // 10. Profile
  if (text.includes("ፕሮፋይል") || text === "/profile") {
    const msg = [
      "👤 <b>የተጠቃሚ ፕሮፋይል (Profile)</b>",
      "━━━━━━━━━━━━━━━━━━━━",
      `• <b>ስም:</b> ${userName}`,
      `• <b>የቴሌግራም ID:</b> <code>${userId}</code>`,
      `• <b>ስልክ:</b> <code>${user.phone}</code> ✅`,
      `• <b>የይለፍ ቃል:</b> <code>${user.password || "******"}</code>`,
      "• <b>የአካውንት ደረጃ:</b> ቪአይፒ (VIP Player) ⭐",
    ].join("\n");
    await sendMessage(chatId, msg, getMainPersistentKeyboard(user));
    return;
  }

  // 11. Support & Help
  if (text === "/help" || text.includes("እርዳታ") || text.includes("ድጋፍ")) {
    const msg = `🆘 <b>የደንበኞች ድጋፍ እና እርዳታ</b>\n\nማንኛውም ጥያቄ ወይም ችግር ካለዎት አድሚናችንን ያነጋግሩ፦\n👉 <b>${ADMIN_CONFIG.supportUsername}</b>`;
    await sendMessage(chatId, msg, getMainPersistentKeyboard(user));
    return;
  }

  // 12. ADMIN DASHBOARD & OVERALL HISTORY (/admin)
  if (text === "/admin") {
    if (userId !== ADMIN_CONFIG.adminTelegramId) {
      await sendMessage(chatId, "⛔️ ይህ ገጽ ለአድሚን ብቻ የተፈቀደ ነው!");
      return;
    }

    const state = getMasterRoomState();
    const presence = getOnlinePresenceStats();
    const adminHist = await getAdminOverallHistory(10, 1);

    const histList = adminHist.items.map((it) => {
      const d = new Date(it.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      return `• <b>${it.userName}</b>: ${it.eventType} ${it.amount ? `(${it.amount} ETB)` : ""} - ${d}`;
    }).join("\n");

    const adminMsg = [
      "🛡 <b>አድሚን ዳሽቦርድ (ADMIN OVERVIEW)</b>",
      "━━━━━━━━━━━━━━━━━━━━",
      `🟢 <b>ኦንላይን ተጫዋቾች:</b> <b>${presence.onlinePlayers}</b>`,
      `🎮 <b>በአሁኑ ዙር:</b> #${state.roundId} | ደረጃ: ${state.phase}`,
      `🎟 <b>የተያዙ ካርቴላዎች:</b> ${state.totalRoomTickets}`,
      `💰 <b>የዙሩ ጃክፖት:</b> ${state.jackpot.toFixed(2)} ETB`,
      "━━━━━━━━━━━━━━━━━━━━",
      "📋 <b>የቅርብ ጊዜ እንቅስቃሴዎች (Recent Activities):</b>",
      histList || "<i>ምንም እንቅስቃሴ የለም</i>",
      "━━━━━━━━━━━━━━━━━━━━",
    ].join("\n");

    const adminButtons = {
      inline_keyboard: [
        [{ text: "⚡️ ዙሩን አሁን አስጀምር (Force Start)", callback_data: "adm_start_now" }],
        [{ text: "🔄 አድስ", callback_data: "adm_refresh" }],
      ],
    };

    await sendMessage(chatId, adminMsg, adminButtons);
    return;
  }

  // Default Fallback
  const defaultMsg = `ሰላም ${userName}፣ ከታች ያሉትን አማራጮች በመጠቀም ጨዋታውን ይጀምሩ፦`;
  const defaultKeyboard = {
    inline_keyboard: [
      [{ text: "🎮 ጌም ይጫወቱ (Play Bingo)", callback_data: "cmd_lobby" }],
      [{ text: "🎟 ካርቴላ ይምረጡ (Select Cartela)", callback_data: "cmd_cards" }],
    ],
  };
  await sendMessage(chatId, defaultMsg, defaultKeyboard);
}

// Forward Deposit Screenshot to Admin
async function forwardDepositToAdmin(user, update) {
  const textMsg = update.message.text || "(ደረሰኝ / ስክሪንሾት)";
  const adminNotification = [
    "📥 <b>አዲስ የገንዘብ ገቢ (Deposit) ደረሰኝ!</b>",
    "━━━━━━━━━━━━━━━━━━",
    `👤 <b>ተጫዋች:</b> ${user.name}`,
    `🆔 <b>የቴሌግራም ID:</b> <code>${user.userId}</code>`,
    `📱 <b>ስልክ:</b> <code>${user.phone || "አልተገኘም"}</code>`,
    `💵 <b>ዋና ሂሳብ:</b> ${(user.balance || 0).toFixed(2)} ETB`,
    `🎁 <b>መጫወቻ ሂሳብ:</b> ${(user.bonus || 0).toFixed(2)} ETB`,
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
      caption: `📸 ደረሰኝ ከ ${user.name} (${user.userId})`,
    });
  }

  // Log pending deposit
  await logPlayerHistory({
    userId: user.userId,
    userName: user.name,
    eventType: "DEPOSIT",
    paymentMethod: "Telebirr / CBE",
    status: "pending",
    description: `ደረሰኝ ለአድሚን ተልኳል: ${textMsg.substring(0, 40)}`,
  });

  const confirmUser = [
    "✅ <b>ደረሰኝዎ በቀጥታ ለአድሚን ተላልፏል!</b>",
    "",
    "የሂሳብ ባለሙያዎቻችን በ 2 ደቂቃ ውስጥ አረጋግጠው ዋሌትዎ ላይ ይጨምሩልዎታል።",
    "እናመሰግናለን!",
  ].join("\n");
  await sendMessage(user.userId, confirmUser, getMainPersistentKeyboard(user));
}

// ==========================================================
// 10. REAL-TIME TICKER & CALLING PHASE GAME ENGINE
// ==========================================================
let lastCallingBallCount = -1;
let lastAnnouncedRoundId = -1;

setInterval(async () => {
  const state = getMasterRoomState();

  // SSE Broadcast
  broadcastMasterState({ type: "TICK", phase: state.phase, countdown: state.countdown });

  // During CALLING Phase: update in-game players in Telegram every ball
  if (state.phase === "game") {
    const ballsCount = state.drawnBalls.length;
    if (ballsCount !== lastCallingBallCount && ballsCount > 0) {
      lastCallingBallCount = ballsCount;
      const currentBallNum = state.drawnBalls[0];
      const letter = getBallLetter(currentBallNum);
      const ballsHistory = state.drawnBalls.slice(0, 10).map((b) => `${getBallLetter(b)}-${b}`).join(", ");

      const roundData = getOrCreateBotRound(state.roundId);

      for (const [uid, session] of activeTelegramSessions.entries()) {
        if (!session.chatId) continue;

        // Check if player has tickets in this round
        const playerTickets = [];
        for (const [cn, info] of roundData.tickets.entries()) {
          if (info.userId === uid) playerTickets.push(cn);
        }

        if (playerTickets.length > 0 && session.messageId) {
          const firstTicket = playerTickets[0];
          const { matchedCount } = formatCartelaBoard(firstTicket, state.drawnBalls);

          const liveGameMsg = [
            `🎮 <b>ፊኒክስ ቢንጎ - የቀጥታ ዙር #${state.roundId}</b> 🔴`,
            "━━━━━━━━━━━━━━━━━━━━",
            `🎯 <b>የአሁኑ እጣ:</b> 🟡 <b>[${letter}-${currentBallNum}]</b>`,
            `🔢 <b>የተጠሩ እጣዎች (${ballsCount}/20):</b>`,
            `<i>${ballsHistory}</i>`,
            "━━━━━━━━━━━━━━━━━━━━",
            `🎟 <b>የእርስዎ ካርቴላ: #${firstTicket}</b> (የተመሳከሩ: <b>${matchedCount}/5</b>)`,
            `💰 <b>የዙሩ ጃክፖት:</b> <b>${state.jackpot.toFixed(2)} ETB</b>`,
            "━━━━━━━━━━━━━━━━━━━━",
            `⏱ ቀጣይ እጣ በ 2.5 ሰከንድ ውስጥ ይወጣል...`,
          ].join("\n");

          const inGameKeyboard = {
            inline_keyboard: [
              [{ text: `👀 ካርቴላ #${firstTicket}ን በሙሉ ስክሪን እይ`, callback_data: `mycard_${firstTicket}` }],
            ],
          };

          try {
            await editMessageText(session.chatId, session.messageId, liveGameMsg, inGameKeyboard);
          } catch {
            // Silently ignore if unchanged
          }
        }
      }
    }
  }

  // When round transitions to next
  if (state.phase === "lobby" && lastAnnouncedRoundId !== state.roundId) {
    lastAnnouncedRoundId = state.roundId;
    lastCallingBallCount = -1;
  }
}, 1000);

// ==========================================================
// 11. SSE & HTTP HEALTH-CHECK SERVER (For WebApp & Render)
// ==========================================================
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

http.createServer((req, res) => {
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
    req.on("end", async () => {
      try {
        const body = JSON.parse(bodyStr || "{}");
        const currentState = getMasterRoomState();
        const user = await getOrCreateUser(body.userId, body.userName);
        const result = await atomicReserveCard(currentState.roundId, body.ticketNum, user);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
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
    req.on("end", async () => {
      try {
        const body = JSON.parse(bodyStr || "{}");
        const currentState = getMasterRoomState();
        const result = await atomicReleaseCard(currentState.roundId, body.ticketNum, body.userId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("🦅 Phoenix Bingo True Real-Time Online Multiplayer Telegram Bot Server is Running 24/7!\n");
}).listen(PORT, () => {
  console.log(`🚀 Phoenix Bingo Live Server listening on port ${PORT}`);
});

// ==========================================================
// 12. TELEGRAM BOT POLLING ENGINE
// ==========================================================
let offset = 0;
async function pollUpdates() {
  console.log("🦅 Phoenix Bingo Bot: True Multiplayer Telegram Engine Active with 550 Cartelas & Atomic Locks!");
  await getDatabase();

  while (true) {
    try {
      const data = await telegramRequest("getUpdates", { offset: offset, timeout: 25 });
      if (data && data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await handleUpdate(update);
        }
      }
    } catch (err) {
      console.error("Telegram Polling Error:", err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

pollUpdates();
