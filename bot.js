/**
 * Phoenix Bingo - Full Production Telegram Bot Server (bot.js)
 * 
 * ዋና ዋና አዳዲስ ማሻሻያዎች (Key Updates):
 * 1. 📲 ስልክ ቁጥር በአንድ ክሊክ ማጋራት (Auto-Login with Phone Verification)
 * 2. ⚡ የቀጥታ ማስታወቂያ ማስተላለፊያ (/broadcast <መልእክት>)
 * 3. 👥 የተጠቃሚዎች ዳታቤዝ (bot_users.json ላይ ቋሚ ማከማቻ)
 * 4. 💰 የዴፖዚት እና ዊዝድሮው ጥያቄዎችን ለአድሚን ማሳወቅ
 * 5. 👑 የአድሚን ትዕዛዞች (/stats, /users, /broadcast)
 */

const fs = require("fs");
const path = require("path");

// 1. የቦት TOKEN እና የዌብሳይት ሊንክ
const BOT_TOKEN = process.env.BOT_TOKEN || "8606075616:AAEFVgE-_lIz33iYUBB6fzcWYPwXOm4f72g";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://phoenix-bingo.onrender.com";

// 2. የአድሚን እና የክፍያ መረጃዎች
const PAYMENT_INFO = {
  telebirr: "+251956998368",
  cbe: "+251956998368",
  supportAdmin: "@Phonix_s",
  adminId: process.env.ADMIN_ID || "Phonix_s", // የእርስዎ የቴሌግራም መለያ
  minWithdraw: "50",
  referralBonus: "10",
};

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const USERS_FILE = path.join(__dirname, "bot_users.json");

// --- የተጠቃሚዎችን መረጃ ማስቀመጫ እና ማንበቢያ ---
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf8");
      return JSON.parse(raw);
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

// መልእክት መላኪያ ፈንክሽን
async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
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

// ትዕዛዞችን እና መልእክቶችን ማስተናገጃ
async function handleUpdate(update) {
  let chatId, text, userName, userId, callbackId, contact;

  // 1. Inline Buttons Callback Query
  if (update.callback_query) {
    callbackId = update.callback_query.id;
    chatId = update.callback_query.message.chat.id;
    text = "/" + update.callback_query.data;
    userName = update.callback_query.from.first_name || "ተጫዋች";
    userId = update.callback_query.from.id;

    // Spinner እንዲቆም ፈጣን መልስ
    fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackId }),
    }).catch(() => {});
  } 
  // 2. የተጠቃሚ ስልክ ቁጥር ሲላክ (Contact Sharing)
  else if (update.message && update.message.contact) {
    chatId = update.message.chat.id;
    userId = update.message.from.id;
    userName = [update.message.from.first_name, update.message.from.last_name].filter(Boolean).join(" ") || "ተጫዋች";
    contact = update.message.contact;

    const formattedPhone = contact.phone_number.startsWith("+") 
      ? contact.phone_number 
      : `+${contact.phone_number}`;

    // ተጠቃሚውን መዝግብ
    saveUser({
      id: userId,
      name: userName,
      username: update.message.from.username ? `@${update.message.from.username}` : undefined,
      phone: formattedPhone,
      isVerified: true,
    });

    const successText = 
`🎉 <b>እንኳን ደስ አለዎት ${userName}! ስልክ ቁጥርዎ በተሳካ ሁኔታ ተረጋግጧል።</b>

📱 <b>ስልክ ቁጥር:</b> <code>${formattedPhone}</code>
🆔 <b>የተጠቃሚ መለያ:</b> <code>${userId}</code>

አሁን ያለምንም ፓስወርድ በቀጥታ ወደ ጨዋታው መግባት ይችላሉ! ከታች ያለውን <b>"🎮 ካርቴላ ቢንጎ ተጫወት"</b> የሚለውን ይጫኑ።`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "🎮 ካርቴላ ቢንጎ ተጫወት (Play Bingo)",
            web_app: { url: WEBAPP_URL },
          },
        ],
        [
          { text: "💰 ሒሳብ ማረጋገጫ", callback_data: "account" },
          { text: "📥 ገንዘብ አስገባ", callback_data: "deposit" },
        ],
      ],
    };

    await sendMessage(chatId, successText, keyboard);

    // ለአድሚን አዲስ ተጠቃሚ እንደተመዘገበ አሳውቅ
    const adminAlert = `👤 <b>አዲስ ተጫዋች በስልክ ቁጥር ተመዝግቧል!</b>\n\n• ስም: ${userName}\n• ስልክ: ${formattedPhone}\n• ID: <code>${userId}</code>`;
    sendMessage(PAYMENT_INFO.supportAdmin, adminAlert).catch(() => {});
    return;
  } 
  // 3. መደበኛ የጽሁፍ መልእክት ሲላክ
  else if (update.message && update.message.text) {
    chatId = update.message.chat.id;
    text = update.message.text.trim();
    userName = [update.message.from.first_name, update.message.from.last_name].filter(Boolean).join(" ") || "ተጫዋች";
    userId = update.message.from.id;

    // መረጃውን መዝግብ
    saveUser({
      id: userId,
      name: userName,
      username: update.message.from.username ? `@${update.message.from.username}` : undefined,
    });
  } else {
    return;
  }

  console.log(`[Command received] from ${userName} (${userId}): ${text}`);

  // --- 👑 የአድሚን ልዩ ትዕዛዞች (ADMIN COMMANDS) ---
  const isSenderAdmin = 
    String(userId) === String(PAYMENT_INFO.adminId) || 
    update.message?.from?.username?.toLowerCase() === PAYMENT_INFO.supportAdmin.replace("@", "").toLowerCase() ||
    update.callback_query?.from?.username?.toLowerCase() === PAYMENT_INFO.supportAdmin.replace("@", "").toLowerCase();

  // /broadcast <መልእክት> - ለሁሉም ተጠቃሚዎች በአንድ ጊዜ ማስተላለፊያ
  if (text.startsWith("/broadcast")) {
    const broadcastMsg = text.replace("/broadcast", "").trim();
    if (!broadcastMsg) {
      await sendMessage(chatId, "⚠️ <b>አጠቃቀም:</b> <code>/broadcast የሚፈልጉትን መልእክት እዚህ ይጻፉ</code>");
      return;
    }

    const allUsers = loadUsers();
    const userIds = Object.keys(allUsers);
    await sendMessage(chatId, `🚀 <b>መልእክቱን ለ ${userIds.length} ተጠቃሚዎች ማስተላለፍ ተጀምሯል...</b>`);

    let sentCount = 0;
    for (const uId of userIds) {
      try {
        const fullMsg = `📢 <b>የፊኒክስ ቢንጎ የቀጥታ ማስታወቂያ</b>\n\n${broadcastMsg}\n\n🎮 <a href="${WEBAPP_URL}">አሁኑኑ ጌሙን ለመክፈት እዚህ ይጫኑ</a>`;
        await sendMessage(uId, fullMsg);
        sentCount++;
        await new Promise((r) => setTimeout(r, 60)); // Rate limiting
      } catch {}
    }

    await sendMessage(chatId, `✅ <b>መልእክቱ በተሳካ ሁኔታ ለ ${sentCount} ተጠቃሚዎች ተበትኗል!</b>`);
    return;
  }

  // /stats ወይም /users (የተጠቃሚዎች ብዛት ማሳያ)
  if (text.startsWith("/stats") || text.startsWith("/users")) {
    const allUsers = loadUsers();
    const userIds = Object.keys(allUsers);
    const verifiedCount = Object.values(allUsers).filter((u) => u.isVerified).length;

    const statsText = 
`📊 <b>የፊኒክስ ቢንጎ ቦት ስታትስቲክስ</b>

• <b>ጠቅላላ የተመዘገቡ ተጫዋቾች:</b> ${userIds.length}
• <b>በስልክ ቁጥር ያረጋገጡ:</b> ${verifiedCount}
• <b>የቦት ሁኔታ:</b> ንቁ (Active 🟢)
• <b>Mini App Link:</b> ${WEBAPP_URL}`;

    await sendMessage(chatId, statsText);
    return;
  }

  // --- 🎮 የተጫዋቾች መደበኛ ትዕዛዞች ---

  // 1. /start ወይም /play (ጌም ይጫወቱ + የስልክ ቁጥር ማጋሪያ ቁልፍ)
  if (text.startsWith("/play") || text.startsWith("/start")) {
    const users = loadUsers();
    const currentUser = users[userId];
    const isVerified = currentUser && currentUser.phone;

    const welcomeText = 
`🇪🇹 <b>እንኳን ወደ ፊኒክስ ቢንጎ በደህና መጡ፣ ${userName}!</b> 🎮

ፈጣን የቀጥታ ካርቴላ ቢንጎ ይጫወቱ፣ ትልቅ ጃክፖት ያሸንፉ! 
በቴሌብር እና በንግድ ባንክ ፈጣን ገቢ እና ወጪ ክፍያ ያግኙ።

${!isVerified ? "👉 <b>ለፈጣን ምዝገባና አውቶ-ሎጂን ከታች ያለውን '📲 ስልክ ቁጥርዎን ያጋሩ' የሚለውን ይጫኑ!</b>" : "✅ <b>መለያዎ የተረጋገጠ ነው። ከታች ባለው ቁልፍ መጫወት ይችላሉ!</b>"}`;

    // Inline Buttons (ጨዋታውን ለመክፈት)
    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: "🎮 ካርቴላ ቢንጎ ተጫወት (Play Bingo)",
            web_app: { url: WEBAPP_URL },
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

    // ተጠቃሚው ስልክ ቁጥሩን ካላጋራ ከታች የስልክ ቁጥር መላኪያ ቁልፍ እንሰጠዋለን
    if (!isVerified) {
      const replyKeyboard = {
        keyboard: [
          [
            {
              text: "📲 ስልክ ቁጥርዎን ያጋሩ (Auto-Login)",
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

  // 2. /account (ሂሳብ ማረጋገጫ)
  if (text.startsWith("/account")) {
    const users = loadUsers();
    const user = users[userId] || {};

    const accountText = 
`👤 <b>የተጠቃሚ መለያ እና ሒሳብ ማረጋገጫ</b>

• <b>ስም:</b> ${userName}
• <b>የቴሌግራም መለያ (ID):</b> <code>${userId}</code>
• <b>ስልክ:</b> <code>${user.phone || "ያልተያያዘ (Not linked)"}</code>
• <b>የጨዋታ ሁኔታ:</b> ንቁ (Active) ✅

<i>ሙሉ የካርቴላ ታሪክዎን እና የቀጥታ ጨዋታውን ለማየት ከታች ጌሙን ይክፈቱ።</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "🎮 ወደ ጨዋታው ሂድ",
            web_app: { url: WEBAPP_URL },
          },
        ],
        [
          { text: "📥 ገቢ አድርግ", callback_data: "deposit" },
          { text: "📤 ወጪ አድርግ", callback_data: "withdraw" },
        ],
      ],
    };

    await sendMessage(chatId, accountText, keyboard);
    return;
  }

  // 3. /deposit (ገቢ ማድረግ)
  if (text.startsWith("/deposit")) {
    const depositText = 
`📥 <b>ገንዘብ ወደ አካውንትዎ ገቢ ማድረጊያ መመሪያ</b>

የሚፈልጉትን የብር መጠን ከታች ባሉት የክፍያ አማራጮች ያስገቡ፦

📱 <b>ቴሌብር (Telebirr):</b>
ቁጥር: <code>${PAYMENT_INFO.telebirr}</code>

🏦 <b>የኢትዮጵያ ንግድ ባንክ (CBE):</b>
የሂሳብ ቁጥር: <code>${PAYMENT_INFO.cbe}</code>

⚠️ <b>ማሳሰቢያ፦</b>
ገንዘቡን ካስተላለፉ በኋላ የደረሰኝ ስክሪንሾት (Screenshot) ወይም የግብይት ቁጥሩን (Transaction ID) ከቴሌግራም መለያዎ (ID: <code>${userId}</code>) ጋር ለድጋፍ ሰጪያችን <b>${PAYMENT_INFO.supportAdmin}</b> ይላኩ። 

በ 2 ደቂቃ ውስጥ ወደ ዋሌትዎ ይገባል!`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "💬 ደረሰኝ ለአድሚን ለመላክ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
        [
          {
            text: "🎮 ጌም ክፈት",
            web_app: { url: WEBAPP_URL },
          },
        ],
      ],
    };

    await sendMessage(chatId, depositText, keyboard);
    return;
  }

  // 4. /withdraw (ወጪ ማድረግ)
  if (text.startsWith("/withdraw")) {
    const withdrawText = 
`📤 <b>ያሸነፉትን ገንዘብ ወጪ ማድረጊያ</b>

• <b>ዝቅተኛ የወጪ መጠን:</b> ${PAYMENT_INFO.minWithdraw} ETB
• <b>የክፍያ ጊዜ:</b> ከ 5 እስከ 15 ደቂቃዎች ውስጥ

ገንዘብ ወጪ ለማድረግ የሚፈልጉትን የብር መጠን እና የቴሌብር ቁጥርዎን ወይም የባንክ አካውንትዎን ለአድሚን <b>${PAYMENT_INFO.supportAdmin}</b> ይላኩ።`;

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

  // 5. /referral (ጓደኛ ይጋብዙ)
  if (text.startsWith("/referral")) {
    const botInfoRes = await fetch(`${TELEGRAM_API}/getMe`);
    const botInfo = await botInfoRes.json();
    const botUsername = botInfo.result?.username || "Phoenix_Bingo_Bot";

    const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;

    const referralText = 
`🤝 <b>ጓደኛዎን ይጋብዙ — ነፃ የቦነስ ብር ያግኙ!</b>

ለእያንዳንዱ የእርስዎን ሊንክ ተጠቅሞ ለሚመዘገብና ለሚጫወት ጓደኛ <b>${PAYMENT_INFO.referralBonus} ETB</b> ነፃ የካርቴላ መግዣ ቦነስ ያገኛሉ!

🔗 <b>የእርስዎ መጋበዣ ሊንክ፦</b>
<code>${refLink}</code>

ሊንኩን ኮፒ በማድረግ ለጓደኞችዎ ወይም ለግሩፖች ያጋሩ!`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "📤 ሊንኩን ለጓደኛ አጋራ (Share)",
            url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🔥 ና እዚህ ፈጣን የቀጥታ ካርቴላ ቢንጎ እንጫወት! አሁኑኑ ተመዝገብና የነፃ ጉርሻ ተቀበል!")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, referralText, keyboard);
    return;
  }

  // 6. /help (እርዳታ እና ድጋፍ)
  if (text.startsWith("/help")) {
    const helpText = 
`ℹ️ <b>የፊኒክስ ቢንጎ እርዳታ እና ደንበኞች ድጋፍ</b>

• <b>የጨዋታ ህግ:</b> በየ 45 ሰከንዱ አዳዲስ ዙሮች ይጀመራሉ። ካርቴላ ይመርጣሉ፣ የወጡትን ቁጥሮች ያመሳክራሉ፣ መስመር ሲሞላ ቢንጎ ብለው ያሸንፋሉ!
• <b>ተቀማጭ እና ወጪ:</b> በቴሌብር እና በኢትዮጵያ ንግድ ባንክ 24/7 ፈጣን አገልግሎት ይሰጣል።

ለማንኛውም ጥያቄ ወይም ችግር አድሚናችንን ያነጋግሩ፦
👉 <b>${PAYMENT_INFO.supportAdmin}</b>`;

    await sendMessage(chatId, helpText);
  }
}

// Telegram Bot Polling loop
let offset = 0;
async function pollUpdates() {
  console.log("🤖 ቴሌግራም ቦት ስራ ጀምሯል... ትዕዛዞችን በመጠባበቅ ላይ!");

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
      console.error("Polling error, retrying in 3 seconds...", err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// ጀምር
pollUpdates();
