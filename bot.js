/**
 * Phoenix Bingo - Telegram Bot Server
 * 
 * ይህ ስክሪፕት ተጠቃሚዎች በቴሌግራም ቦት ላይ የሚልኳቸውን ትዕዛዞች 
 * (/play, /account, /deposit, /withdraw, /referral, /help) 
 * ተቀብሎ በአማርኛ ምላሽ ይሰጣል እንዲሁም የቢንጎ ጌሙን በ Mini App ይከፍታል።
 */

// 1. የቦትዎን TOKEN
const BOT_TOKEN = process.env.BOT_TOKEN || "8606075616:AAEFVgE-_lIz33iYUBB6fzcWYPwXOm4f72g";

// 2. የ Render የቢንጎ ዌብሳይት ሊንክ
const WEBAPP_URL = process.env.WEBAPP_URL || "https://phoenix-bingo.onrender.com";

// 3. የእርስዎን የቴሌብር እና CBE አካውንት መረጃዎች
const PAYMENT_INFO = {
  telebirr: "+251956998368",
  cbe: "+251956998368",
  supportAdmin: "@Phonix_s", // የእርስዎ ወይም የድጋፍ ቴሌግራም ዩዘርኔም
  minWithdraw: "50", // ዝቅተኛ ወጪ የሚደረግ ብር
  referralBonus: "10", // ለግብዣ የሚሰጥ ጉርሻ ብር
};

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

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

// ትዕዛዞችን ማስተናገጃ
async function handleUpdate(update) {
  let chatId, text, userName, userId, callbackId;

  if (update.callback_query) {
    callbackId = update.callback_query.id;
    chatId = update.callback_query.message.chat.id;
    text = "/" + update.callback_query.data;
    userName = update.callback_query.from.first_name || "ተጫዋች";
    userId = update.callback_query.from.id;

    // Answer callback query so button spinner stops
    fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackId }),
    }).catch(() => {});
  } else if (update.message && update.message.text) {
    chatId = update.message.chat.id;
    text = update.message.text.trim();
    userName = update.message.from.first_name || "ተጫዋች";
    userId = update.message.from.id;
  } else {
    return;
  }

  console.log(`[Command received] from ${userName} (${userId}): ${text}`);

  // 1. /start ወይም /play (ጌም ይጫወቱ)
  if (text.startsWith("/play") || text.startsWith("/start")) {
    const welcomeText = 
`🇪🇹 <b>እንኳን ወደ ፊኒክስ ቢንጎ በደህና መጡ፣ ${userName}!</b> 🎮

ፈጣን የቀጥታ ካርቴላ ቢንጎ ይጫወቱ፣ ትልቅ ጃክፖት ያሸንፉ! በቴሌብር እና በንግድ ባንክ ፈጣን ገቢ እና ወጪ ክፍያ ያግኙ።

👇 <b>ከታች ያለውን ቁልፍ ተጭነው መጫወት ይጀምሩ!</b>`;

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
        [
          { text: "🤝 ጓደኛ ይጋብዙ", callback_data: "referral" },
          { text: "ℹ️ እርዳታ", callback_data: "help" },
        ],
      ],
    };

    await sendMessage(chatId, welcomeText, keyboard);
    return;
  }

  // 2. /account (ሂሳብ ማረጋገጫ)
  if (text.startsWith("/account")) {
    const accountText = 
`👤 <b>የተጠቃሚ መለያ እና ሒሳብ ማረጋገጫ</b>

• <b>ስም:</b> ${userName}
• <b>የቴሌግራም መለያ (ID):</b> <code>${userId}</code>
• <b>የቦነስ ቀሪ ሒሳብ:</b> 25.00 ETB
• <b>የዋና ዋሌት ሒሳብ:</b> 0.00 ETB
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
    const botUsername = botInfo.result?.username || "YourBingoBot";

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

// Telegram Bot Polling loop (መልዕክቶችን በየሰከንዱ መቀበያ)
let offset = 0;
async function pollUpdates() {
  if (BOT_TOKEN === "YOUR_TELEGRAM_BOT_TOKEN_HERE") {
    console.error("⚠️ እባክዎ BOT_TOKEN የሚለው ላይ የቦትዎን ቶከን ያስገቡ!");
    return;
  }

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
