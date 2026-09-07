/**
 * Phoenix Bingo - Full Production Telegram Bot Server (bot.js)
 * Matching the exact screenshot UI layout and handling all commands perfectly.
 */

const https = require("https");

// 1. የቦት Token እና የጨዋታ አድራሻ
const BOT_TOKEN = process.env.BOT_TOKEN || "8606075616:AAFmq_dQ_eCRDzEqnw5N2Ybc9_dkOS5BiDg";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://phoenix-bingo.onrender.com/#home";

// 2. የአድሚን እና የክፍያ መረጃዎች
const PAYMENT_INFO = {
  telebirr: "+251956998368",
  cbe: "+251956998368",
  supportAdmin: "@Phonix_s",
  minWithdraw: "50",
  referralBonus: "10",
};

// 3. ልክ እንደ ፎቶው የተዘጋጀው ቋሚ ኪቦርድ (Persistent Bottom Keyboard)
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

// ደህንነቱ የተጠበቀ የቴሌግራም ጥሪ (Native HTTPS)
function telegramRequest(method, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: "api.telegram.org",
      port: 443,
      path: `/bot${BOT_TOKEN}/${method}`,
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
async function sendMessage(chatId, text, replyMarkup = MAIN_KEYBOARD) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

// በቴሌግራም ሜኑ ላይ ትዕዛዞችን በፎቶው መሰረት መመዝገቢያ (Configure Telegram Commands)
async function setBotCommands() {
  const commands = [
    { command: "play", description: "🎮 ጌም ይጫወቱ" },
    { command: "account", description: "💰 ሒሳብ ማረጋገጫ" },
    { command: "deposit", description: "📥 ገቢ ማድረግ" },
    { command: "withdraw", description: "📤 ወጪ ማድረግ" },
    { command: "referral", description: "🤝 ጓደኛ ይጋብዙ" },
    { command: "help", description: "🆘 እርዳታ" },
  ];
  await telegramRequest("setMyCommands", { commands });
  console.log("✅ Bot menu commands configured perfectly!");
}

// ትዕዛዞችን ማስተናገጃ (Handles ALL Commands & Button Clicks)
async function handleUpdate(update) {
  let chatId, rawText, userName, userId;

  if (update.callback_query) {
    chatId = update.callback_query.message.chat.id;
    rawText = update.callback_query.data;
    userName = update.callback_query.from.first_name || "ተጫዋች";
    userId = update.callback_query.from.id;
    telegramRequest("answerCallbackQuery", { callback_query_id: update.callback_query.id });
  } else if (update.message && update.message.text) {
    chatId = update.message.chat.id;
    rawText = update.message.text.trim();
    userName = [update.message.from.first_name, update.message.from.last_name].filter(Boolean).join(" ") || "ተጫዋች";
    userId = update.message.from.id;
  } else {
    return;
  }

  const text = rawText.toLowerCase();
  console.log(`[Command Execution] User: ${userName} (${userId}) -> ${rawText}`);

  // 1. 🎮 ጌም ይጫወቱ (/play ወይም /start ወይም ኪቦርዱ)
  if (text === "/play" || text === "/start" || text.includes("play") || text.includes("ጌም ይጫወቱ")) {
    const playUrl = `${WEBAPP_URL}?tgId=${userId}&name=${encodeURIComponent(userName)}`;
    const msg = 
`🇪🇹 <b>እንኳን ወደ ፊኒክስ ቢንጎ በደህና መጡ፣ ${userName}!</b> 🎮

ፈጣን የቀጥታ ካርቴላ ቢንጎ ይጫወቱ፣ ትልቅ ጃክፖት ያሸንፉ! 
በቴሌብር እና በኢትዮጵያ ንግድ ባንክ ፈጣን ገቢና ወጪ ክፍያ።

👇 <b>ከታች ያለውን ሰማያዊ ቁልፍ ተጭነው ጨዋታውን ይክፈቱ፦</b>`;

    const inlinePlay = {
      inline_keyboard: [
        [
          {
            text: "🎮 ካርቴላ ቢንጎ ተጫወት (PLAY BINGO)",
            web_app: { url: playUrl },
          },
        ],
        [
          {
            text: "🌐 በብሮውዘር ክፈት (Open in Browser)",
            url: playUrl,
          },
        ],
        [
          { text: "💰 ሒሳብ ማረጋገጫ", callback_data: "/account" },
          { text: "📥 ገንዘብ አስገባ", callback_data: "/deposit" },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlinePlay);
    return;
  }

  // 2. 💰 ሒሳብ ማረጋገጫ (/account ወይም "💰 ሂሳብ")
  if (text === "/account" || text.includes("account") || text.includes("ሂሳብ") || text.includes("ሒሳብ")) {
    const msg = 
`💰 <b>የሒሳብ ማረጋገጫ (Wallet Balance)</b>

👤 <b>ተጫዋች:</b> ${userName}
🆔 <b>የቴሌግራም ID:</b> <code>${userId}</code>
💵 <b>ዋና ዋሌት:</b> 0.00 ETB
🎁 <b>ቦነስ ዋሌት:</b> 0.00 ETB
🏆 <b>ያሸነፉት ጠቅላላ:</b> 0.00 ETB

<i>ገንዘብ ገቢ ለማድረግ ከታች <b>"📥 ገቢ ማድረግ"</b> የሚለውን ይጫኑ።</i>`;

    const inlineBal = {
      inline_keyboard: [
        [
          { text: "📥 ገቢ ማድረግ", callback_data: "/deposit" },
          { text: "📤 ወጪ ማድረግ", callback_data: "/withdraw" },
        ],
        [
          {
            text: "🎮 ወደ ጨዋታው ሂድ",
            web_app: { url: `${WEBAPP_URL}?tgId=${userId}&name=${encodeURIComponent(userName)}` },
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineBal);
    return;
  }

  // 3. 📥 ገቢ ማድረግ (/deposit ወይም "📥 ገቢ (Deposit)")
  if (text === "/deposit" || text.includes("deposit") || text.includes("ገቢ")) {
    const msg = 
`📥 <b>ገንዘብ ወደ አካውንትዎ ገቢ ማድረጊያ መመሪያ</b>

የሚፈልጉትን የብር መጠን ከታች ባሉት የክፍያ አማራጮች ያስገቡ፦

📱 <b>ቴሌብር (Telebirr):</b>
ቁጥር: <code>${PAYMENT_INFO.telebirr}</code>

🏦 <b>የኢትዮጵያ ንግድ ባንክ (CBE):</b>
የሂሳብ ቁጥር: <code>${PAYMENT_INFO.cbe}</code>

⚠️ <b>ማሳሰቢያ፦</b>
ገንዘቡን ካስተላለፉ በኋላ የደረሰኝ ስክሪንሾት ወይም የግብይት ቁጥሩን ከቴሌግራም መለያዎ (ID: <code>${userId}</code>) ጋር ለድጋፍ ሰጪያችን <b>${PAYMENT_INFO.supportAdmin}</b> ይላኩ። በ 2 ደቂቃ ውስጥ ይገባልዎታል!`;

    const inlineDep = {
      inline_keyboard: [
        [
          {
            text: "💬 ደረሰኝ ለአድሚን ለመላክ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
        [
          {
            text: "🎮 ወደ ጨዋታው ተመለስ",
            web_app: { url: `${WEBAPP_URL}?tgId=${userId}&name=${encodeURIComponent(userName)}` },
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineDep);
    return;
  }

  // 4. 📤 ወጪ ማድረግ (/withdraw ወይም "📤 ወጪ (Withdraw)")
  if (text === "/withdraw" || text.includes("withdraw") || text.includes("ወጪ")) {
    const msg = 
`📤 <b>ያሸነፉትን ገንዘብ ወጪ ማድረጊያ</b>

• <b>ዝቅተኛ የወጪ መጠን:</b> ${PAYMENT_INFO.minWithdraw} ETB
• <b>የክፍያ ጊዜ:</b> ከ 5 እስከ 15 ደቂቃዎች ውስጥ

ገንዘብ ወጪ ለማድረግ የሚፈልጉትን የብር መጠን እና የቴሌብር ቁጥርዎን ወይም የባንክ ሂሳብዎን ለአድሚን <b>${PAYMENT_INFO.supportAdmin}</b> ይላኩ።`;

    const inlineWith = {
      inline_keyboard: [
        [
          {
            text: "📤 ወጪ ለማዘዝ አድሚንን ያነጋግሩ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineWith);
    return;
  }

  // 5. 🤝 ጓደኛ ይጋብዙ (/referral ወይም "🔗 ጋብዝ & አግኝ")
  if (text === "/referral" || text.includes("referral") || text.includes("ጋብዝ") || text.includes("ጓደኛ")) {
    const botInfo = await telegramRequest("getMe", {});
    const botUser = botInfo.result?.username || "Phoenix_Bingo_Bot";
    const refLink = `https://t.me/${botUser}?start=ref_${userId}`;

    const msg = 
`🤝 <b>ጓደኛዎን ይጋብዙ — ነፃ ቦነስ ያግኙ!</b>

ለእያንዳንዱ በእርስዎ ሊንክ ለሚመዘገብ ጓደኛ <b>${PAYMENT_INFO.referralBonus} ETB</b> ነፃ ቦነስ ያገኛሉ!

🔗 <b>የእርስዎ መጋበዣ ሊንክ፦</b>
<code>${refLink}</code>

ሊንኩን ኮፒ በማድረግ ለጓደኞችዎ ያጋሩ!`;

    const inlineShare = {
      inline_keyboard: [
        [
          {
            text: "📤 ሊንኩን ለጓደኛ አጋራ (Share)",
            url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🔥 ና እዚህ ፈጣን የቀጥታ ካርቴላ ቢንጎ እንጫወት! ተመዝገብና የነፃ ቦነስ ተቀበል!")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineShare);
    return;
  }

  // 6. 🆘 እርዳታ (/help ወይም "🆘 እርዳታ")
  if (text === "/help" || text.includes("help") || text.includes("እርዳታ") || text.includes("ድጋፍ")) {
    const msg = 
`🆘 <b>የደንበኞች ድጋፍ እና እርዳታ (Customer Support)</b>

• <b>የጨዋታ ህግ:</b> በየ 45 ሰከንዱ አዲስ ዙር ይጀመራል፤ ካርቴላ መርጠው ቁጥሮችን በማመሳከር መስመር ሲሞላ ቢንጎ ብለው ያሸንፋሉ!
• <b>ተቀማጭ እና ወጪ:</b> በቴሌብር እና በኢትዮጵያ ንግድ ባንክ 24/7 ፈጣን አገልግሎት ይሰጣል።

ማንኛውም ጥያቄ ወይም በክፍያ ዙሪያ ችግር ካጋጠመዎት አድሚናችንን ያነጋግሩ፦
👉 <b>${PAYMENT_INFO.supportAdmin}</b>`;

    const inlineHelp = {
      inline_keyboard: [
        [
          {
            text: "💬 አድሚኑን አሁን ያነጋግሩ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineHelp);
    return;
  }

  // 7. 👤 ፕሮፋይል
  if (text.includes("ፕሮፋይል") || text.includes("profile")) {
    const msg = 
`👤 <b>የተጠቃሚ ፕሮፋይል (Profile)</b>

• <b>ስም:</b> ${userName}
• <b>የቴሌግራም ID:</b> <code>${userId}</code>
• <b>የአካውንት ደረጃ:</b> ቪአይፒ (VIP Player) ⭐
• <b>ሁኔታ:</b> ንቁ (Active) ✅`;

    await sendMessage(chatId, msg);
    return;
  }

  // 8. 🗣 ድርጅቱን አስተዋውቅ
  if (text.includes("አስተዋውቅ") || text.includes("ድርጅት")) {
    const msg = 
`🦅 <b>ስለ ፊኒክስ ቢንጎ (About Phoenix Bingo)</b>

ፊኒክስ ቢንጎ በኢትዮጵያ ውስጥ ፈጣን፣ አስተማማኝ እና ፍትሃዊ የቀጥታ የካርቴላ ቢንጎ ጨዋታ መድረክ ነው። 
• 24/7 ፈጣን የቴሌብር እና የባንክ ክፍያዎች
• ትላልቅ የጃክፖት ሽልማቶች
• ፍጹም ግልጽ እና ታማኝ አገልግሎት`;

    await sendMessage(chatId, msg);
    return;
  }

  // 9. 📖 መመሪያ
  if (text.includes("መመሪያ") || text.includes("guide")) {
    const msg = 
`📖 <b>የካርቴላ ቢንጎ አጨዋወት መመሪያ</b>

1. <b>ካርቴላ ይምረጡ፦</b> ጨዋታው ከመጀመሩ በፊት የሚፈልጉትን ካርቴላ ይግዙ።
2. <b>ቁጥሮችን ይከታተሉ፦</b> የሚወጡትን እጣ ቁጥሮች በካርቴላዎ ላይ ያመሳክሩ።
3. <b>ቢንጎ ይበሉ፦</b> መስመር ሲሞላ "BINGO" የሚለውን ተጭነው ያሸንፉ!`;

    await sendMessage(chatId, msg);
    return;
  }

  // 10. 📜 ደንቦች
  if (text.includes("ደንብ") || text.includes("rules")) {
    const msg = 
`📜 <b>የፕላትፎርሙ ደንቦች</b>

1. እድሜያቸው ከ 18 ዓመት በላይ ለሆኑ ብቻ የተፈቀደ ነው።
2. የሀሰት ደረሰኝ ማቅረብ ከአካውንት ያግዳል!
3. ያሸነፉት ገንዘብ ያለምንም ቅድመ ሁኔታ ወዲያውኑ ይከፈላል።`;

    await sendMessage(chatId, msg);
    return;
  }

  // 11. 🌐 ቋንቋ
  if (text.includes("ቋንቋ") || text.includes("language")) {
    await sendMessage(chatId, "🇪🇹 <b>የአሁኑ ቋንቋ፦</b> አማርኛ (Amharic)");
    return;
  }

  // ያልታወቀ ጽሁፍ ሲመጣ
  await sendMessage(chatId, `ሰላም ${userName}፣ ከታች ያሉትን አማራጮች በመጠቀም ይምረጡ፦`);
}

// 🔄 Polling Loop
let offset = 0;
async function pollUpdates() {
  console.log("=========================================");
  console.log("🚀 Phoenix Bingo Bot: All Commands Configured!");
  console.log("=========================================");
  await setBotCommands();

  while (true) {
    try {
      const data = await telegramRequest("getUpdates", {
        offset: offset,
        timeout: 30,
      });

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

pollUpdates();function telegramRequest(method, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: "api.telegram.org",
      port: 443,
      path: `/bot${BOT_TOKEN}/${method}`,
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
async function sendMessage(chatId, text, replyMarkup = MAIN_KEYBOARD) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

// በቴሌግራም ሜኑ ላይ ትዕዛዞችን በፎቶው መሰረት መመዝገቢያ (Configure Telegram Commands)
async function setBotCommands() {
  const commands = [
    { command: "play", description: "🎮 ጌም ይጫወቱ" },
    { command: "account", description: "💰 ሒሳብ ማረጋገጫ" },
    { command: "deposit", description: "📥 ገቢ ማድረግ" },
    { command: "withdraw", description: "📤 ወጪ ማድረግ" },
    { command: "referral", description: "🤝 ጓደኛ ይጋብዙ" },
    { command: "help", description: "🆘 እርዳታ" },
  ];
  await telegramRequest("setMyCommands", { commands });
  console.log("✅ Bot menu commands configured perfectly!");
}

// ትዕዛዞችን ማስተናገጃ (Handles ALL Commands & Button Clicks)
async function handleUpdate(update) {
  let chatId, rawText, userName, userId;

  if (update.callback_query) {
    chatId = update.callback_query.message.chat.id;
    rawText = update.callback_query.data;
    userName = update.callback_query.from.first_name || "ተጫዋች";
    userId = update.callback_query.from.id;
    telegramRequest("answerCallbackQuery", { callback_query_id: update.callback_query.id });
  } else if (update.message && update.message.text) {
    chatId = update.message.chat.id;
    rawText = update.message.text.trim();
    userName = [update.message.from.first_name, update.message.from.last_name].filter(Boolean).join(" ") || "ተጫዋች";
    userId = update.message.from.id;
  } else {
    return;
  }

  const text = rawText.toLowerCase();
  console.log(`[Command Execution] User: ${userName} (${userId}) -> ${rawText}`);

  // 1. 🎮 ጌም ይጫወቱ (/play ወይም /start ወይም ኪቦርዱ)
  if (text === "/play" || text === "/start" || text.includes("play") || text.includes("ጌም ይጫወቱ")) {
    const playUrl = `${WEBAPP_URL}?tgId=${userId}&name=${encodeURIComponent(userName)}`;
    const msg = 
`🇪🇹 <b>እንኳን ወደ ፊኒክስ ቢንጎ በደህና መጡ፣ ${userName}!</b> 🎮

ፈጣን የቀጥታ ካርቴላ ቢንጎ ይጫወቱ፣ ትልቅ ጃክፖት ያሸንፉ! 
በቴሌብር እና በኢትዮጵያ ንግድ ባንክ ፈጣን ገቢና ወጪ ክፍያ።

👇 <b>ከታች ያለውን ሰማያዊ ቁልፍ ተጭነው ጨዋታውን ይክፈቱ፦</b>`;

    const inlinePlay = {
      inline_keyboard: [
        [
          {
            text: "🎮 ካርቴላ ቢንጎ ተጫወት (PLAY BINGO)",
            web_app: { url: playUrl },
          },
        ],
        [
          {
            text: "🌐 በብሮውዘር ክፈት (Open in Browser)",
            url: playUrl,
          },
        ],
        [
          { text: "💰 ሒሳብ ማረጋገጫ", callback_data: "/account" },
          { text: "📥 ገንዘብ አስገባ", callback_data: "/deposit" },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlinePlay);
    return;
  }

  // 2. 💰 ሒሳብ ማረጋገጫ (/account ወይም "💰 ሂሳብ")
  if (text === "/account" || text.includes("account") || text.includes("ሂሳብ") || text.includes("ሒሳብ")) {
    const msg = 
`💰 <b>የሒሳብ ማረጋገጫ (Wallet Balance)</b>

👤 <b>ተጫዋች:</b> ${userName}
🆔 <b>የቴሌግራም ID:</b> <code>${userId}</code>
💵 <b>ዋና ዋሌት:</b> 0.00 ETB
🎁 <b>ቦነስ ዋሌት:</b> 0.00 ETB
🏆 <b>ያሸነፉት ጠቅላላ:</b> 0.00 ETB

<i>ገንዘብ ገቢ ለማድረግ ከታች <b>"📥 ገቢ ማድረግ"</b> የሚለውን ይጫኑ።</i>`;

    const inlineBal = {
      inline_keyboard: [
        [
          { text: "📥 ገቢ ማድረግ", callback_data: "/deposit" },
          { text: "📤 ወጪ ማድረግ", callback_data: "/withdraw" },
        ],
        [
          {
            text: "🎮 ወደ ጨዋታው ሂድ",
            web_app: { url: `${WEBAPP_URL}?tgId=${userId}&name=${encodeURIComponent(userName)}` },
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineBal);
    return;
  }

  // 3. 📥 ገቢ ማድረግ (/deposit ወይም "📥 ገቢ (Deposit)")
  if (text === "/deposit" || text.includes("deposit") || text.includes("ገቢ")) {
    const msg = 
`📥 <b>ገንዘብ ወደ አካውንትዎ ገቢ ማድረጊያ መመሪያ</b>

የሚፈልጉትን የብር መጠን ከታች ባሉት የክፍያ አማራጮች ያስገቡ፦

📱 <b>ቴሌብር (Telebirr):</b>
ቁጥር: <code>${PAYMENT_INFO.telebirr}</code>

🏦 <b>የኢትዮጵያ ንግድ ባንክ (CBE):</b>
የሂሳብ ቁጥር: <code>${PAYMENT_INFO.cbe}</code>

⚠️ <b>ማሳሰቢያ፦</b>
ገንዘቡን ካስተላለፉ በኋላ የደረሰኝ ስክሪንሾት ወይም የግብይት ቁጥሩን ከቴሌግራም መለያዎ (ID: <code>${userId}</code>) ጋር ለድጋፍ ሰጪያችን <b>${PAYMENT_INFO.supportAdmin}</b> ይላኩ። በ 2 ደቂቃ ውስጥ ይገባልዎታል!`;

    const inlineDep = {
      inline_keyboard: [
        [
          {
            text: "💬 ደረሰኝ ለአድሚን ለመላክ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
        [
          {
            text: "🎮 ወደ ጨዋታው ተመለስ",
            web_app: { url: `${WEBAPP_URL}?tgId=${userId}&name=${encodeURIComponent(userName)}` },
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineDep);
    return;
  }

  // 4. 📤 ወጪ ማድረግ (/withdraw ወይም "📤 ወጪ (Withdraw)")
  if (text === "/withdraw" || text.includes("withdraw") || text.includes("ወጪ")) {
    const msg = 
`📤 <b>ያሸነፉትን ገንዘብ ወጪ ማድረጊያ</b>

• <b>ዝቅተኛ የወጪ መጠን:</b> ${PAYMENT_INFO.minWithdraw} ETB
• <b>የክፍያ ጊዜ:</b> ከ 5 እስከ 15 ደቂቃዎች ውስጥ

ገንዘብ ወጪ ለማድረግ የሚፈልጉትን የብር መጠን እና የቴሌብር ቁጥርዎን ወይም የባንክ ሂሳብዎን ለአድሚን <b>${PAYMENT_INFO.supportAdmin}</b> ይላኩ።`;

    const inlineWith = {
      inline_keyboard: [
        [
          {
            text: "📤 ወጪ ለማዘዝ አድሚንን ያነጋግሩ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineWith);
    return;
  }

  // 5. 🤝 ጓደኛ ይጋብዙ (/referral ወይም "🔗 ጋብዝ & አግኝ")
  if (text === "/referral" || text.includes("referral") || text.includes("ጋብዝ") || text.includes("ጓደኛ")) {
    const botInfo = await telegramRequest("getMe", {});
    const botUser = botInfo.result?.username || "Phoenix_Bingo_Bot";
    const refLink = `https://t.me/${botUser}?start=ref_${userId}`;

    const msg = 
`🤝 <b>ጓደኛዎን ይጋብዙ — ነፃ ቦነስ ያግኙ!</b>

ለእያንዳንዱ በእርስዎ ሊንክ ለሚመዘገብ ጓደኛ <b>${PAYMENT_INFO.referralBonus} ETB</b> ነፃ ቦነስ ያገኛሉ!

🔗 <b>የእርስዎ መጋበዣ ሊንክ፦</b>
<code>${refLink}</code>

ሊንኩን ኮፒ በማድረግ ለጓደኞችዎ ያጋሩ!`;

    const inlineShare = {
      inline_keyboard: [
        [
          {
            text: "📤 ሊንኩን ለጓደኛ አጋራ (Share)",
            url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🔥 ና እዚህ ፈጣን የቀጥታ ካርቴላ ቢንጎ እንጫወት! ተመዝገብና የነፃ ቦነስ ተቀበል!")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineShare);
    return;
  }

  // 6. 🆘 እርዳታ (/help ወይም "🆘 እርዳታ")
  if (text === "/help" || text.includes("help") || text.includes("እርዳታ") || text.includes("ድጋፍ")) {
    const msg = 
`🆘 <b>የደንበኞች ድጋፍ እና እርዳታ (Customer Support)</b>

• <b>የጨዋታ ህግ:</b> በየ 45 ሰከንዱ አዲስ ዙር ይጀመራል፤ ካርቴላ መርጠው ቁጥሮችን በማመሳከር መስመር ሲሞላ ቢንጎ ብለው ያሸንፋሉ!
• <b>ተቀማጭ እና ወጪ:</b> በቴሌብር እና በኢትዮጵያ ንግድ ባንክ 24/7 ፈጣን አገልግሎት ይሰጣል።

ማንኛውም ጥያቄ ወይም በክፍያ ዙሪያ ችግር ካጋጠመዎት አድሚናችንን ያነጋግሩ፦
👉 <b>${PAYMENT_INFO.supportAdmin}</b>`;

    const inlineHelp = {
      inline_keyboard: [
        [
          {
            text: "💬 አድሚኑን አሁን ያነጋግሩ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineHelp);
    return;
  }

  // 7. 👤 ፕሮፋይል
  if (text.includes("ፕሮፋይል") || text.includes("profile")) {
    const msg = 
`👤 <b>የተጠቃሚ ፕሮፋይል (Profile)</b>

• <b>ስም:</b> ${userName}
• <b>የቴሌግራም ID:</b> <code>${userId}</code>
• <b>የአካውንት ደረጃ:</b> ቪአይፒ (VIP Player) ⭐
• <b>ሁኔታ:</b> ንቁ (Active) ✅`;

    await sendMessage(chatId, msg);
    return;
  }

  // 8. 🗣 ድርጅቱን አስተዋውቅ
  if (text.includes("አስተዋውቅ") || text.includes("ድርጅት")) {
    const msg = 
`🦅 <b>ስለ ፊኒክስ ቢንጎ (About Phoenix Bingo)</b>

ፊኒክስ ቢንጎ በኢትዮጵያ ውስጥ ፈጣን፣ አስተማማኝ እና ፍትሃዊ የቀጥታ የካርቴላ ቢንጎ ጨዋታ መድረክ ነው። 
• 24/7 ፈጣን የቴሌብር እና የባንክ ክፍያዎች
• ትላልቅ የጃክፖት ሽልማቶች
• ፍጹም ግልጽ እና ታማኝ አገልግሎት`;

    await sendMessage(chatId, msg);
    return;
  }

  // 9. 📖 መመሪያ
  if (text.includes("መመሪያ") || text.includes("guide")) {
    const msg = 
`📖 <b>የካርቴላ ቢንጎ አጨዋወት መመሪያ</b>

1. <b>ካርቴላ ይምረጡ፦</b> ጨዋታው ከመጀመሩ በፊት የሚፈልጉትን ካርቴላ ይግዙ።
2. <b>ቁጥሮችን ይከታተሉ፦</b> የሚወጡትን እጣ ቁጥሮች በካርቴላዎ ላይ ያመሳክሩ።
3. <b>ቢንጎ ይበሉ፦</b> መስመር ሲሞላ "BINGO" የሚለውን ተጭነው ያሸንፉ!`;

    await sendMessage(chatId, msg);
    return;
  }

  // 10. 📜 ደንቦች
  if (text.includes("ደንብ") || text.includes("rules")) {
    const msg = 
`📜 <b>የፕላትፎርሙ ደንቦች</b>

1. እድሜያቸው ከ 18 ዓመት በላይ ለሆኑ ብቻ የተፈቀደ ነው።
2. የሀሰት ደረሰኝ ማቅረብ ከአካውንት ያግዳል!
3. ያሸነፉት ገንዘብ ያለምንም ቅድመ ሁኔታ ወዲያውኑ ይከፈላል።`;

    await sendMessage(chatId, msg);
    return;
  }

  // 11. 🌐 ቋንቋ
  if (text.includes("ቋንቋ") || text.includes("language")) {
    await sendMessage(chatId, "🇪🇹 <b>የአሁኑ ቋንቋ፦</b> አማርኛ (Amharic)");
    return;
  }

  // ያልታወቀ ጽሁፍ ሲመጣ
  await sendMessage(chatId, `ሰላም ${userName}፣ ከታች ያሉትን አማራጮች በመጠቀም ይምረጡ፦`);
}

// 🔄 Polling Loop
let offset = 0;
async function pollUpdates() {
  console.log("=========================================");
  console.log("🚀 Phoenix Bingo Bot: All Commands Configured!");
  console.log("=========================================");
  await setBotCommands();

  while (true) {
    try {
      const data = await telegramRequest("getUpdates", {
        offset: offset,
        timeout: 30,
      });

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

pollUpdates();    ],
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

// ደህንነቱ የተጠበቀ የቴሌግራም ጥሪ (Native HTTPS)
function telegramRequest(method, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: "api.telegram.org",
      port: 443,
      path: `/bot${BOT_TOKEN}/${method}`,
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
async function sendMessage(chatId, text, replyMarkup = MAIN_KEYBOARD) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

// በቴሌግራም ሜኑ ላይ ትዕዛዞችን መመዝገቢያ (/play, /account...)
async function setBotCommands() {
  const commands = [
    { command: "play", description: "🎮 ጌም ይጫወቱ" },
    { command: "account", description: "💰 ሂሳብ ማረጋገጫ" },
    { command: "deposit", description: "📥 ገቢ ማድረግ" },
    { command: "withdraw", description: "📤 ወጪ ማድረግ" },
    { command: "referral", description: "🤝 ጓደኛ ይጋብዙ" },
    { command: "help", description: "🆘 እርዳታ" },
  ];
  await telegramRequest("setMyCommands", { commands });
  console.log("✅ Bot menu commands configured!");
}

// ትዕዛዞችን ማስተናገጃ (Handles button clicks)
async function handleUpdate(update) {
  let chatId, rawText, userName, userId;

  if (update.callback_query) {
    chatId = update.callback_query.message.chat.id;
    rawText = update.callback_query.data;
    userName = update.callback_query.from.first_name || "ተጫዋች";
    userId = update.callback_query.from.id;
    telegramRequest("answerCallbackQuery", { callback_query_id: update.callback_query.id });
  } else if (update.message && update.message.text) {
    chatId = update.message.chat.id;
    rawText = update.message.text.trim();
    userName = [update.message.from.first_name, update.message.from.last_name].filter(Boolean).join(" ") || "ተጫዋች";
    userId = update.message.from.id;
  } else {
    return;
  }

  const text = rawText.toLowerCase();
  console.log(`[Message from ${userName} (${userId})]: ${rawText}`);

  // 1. 🎮 ጌም ይጫወቱ
  if (text.includes("play") || text.includes("start") || text.includes("ጌም") || text.includes("ተጫወት")) {
    const msg = 
`🇪🇹 <b>እንኳን ወደ ፊኒክስ ቢንጎ በደህና መጡ፣ ${userName}!</b> 🎮

ፈጣን የቀጥታ ካርቴላ ቢንጎ ይጫወቱ፣ ትልቅ ጃክፖት ያሸንፉ! 
በቴሌብር እና በኢትዮጵያ ንግድ ባንክ ፈጣን ገቢና ወጪ ክፍያ።

👇 <b>ከታች ያለውን ሰማያዊ ቁልፍ ተጭነው ጨዋታውን ይክፈቱ፦</b>`;

    const inlinePlay = {
      inline_keyboard: [
        [
          {
            text: "🎮 ካርቴላ ቢንጎ ተጫወት (OPEN BINGO)",
            web_app: { url: WEBAPP_URL },
          },
        ],
        [
          {
            text: "🌐 በብሮውዘር ክፈት (Open in Browser)",
            url: WEBAPP_URL,
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlinePlay);
    return;
  }

  // 2. 👤 ፕሮፋይል
  if (text.includes("ፕሮፋይል") || text.includes("profile")) {
    const msg = 
`👤 <b>የተጠቃሚ ፕሮፋይል (Profile)</b>

• <b>ስም:</b> ${userName}
• <b>የቴሌግራም ID:</b> <code>${userId}</code>
• <b>የአካውንት ደረጃ:</b> ቪአይፒ (VIP Player) ⭐
• <b>ሁኔታ:</b> ንቁ (Active) ✅`;

    await sendMessage(chatId, msg);
    return;
  }

  // 3. 💰 ሂሳብ
  if (text.includes("account") || text.includes("ሂሳብ") || text.includes("balance")) {
    const msg = 
`💰 <b>የሂሳብ ማረጋገጫ (Wallet Balance)</b>

• <b>ዋና ዋሌት:</b> 0.00 ETB
• <b>ቦነስ ዋሌት:</b> 0.00 ETB
• <b>ያሸነፉት ጠቅላላ:</b> 0.00 ETB

<i>ገንዘብ ገቢ ለማድረግ ከታች <b>"📥 ገቢ (Deposit)"</b> የሚለውን ይጫኑ።</i>`;

    const inlineBal = {
      inline_keyboard: [
        [
          { text: "📥 ገቢ አድርግ", callback_data: "/deposit" },
          { text: "📤 ወጪ አድርግ", callback_data: "/withdraw" },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineBal);
    return;
  }

  // 4. 📥 ገቢ (Deposit)
  if (text.includes("deposit") || text.includes("ገቢ")) {
    const msg = 
`📥 <b>ገንዘብ ወደ አካውንትዎ ገቢ ማድረጊያ</b>

የሚፈልጉትን የብር መጠን ከታች ባሉት የክፍያ አማራጮች ያስገቡ፦

📱 <b>ቴሌብር (Telebirr):</b>
ቁጥር: <code>${PAYMENT_INFO.telebirr}</code>

🏦 <b>የኢትዮጵያ ንግድ ባንክ (CBE):</b>
የሂሳብ ቁጥር: <code>${PAYMENT_INFO.cbe}</code>

⚠️ <b>ማሳሰቢያ፦</b>
ገንዘቡን ካስተላለፉ በኋላ የደረሰኝ ስክሪንሾት ወይም የግብይት ቁጥሩን ከቴሌግራም መለያዎ (ID: <code>${userId}</code>) ጋር ለድጋፍ ሰጪያችን <b>${PAYMENT_INFO.supportAdmin}</b> ይላኩ። በ 2 ደቂቃ ውስጥ ይገባልዎታል!`;

    const inlineDep = {
      inline_keyboard: [
        [
          {
            text: "💬 ደረሰኝ ለአድሚን ለመላክ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineDep);
    return;
  }

  // 5. 📤 ወጪ (Withdraw)
  if (text.includes("withdraw") || text.includes("ወጪ")) {
    const msg = 
`📤 <b>ያሸነፉትን ገንዘብ ወጪ ማድረጊያ</b>

• <b>ዝቅተኛ የወጪ መጠን:</b> ${PAYMENT_INFO.minWithdraw} ETB
• <b>የክፍያ ጊዜ:</b> ከ 5 እስከ 15 ደቂቃዎች ውስጥ

ገንዘብ ወጪ ለማድረግ የሚፈልጉትን የብር መጠን እና የቴሌብር ቁጥርዎን ለአድሚን <b>${PAYMENT_INFO.supportAdmin}</b> ይላኩ።`;

    const inlineWith = {
      inline_keyboard: [
        [
          {
            text: "📤 ወጪ ለማዘዝ አድሚንን ያነጋግሩ",
            url: `https://t.me/${PAYMENT_INFO.supportAdmin.replace("@", "")}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlineWith);
    return;
  }

  // 6. 🔗 ጋብዝ & አግኝ
  if (text.includes("ጋብዝ") || text.includes("referral") || text.includes("ጓደኛ")) {
    const botInfo = await telegramRequest("getMe", {});
    const botUser = botInfo.result?.username || "Phoenix_Bingo_Bot";
    const refLink = `https://t.me/${botUser}?start=ref_${userId}`;

    const msg = 
`🤝 <b>ጓደኛዎን ይጋብዙ — ነፃ ቦነስ ያግኙ!</b>

ለእያንዳንዱ በእርስዎ ሊንክ ለሚመዘገብ ጓደኛ <b>${PAYMENT_INFO.referralBonus} ETB</b> ነፃ ቦነስ ያገኛሉ!

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

    await sendMessage(chatId, msg, inlineShare);
    return;
  }

  // 7. 🗣 ድርጅቱን አስተዋውቅ
  if (text.includes("አስተዋውቅ") || text.includes("ድርጅት")) {
    const msg = 
`🦅 <b>ስለ ፊኒክስ ቢንጎ (About Phoenix Bingo)</b>

ፊኒክስ ቢንጎ በኢትዮጵያ ውስጥ ፈጣን፣ አስተማማኝ እና ፍትሃዊ የቀጥታ የካርቴላ ቢንጎ ጨዋታ መድረክ ነው። 
• 24/7 ፈጣን የቴሌብር እና የባንክ ክፍያዎች
• ትላልቅ የጃክፖት ሽልማቶች`;
    await sendMessage(chatId, msg);
    return;
  }

  // 8. 📖 መመሪያ
  if (text.includes("መመሪያ") || text.includes("guide")) {
    const msg = 
`📖 <b>የካርቴላ ቢንጎ አጨዋወት መመሪያ</b>

1. <b>ካርቴላ ይምረጡ፦</b> ጨዋታው ከመጀመሩ በፊት ካርቴላ ይግዙ።
2. <b>ቁጥሮችን ይከታተሉ፦</b> የሚወጡትን እጣ ቁጥሮች በካርቴላዎ ላይ ያመሳክሩ።
3. <b>ቢንጎ ይበሉ፦</b> መስመር ሲሞላ ቢንጎ ብለው ያሸንፉ!`;
    await sendMessage(chatId, msg);
    return;
  }

  // 9. 🆘 እርዳታ
  if (text.includes("help") || text.includes("እርዳታ") || text.includes("ድጋፍ")) {
    const msg = 
`🆘 <b>የደንበኞች ድጋፍ እና እርዳታ</b>

ማንኛውም ጥያቄ ወይም በክፍያ ዙሪያ ችግር ካጋጠመዎት አድሚናችንን ያነጋግሩ፦
👉 <b>${PAYMENT_INFO.supportAdmin}</b>`;
    await sendMessage(chatId, msg);
    return;
  }

  // 10. 📜 ደንቦች
  if (text.includes("ደንብ") || text.includes("rules")) {
    const msg = 
`📜 <b>የፕላትፎርሙ ደንቦች</b>

1. እድሜያቸው ከ 18 ዓመት በላይ ለሆኑ ብቻ የተፈቀደ ነው።
2. የሀሰት ደረሰኝ ማቅረብ ከአካውንት ያግዳል!
3. ያሸነፉት ገንዘብ ያለምንም ቅድመ ሁኔታ ወዲያውኑ ይከፈላል።`;
    await sendMessage(chatId, msg);
    return;
  }

  // 11. 🌐 ቋንቋ
  if (text.includes("ቋንቋ") || text.includes("language")) {
    await sendMessage(chatId, "🇪🇹 <b>የአሁኑ ቋንቋ፦</b> አማርኛ (Amharic)");
    return;
  }

  // ያልታወቀ ጽሁፍ ከመጣ
  await sendMessage(chatId, `ሰላም ${userName}፣ ከታች ያሉትን ቁልፎች ተጠቅመው ይምረጡ፦`);
}

// 🔄 Polling Loop
let offset = 0;
async function pollUpdates() {
  console.log("=========================================");
  console.log("🚀 Phoenix Bingo Bot connected with NEW Token!");
  console.log("=========================================");
  await setBotCommands();

  while (true) {
    try {
      const data = await telegramRequest("getUpdates", {
        offset: offset,
        timeout: 30,
      });

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
