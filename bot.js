/**
 * Phoenix Bingo - Full Production Telegram Bot Server (bot.js)
 * Matching the exact UI/UX from the reference screenshot
 */

const fs = require("fs");
const path = require("path");

// 1. የቦት Token እና የጨዋታው የቀጥታ አድራሻ
const BOT_TOKEN = process.env.BOT_TOKEN || "8606075616:AAEFVgE-_lIz33iYUBB6fzcWYPwXOm4f72g";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://phoenix-bingo.onrender.com/#home";

// 2. የአድሚን እና የክፍያ መረጃዎች
const PAYMENT_INFO = {
  telebirr: "+251956998368",
  cbe: "+251956998368",
  supportAdmin: "@Phonix_s",
  channelLink: "https://t.me/Phonix_s",
  minWithdraw: "50",
  referralBonus: "10",
};

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const USERS_FILE = path.join(__dirname, "bot_users.json");

// የተጠቃሚዎች ዳታቤዝ
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

// 📱 በፎቶው ላይ የሚታየው ትክክለኛ የቁልፍ ሰሌዳ (Exact Layout from Screenshot)
const MAIN_KEYBOARD = {
  keyboard: [
    [
      {
        text: "🎮 ጌም ይጫወቱ (PLAY)",
        web_app: { url: WEBAPP_URL },
      },
    ],
    [
      { text: "👤 ፕሮፋይል" },
      { text: "💰 ሂሳብ" },
    ],
    [
      { text: "📥 ገቢ (Deposit)" },
      { text: "📤 ወጪ (Withdraw)" },
    ],
    [
      { text: "🔗 ጋብዝ & አግኝ" },
      { text: "🗣 ድርጅቱን አስተዋውቅ" },
    ],
    [
      { text: "📖 መመሪያ" },
      { text: "🆘 እርዳታ" },
      { text: "📜 ደንቦች" },
    ],
    [
      { text: "🌐 ቋንቋ (Language)" },
    ],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

// መልእክት መላኪያ
async function sendMessage(chatId, text, replyMarkup = MAIN_KEYBOARD) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    };

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

// በቴሌግራም ሜኑ ላይ ትዕዛዞችን በራስ-ሰር መመዝገቢያ (Set Bot Commands)
async function registerBotCommands() {
  try {
    const commands = [
      { command: "play", description: "🎮 ጌም ይጫወቱ" },
      { command: "account", description: "💰 ሂሳብ ማረጋገጫ" },
      { command: "deposit", description: "📥 ገቢ ማድረግ" },
      { command: "withdraw", description: "📤 ወጪ ማድረግ" },
      { command: "referral", description: "🤝 ጓደኛ ይጋብዙ" },
      { command: "help", description: "🆘 እርዳታ" },
    ];
    await fetch(`${TELEGRAM_API}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
    console.log("✅ Bot Menu Commands Registered Successfully!");
  } catch (err) {
    console.error("Error setting commands:", err.message);
  }
}

// ትዕዛዞችን ማስተናገጃ
async function handleUpdate(update) {
  let chatId, text, userName, userId, callbackId;

  if (update.callback_query) {
    callbackId = update.callback_query.id;
    chatId = update.callback_query.message.chat.id;
    text = update.callback_query.data;
    userName = update.callback_query.from.first_name || "ተጫዋች";
    userId = update.callback_query.from.id;

    fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackId }),
    }).catch(() => {});
  } else if (update.message && update.message.text) {
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

  console.log(`[Action] ${userName} (${userId}): ${text}`);

  // 1. 🎮 ጌም ይጫወቱ (/play ወይም በተኑን ሲነኩ)
  if (text === "/play" || text === "/start" || text.includes("ጌም ይጫወቱ")) {
    const welcomeText = 
`🇪🇹 <b>እንኳን ወደ ፊኒክስ ቢንጎ በደህና መጡ፣ ${userName}!</b> 🎮

የቀጥታ ካርቴላ ቢንጎ ይጫወቱ፣ ትልቅ ጃክፖት ያሸንፉ! 
በቴሌብር እና በኢትዮጵያ ንግድ ባንክ ፈጣን ገቢና ወጪ ክፍያ።

👇 <b>ከታች ያለውን ሰማያዊ ቁልፍ በመንካት ጨዋታውን ይጀምሩ፦</b>`;

    const inlinePlay = {
      inline_keyboard: [
        [
          {
            text: "🎮 ካርቴላ ቢንጎ ተጫወት (OPEN GAME)",
            web_app: { url: WEBAPP_URL },
          },
        ],
        [
          {
            text: "🌐 በብሮውዘር ክፈት",
            url: WEBAPP_URL,
          },
        ],
      ],
    };

    await sendMessage(chatId, welcomeText, inlinePlay);
    return;
  }

  // 2. 👤 ፕሮፋይል
  if (text === "👤 ፕሮፋይል") {
    const users = loadUsers();
    const u = users[userId] || {};
    const profileText = 
`👤 <b>የተጠቃሚ ፕሮፋይል (Profile)</b>

• <b>ስም:</b> ${userName}
• <b>የቴሌግራም ID:</b> <code>${userId}</code>
• <b>መለያ ስም:</b> ${u.username || "የለም"}
• <b>የአካውንት ደረጃ:</b> ቪአይፒ (VIP Player) ⭐
• <b>ሁኔታ:</b> ንቁ (Active) ✅`;

    await sendMessage(chatId, profileText);
    return;
  }

  // 3. 💰 ሂሳብ (/account ወይም "💰 ሂሳብ")
  if (text === "/account" || text === "💰 ሂሳብ") {
    const accountText = 
`💰 <b>የሂሳብ ማረጋገጫ (Wallet Balance)</b>

• <b>የዋሌት ሂሳብ:</b> 0.00 ETB
• <b>የቦነስ ሂሳብ:</b> 0.00 ETB
• <b>ያሸነፉት ጠቅላላ:</b> 0.00 ETB

<i>ገንዘብ ገቢ ለማድረግ ከታች <b>"📥 ገቢ (Deposit)"</b> የሚለውን ይጫኑ።</i>`;

    const inlineAccount = {
      inline_keyboard: [
        [
          { text: "📥 ገቢ አድርግ", callback_data: "/deposit" },
          { text: "📤 ወጪ አድርግ", callback_data: "/withdraw" },
        ],
      ],
    };

    await sendMessage(chatId, accountText, inlineAccount);
    return;
  }

  // 4. 📥 ገቢ (Deposit) (/deposit)
  if (text === "/deposit" || text.includes("ገቢ")) {
    const depositText = 
`📥 <b>ገንዘብ ወደ አካውንትዎ ገቢ ማድረጊያ</b>

የሚፈልጉትን የብር መጠን ከታች ባሉት የክፍያ አማራጮች ያስገቡ፦

📱 <b>ቴሌብር (Telebirr):</b>
ቁጥር: <code>${PAYMENT_INFO.telebirr}</code>

🏦 <b>የኢትዮጵያ ንግድ ባንክ (CBE):</b>
የሂሳብ ቁጥር: <code>${PAYMENT_INFO.cbe}</code>

⚠️ <b>ማሳሰቢያ፦</b>
ገንዘቡን ካስተላለፉ በኋላ የደረሰኝ ስክሪንሾት ወይም የግብይት ቁጥሩን ከቴሌግራም መለያዎ (ID: <code>${userId}</code>) ጋር ለድጋፍ ሰጪያችን <b>${PAYMENT_INFO.supportAdmin}</b> ይላኩ። በ 2 ደቂቃ ውስጥ ይገባልዎታል!`;

    const inlineDeposit = {
      inline_keyboard: [
        [
          {
            text: "💬 ደረሰኝ ለአድሚን ለመላክ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, depositText, inlineDeposit);
    return;
  }

  // 5. 📤 ወጪ (Withdraw) (/withdraw)
  if (text === "/withdraw" || text.includes("ወጪ")) {
    const withdrawText = 
`📤 <b>ያሸነፉትን ገንዘብ ወጪ ማድረጊያ</b>

• <b>ዝቅተኛ የወጪ መጠን:</b> ${PAYMENT_INFO.minWithdraw} ETB
• <b>የክፍያ ጊዜ:</b> ከ 5 እስከ 15 ደቂቃዎች ውስጥ

ገንዘብ ወጪ ለማድረግ የሚፈልጉትን የብር መጠን እና የቴሌብር ቁጥርዎን ወይም የባንክ አካውንትዎን ለአድሚን <b>${PAYMENT_INFO.supportAdmin}</b> ይላኩ።`;

    const inlineWithdraw = {
      inline_keyboard: [
        [
          {
            text: "📤 ወጪ ለማዘዝ አድሚንን ያነጋግሩ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, withdrawText, inlineWithdraw);
    return;
  }

  // 6. 🔗 ጋብዝ & አግኝ (/referral)
  if (text === "/referral" || text.includes("ጋብዝ") || text.includes("ጓደኛ")) {
    const refLink = `https://t.me/Phoenix_Bingo_Bot?start=ref_${userId}`;

    const refText = 
`🤝 <b>ጓደኛዎን ይጋብዙ — ነፃ ቦነስ ያግኙ!</b>

ለእያንዳንዱ የእርስዎን ሊንክ ተጠቅሞ ለሚመዘገብና ለሚጫወት ጓደኛ <b>${PAYMENT_INFO.referralBonus} ETB</b> ነፃ የካርቴላ መግዣ ቦነስ ያገኛሉ!

🔗 <b>የእርስዎ መጋበዣ ሊንክ፦</b>
<code>${refLink}</code>`;

    const inlineShare = {
      inline_keyboard: [
        [
          {
            text: "📤 ሊንኩን ለጓደኛ አጋራ (Share)",
            url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🔥 ና እዚህ ፈጣን የቀጥታ ካርቴላ ቢንጎ እንጫወት!")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, refText, inlineShare);
    return;
  }

  // 7. 🗣 ድርጅቱን አስተዋውቅ
  if (text === "🗣 ድርጅቱን አስተዋውቅ") {
    const promoText = 
`🦅 <b>ስለ ፊኒክስ ቢንጎ (About Phoenix Bingo)</b>

ፊኒክስ ቢንጎ በኢትዮጵያ ውስጥ ፈጣን፣ አስተማማኝ እና ፍትሃዊ የቀጥታ የካርቴላ ቢንጎ ጨዋታ መድረክ ነው። 
• 24/7 ፈጣን የቴሌብር እና የባንክ ክፍያዎች
• ትላልቅ የጃክፖት ሽልማቶች
• ግልፅ እና ፍትሃዊ የቁጥር እጣ አወጣጥ`;

    await sendMessage(chatId, promoText);
    return;
  }

  // 8. 📖 መመሪያ
  if (text === "📖 መመሪያ") {
    const guideText = 
`📖 <b>የካርቴላ ቢንጎ አጨዋወት መመሪያ</b>

1. <b>ካርቴላ ይምረጡ፦</b> ጨዋታው ከመጀመሩ በፊት የሚፈልጉትን የካርቴላ ቁጥር ይግዙ።
2. <b>ቁጥሮችን ይከታተሉ፦</b> በየ 3 ሰከንዱ የሚወጡትን እጣ ቁጥሮች በካርቴላዎ ላይ ያመሳክሩ።
3. <b>ቢንጎ ይበሉ፦</b> የካርቴላዎ ረድፍ (መስመር) ሲሞላ "BINGO" የሚለውን በመጫን አሸናፊ ይሁኑ!`;

    await sendMessage(chatId, guideText);
    return;
  }

  // 9. 🆘 እርዳታ (/help)
  if (text === "/help" || text === "🆘 እርዳታ") {
    const helpText = 
`🆘 <b>የደንበኞች ድጋፍ እና እርዳታ መስጫ</b>

ማንኛውም ጥያቄ፣ አስተያየት ወይም በክፍያ ዙሪያ ችግር ካጋጠመዎት የ 24/7 የቴሌግራም አድሚናችንን ያነጋግሩ፦

👉 <b>${PAYMENT_INFO.supportAdmin}</b>`;

    await sendMessage(chatId, helpText);
    return;
  }

  // 10. 📜 ደንቦች
  if (text === "📜 ደንቦች") {
    const rulesText = 
`📜 <b>የፕላትፎርሙ ደንብ እና ግዴታዎች</b>

1. እድሜያቸው ከ 18 ዓመት በላይ ለሆኑ ብቻ የተፈቀደ ነው።
2. የተሳሳተ ወይም የሀሰት ደረሰኝ ማቅረብ ከአካውንት ያግዳል!
3. ያሸነፉት ገንዘብ ያለምንም ቅድመ ሁኔታ ወዲያውኑ ይከፈላል።`;

    await sendMessage(chatId, rulesText);
    return;
  }

  // 11. 🌐 ቋንቋ (Language)
  if (text === "🌐 ቋንቋ (Language)") {
    await sendMessage(chatId, "🇪🇹 <b>የአሁኑ ቋንቋ፦</b> አማርኛ (Amharic)\n<i>(English support coming soon!)</i>");
    return;
  }
}

// Polling loop
let offset = 0;
async function pollUpdates() {
  await registerBotCommands();
  console.log("🤖 ፊኒክስ ቢንጎ ቦት በስክሪንሾቱ አቀማመጥ መሰረት ስራ ጀምሯል!");

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
