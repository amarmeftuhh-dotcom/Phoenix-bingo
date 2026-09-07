/**
 * Phoenix Bingo - Full Production Telegram Bot Server (bot.js)
 * 
 * • Channel Force Join ሙሉ ለሙሉ ተሰርዟል (No Channel Join Required!)
 * • WebApp Link: https://phoenix-bingo.onrender.com/#home
 * • Auto-Login & Phone Registration ዝግጁ ሆኗል
 */

const fs = require("fs");
const path = require("path");

// 1. የቦት TOKEN እና የእርስዎ ኦፊሴላዊ የ Render ሊንክ
const BOT_TOKEN = process.env.BOT_TOKEN || "8606075616:AAEFVgE-_lIz33iYUBB6fzcWYPwXOm4f72g";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://phoenix-bingo.onrender.com/#home";

// 2. የአድሚን እና የክፍያ መረጃዎች
const PAYMENT_INFO = {
  telebirr: "+251956998368",
  cbe: "+251956998368",
  supportAdmin: "@Phonix_s",
  adminId: process.env.ADMIN_ID || "Phonix_s",
  minWithdraw: "50",
  referralBonus: "10",
};

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const USERS_FILE = path.join(__dirname, "bot_users.json");

// የተጠቃሚዎች ዳታቤዝ ማንበቢያ
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Error reading bot_users.json:", err.message);
  }
  return {};
}

function saveUser(user) {
  try {
    const users = loadUsers();
    users[user.id] = {
      ...(users[user.id] || {}),
      ...user,
      lastSeen: new Date().toISOString(),
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
    return users[user.id];
  } catch (err) {
    console.error("Error saving user:", err.message);
  }
}

// መልእክት መላኪያ
async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

// ትዕዛዞችን ማስተናገጃ
async function handleUpdate(update) {
  let chatId, text, userName, userId, callbackId, contact;

  // 1. Inline Buttons (Callback)
  if (update.callback_query) {
    callbackId = update.callback_query.id;
    chatId = update.callback_query.message.chat.id;
    text = "/" + update.callback_query.data;
    userName = update.callback_query.from.first_name || "ተጫዋች";
    userId = update.callback_query.from.id;

    fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackId }),
    }).catch(() => {});
  } 
  // 2. የስልክ ቁጥር መላክ (Contact Sharing - Instant Login)
  else if (update.message && update.message.contact) {
    chatId = update.message.chat.id;
    userId = update.message.from.id;
    userName = [update.message.from.first_name, update.message.from.last_name].filter(Boolean).join(" ") || "ተጫዋች";
    contact = update.message.contact;

    const formattedPhone = contact.phone_number.startsWith("+") 
      ? contact.phone_number 
      : `+${contact.phone_number}`;

    saveUser({
      id: userId,
      name: userName,
      username: update.message.from.username ? `@${update.message.from.username}` : undefined,
      phone: formattedPhone,
      isVerified: true,
    });

    const successText = 
`✅ <b>የመግቢያ ማረጋገጫ ተሳክቷል! (Login Successful)</b>

👤 <b>ስም:</b> ${userName}
📱 <b>ስልክ:</b> <code>${formattedPhone}</code>
🆔 <b>መለያ:</b> <code>${userId}</code>

ምንም አይነት ቻናል መቀላቀል ሳያስፈልግዎት በቀጥታ መጫወት ይችላሉ! ከታች ያለውን ቁልፍ ይጫኑ።`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "🎮 ካርቴላ ቢንጎ ተጫወት (Play Bingo)",
            web_app: { url: WEBAPP_URL },
          },
        ],
        [
          {
            text: "🌐 በብሮውዘር ክፈት (Open Link)",
            url: WEBAPP_URL,
          },
        ],
        [
          { text: "📥 ገንዘብ አስገባ (Deposit)", callback_data: "deposit" },
          { text: "💰 ሒሳብ ማረጋገጫ", callback_data: "account" },
        ],
      ],
    };

    await sendMessage(chatId, successText, keyboard);

    // ለአድሚን አሳውቅ
    const adminAlert = `👤 <b>አዲስ ተጫዋች ሎጊን አድርጓል!</b>\n• ስም: ${userName}\n• ስልክ: ${formattedPhone}\n• ID: <code>${userId}</code>`;
    sendMessage(PAYMENT_INFO.supportAdmin, adminAlert).catch(() => {});
    return;
  } 
  // 3. መደበኛ ጽሁፍ
  else if (update.message && update.message.text) {
    chatId = update.message.chat.id;
    text = update.message.text.trim();
    userName = [update.message.from.first_name, update.message.from.last_name].filter(Boolean).join(" ") || "ተጫዋች";
    userId = update.message.from.id;

    saveUser({
      id: userId,
      name: userName,
      username: update.message.from.username ? `@${update.message.from.username}` : undefined,
    });
  } else {
    return;
  }

  // --- /broadcast
  if (text.startsWith("/broadcast")) {
    const broadcastMsg = text.replace("/broadcast", "").trim();
    if (!broadcastMsg) {
      await sendMessage(chatId, "⚠️ <b>አጠቃቀም:</b> <code>/broadcast የሚፈልጉትን ጽሁፍ እዚህ ይጻፉ</code>");
      return;
    }

    const allUsers = loadUsers();
    const userIds = Object.keys(allUsers);
    await sendMessage(chatId, `🚀 <b>መልእክቱን ለ ${userIds.length} ተጠቃሚዎች ማስተላለፍ ተጀምሯል...</b>`);

    let sentCount = 0;
    for (const uId of userIds) {
      try {
        const fullMsg = `📢 <b>የፊኒክስ ቢንጎ የቀጥታ ማስታወቂያ</b>\n\n${broadcastMsg}\n\n🎮 <a href="${WEBAPP_URL}">አሁኑኑ ለመጫወት እዚህ ይጫኑ</a>`;
        await sendMessage(uId, fullMsg);
        sentCount++;
        await new Promise((r) => setTimeout(r, 60));
      } catch {}
    }
    await sendMessage(chatId, `✅ <b>መልእክቱ ለ ${sentCount} ተጠቃሚዎች ደርሷል!</b>`);
    return;
  }

  // --- /stats
  if (text.startsWith("/stats") || text.startsWith("/users")) {
    const allUsers = loadUsers();
    const userIds = Object.keys(allUsers);
    const verifiedCount = Object.values(allUsers).filter((u) => u.isVerified).length;

    const statsText = 
`📊 <b>የፊኒክስ ቢንጎ ቦት ስታትስቲክስ</b>

• ጠቅላላ ተጫዋቾች: ${userIds.length}
• ስልካቸውን ያረጋገጡ: ${verifiedCount}
• Link: ${WEBAPP_URL}`;

    await sendMessage(chatId, statsText);
    return;
  }

  // --- /start ወይም /play (ያለ ምንም የቻናል ማስገደድ በቀጥታ ይከፍታል!)
  if (text.startsWith("/play") || text.startsWith("/start")) {
    const users = loadUsers();
    const currentUser = users[userId];
    const isVerified = currentUser && currentUser.phone;

    const welcomeText = 
`🇪🇹 <b>እንኳን ወደ ፊኒክስ ቢንጎ በደህና መጡ!</b> 🎮

የቀጥታ ካርቴላ ቢንጎ ይጫወቱ፣ ትልቅ ጃክፖት ያሸንፉ!
በቴሌብር እና በኢትዮጵያ ንግድ ባንክ ፈጣን ገቢና ወጪ ክፍያ።

${!isVerified 
  ? "👉 <b>ለመግባት (Login)፦</b> ከታች ያለውን <b>'📲 ስልክ ቁጥርዎን ያጋሩ (Login)'</b> የሚለውን ይጫኑ።" 
  : `✅ <b>እንኳን ደህና መጡ ${userName}! መለያዎ ክፍት ነው።</b>`}`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: "🎮 ካርቴላ ቢንጎ ተጫወት (Play Bingo)",
            web_app: { url: WEBAPP_URL },
          },
        ],
        [
          {
            text: "🌐 በብሮውዘር ክፈት (Open in Browser)",
            url: WEBAPP_URL,
          },
        ],
        [
          { text: "💰 ሒሳብ ማረጋገጫ", callback_data: "account" },
          { text: "📥 ገንዘብ አስገባ", callback_data: "deposit" },
        ],
        [
          { text: "🤝 ጓደኛ ይጋብዙ", callback_data: "referral" },
          { text: "ℹ️ እርዳታ", callback_data: "help" },
        ],
      ],
    };

    if (!isVerified) {
      const replyKeyboard = {
        keyboard: [
          [
            {
              text: "📲 ስልክ ቁጥርዎን ያጋሩ (Login)",
              request_contact: true,
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      };
      await sendMessage(chatId, welcomeText, replyKeyboard);
      await sendMessage(chatId, "👇 <b>ወይም በቀጥታ ወደ ጨዋታው ለመግባት፦</b>", inlineKeyboard);
    } else {
      await sendMessage(chatId, welcomeText, inlineKeyboard);
    }
    return;
  }

  // --- /deposit
  if (text.startsWith("/deposit")) {
    const depositText = 
`📥 <b>ገንዘብ ወደ አካውንትዎ ገቢ ማድረጊያ</b>

📱 <b>ቴሌብር (Telebirr):</b>
ቁጥር: <code>${PAYMENT_INFO.telebirr}</code>

🏦 <b>የኢትዮጵያ ንግድ ባንክ (CBE):</b>
የሂሳብ ቁጥር: <code>${PAYMENT_INFO.cbe}</code>

⚠️ ገንዘቡን ካስተላለፉ በኋላ የደረሰኝ ስክሪንሾት ወይም የግብይት ቁጥሩን ለአድሚን <b>${PAYMENT_INFO.supportAdmin}</b> ይላኩ።`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "💬 ደረሰኝ ለአድሚን ለመላክ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, depositText, keyboard);
    return;
  }

  // --- /withdraw
  if (text.startsWith("/withdraw")) {
    const withdrawText = 
`📤 <b>ያሸነፉትን ገንዘብ ወጪ ማድረጊያ</b>

• ዝቅተኛ የወጪ መጠን: ${PAYMENT_INFO.minWithdraw} ETB
ገንዘብ ወጪ ለማድረግ የሚፈልጉትን የብር መጠን እና ስልክ ቁጥርዎን ለአድሚን <b>${PAYMENT_INFO.supportAdmin}</b> ይላኩ።`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "📤 ወጪ ለማዘዝ አድሚንን ያነጋግሩ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, withdrawText, keyboard);
    return;
  }

  // --- /help
  if (text.startsWith("/help")) {
    await sendMessage(chatId, `ℹ️ <b>ለእርዳታ አድሚናችንን ያነጋግሩ፦</b> ${PAYMENT_INFO.supportAdmin}`);
  }
}

// Polling
let offset = 0;
async function pollUpdates() {
  console.log("🤖 ቴሌግራም ቦት ስራ ጀምሯል... (No Channel Force-Join)");
  while (true) {
    try {
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=30`);
      const data = await res.json();
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await handleUpdate(update);
        }
      }
    } catch (err) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

pollUpdates();
