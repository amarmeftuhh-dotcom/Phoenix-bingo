/**
 * Phoenix Bingo - Production Telegram Bot Server with MongoDB Atlas Integration (bot.js)
 */

import https from "node:https";
import http from "node:http";
import { MongoClient } from "mongodb";

// Render Web Service ፖርት ፈልጎ እንዳይዘጋ Dummy HTTP Server እናስነሳለን
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Phoenix Bingo Bot is Running 24/7!\n");
}).listen(PORT, () => {
  console.log(`HTTP health-check server listening on port ${PORT}`);
});

const BOT_TOKEN = process.env.BOT_TOKEN || "8606075616:AAFmq_dQ_eCRDzEqnw5N2Ybc9_dkOS5BiDg";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://phoenix-bingo.onrender.com/#home";
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://Phoenix:761724@cluster0.pivq9lg.mongodb.net/phoenix_bingo?retryWrites=true&w=majority";

const PAYMENT_INFO = {
  telebirr: "+251956998368",
  cbe: "+251956998368",
  supportAdmin: "@Phonix_s",
  minWithdraw: 50,
  referralBonus: 10,
};

const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "🎮 ጌም ይጫወቱ (PLAY)", web_app: { url: WEBAPP_URL } }],
    [{ text: "👤 ፕሮፋይል" }, { text: "💰 ሂሳብ" }],
    [{ text: "📥 ገቢ (Deposit)" }, { text: "📤 ወጪ (Withdraw)" }],
    [{ text: "🔗 ጋብዝ & አግኝ" }, { text: "🗣 ድርጅቱን አስተዋውቅ" }],
    [{ text: "📖 መመሪያ" }, { text: "🆘 እርዳታ" }, { text: "📜 ደንቦች" }],
    [{ text: "🌐 ቋንቋ (Language)" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

let dbClient = null;
let db = null;

async function getDatabase() {
  if (db) return db;
  try {
    dbClient = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    await dbClient.connect();
    db = dbClient.db("phoenix_bingo");
    console.log("🍃 MongoDB Atlas database connection established!");
    return db;
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    return null;
  }
}

async function getOrCreateUser(userId, userName, username) {
  const database = await getDatabase();
  if (!database) {
    return { userId, name: userName, balance: 0, bonus: 0, totalWon: 0 };
  }
  const usersCollection = database.collection("users");
  
  let user = await usersCollection.findOne({ userId: String(userId) });
  if (!user) {
    user = {
      userId: String(userId),
      name: userName || "ተጫዋች",
      username: username ? "@" + username : "",
      phone: "",
      balance: 0,
      bonus: 0,
      totalWon: 0,
      createdAt: new Date(),
      lastSeen: new Date(),
      status: "active",
    };
    await usersCollection.insertOne(user);
    console.log("👤 Registered in MongoDB: " + userName + " (" + userId + ")");
  } else {
    await usersCollection.updateOne(
      { userId: String(userId) },
      { $set: { lastSeen: new Date(), name: userName || user.name } }
    );
  }
  return user;
}

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

async function sendMessage(chatId, text, replyMarkup = MAIN_KEYBOARD) {
  return await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

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
}

async function handleUpdate(update) {
  let chatId, rawText, userName, userId, username;

  if (update.callback_query) {
    chatId = update.callback_query.message.chat.id;
    rawText = update.callback_query.data;
    userName = update.callback_query.from.first_name || "ተጫዋች";
    userId = update.callback_query.from.id;
    username = update.callback_query.from.username;
    telegramRequest("answerCallbackQuery", { callback_query_id: update.callback_query.id });
  } else if (update.message && update.message.text) {
    chatId = update.message.chat.id;
    rawText = update.message.text.trim();
    userName = [update.message.from.first_name, update.message.from.last_name].filter(Boolean).join(" ") || "ተጫዋች";
    userId = update.message.from.id;
    username = update.message.from.username;
  } else {
    return;
  }

  const user = await getOrCreateUser(userId, userName, username);
  const text = rawText.toLowerCase();

  // 1. 🎮 ጌም ይጫወቱ
  if (text === "/play" || text === "/start" || text.includes("play") || text.includes("ጌም")) {
    const playUrl = WEBAPP_URL + "?tgId=" + userId + "&name=" + encodeURIComponent(userName);
    const msg = [
      "🇪🇹 <b>እንኳን ወደ ፊኒክስ ቢንጎ በደህና መጡ፣ " + userName + "!</b> 🎮",
      "",
      "ፈጣን የቀጥታ ካርቴላ ቢንጎ ይጫወቱ፣ ትልቅ ጃክፖት ያሸንፉ!",
      "በቴሌብር እና በኢትዮጵያ ንግድ ባንክ ፈጣን ገቢና ወጪ ክፍያ።",
      "",
      "👇 <b>ከታች ያለውን ሰማያዊ ቁልፍ ተጭነው ጨዋታውን ይክፈቱ፦</b>"
    ].join("\n");

    const inlinePlay = {
      inline_keyboard: [
        [{ text: "🎮 ካርቴላ ቢንጎ ተጫወት (PLAY BINGO)", web_app: { url: playUrl } }],
        [{ text: "🌐 በብሮውዘር ክፈት (Open Link)", url: playUrl }],
        [
          { text: "💰 ሒሳብ ማረጋገጫ", callback_data: "/account" },
          { text: "📥 ገንዘብ አስገባ", callback_data: "/deposit" },
        ],
      ],
    };

    await sendMessage(chatId, msg, inlinePlay);
    return;
  }

  // 2. 💰 ሒሳብ ማረጋገጫ
  if (text === "/account" || text.includes("account") || text.includes("ሂሳብ") || text.includes("ሒሳብ")) {
    const balanceStr = (user.balance || 0).toFixed(2);
    const bonusStr = (user.bonus || 0).toFixed(2);
    const wonStr = (user.totalWon || 0).toFixed(2);

    const msg = [
      "💰 <b>የሒሳብ ማረጋገጫ (Wallet Balance)</b>",
      "",
      "👤 <b>ተጫዋች:</b> " + userName,
      "🆔 <b>የቴሌግራም ID:</b> <code>" + userId + "</code>",
      "💵 <b>ዋና ዋሌት:</b> <b>" + balanceStr + " ETB</b>",
      "🎁 <b>ቦነስ ዋሌት:</b> <b>" + bonusStr + " ETB</b>",
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

  // 3. 📥 ገቢ ማድረግ
  if (text === "/deposit" || text.includes("deposit") || text.includes("ገቢ")) {
    const msg = [
      "📥 <b>ገንዘብ ወደ አካውንትዎ ገቢ ማድረጊያ መመሪያ</b>",
      "",
      "📱 <b>ቴሌብር (Telebirr):</b>",
      "ቁጥር: <code>" + PAYMENT_INFO.telebirr + "</code>",
      "",
      "🏦 <b>የኢትዮጵያ ንግድ ባንክ (CBE):</b>",
      "የሂሳብ ቁጥር: <code>" + PAYMENT_INFO.cbe + "</code>",
      "",
      "⚠️ <b>ማሳሰቢያ፦</b>",
      "ገንዘቡን ካስተላለፉ በኋላ የደረሰኝ ስክሪንሾት ወይም የግብይት ቁጥሩን ከቴሌግራም መለያዎ (ID: <code>" + userId + "</code>) ጋር ለድጋፍ ሰጪያችን <b>" + PAYMENT_INFO.supportAdmin + "</b> ይላኩ።"
    ].join("\n");

    const inlineDep = {
      inline_keyboard: [
        [{ text: "💬 ደረሰኝ ለአድሚን ለመላክ", url: "https://t.me/" + PAYMENT_INFO.supportAdmin.replace("@", "") }],
      ],
    };

    await sendMessage(chatId, msg, inlineDep);
    return;
  }

  // 4. 📤 ወጪ ማድረግ
  if (text === "/withdraw" || text.includes("withdraw") || text.includes("ወጪ")) {
    const balanceStr = (user.balance || 0).toFixed(2);
    const msg = [
      "📤 <b>ያሸነፉትን ገንዘብ ወጪ ማድረጊያ</b>",
      "",
      "• <b>ያለዎት ቀሪ ሂሳብ:</b> " + balanceStr + " ETB",
      "• <b>ዝቅተኛ የወጪ መጠን:</b> " + PAYMENT_INFO.minWithdraw + " ETB",
      "• <b>የክፍያ ጊዜ:</b> ከ 5 እስከ 15 ደቂቃዎች ውስጥ",
      "",
      "ገንዘብ ወጪ ለማድረግ የሚፈልጉትን የብር መጠን እና የቴሌብር ቁጥርዎን ለአድሚን <b>" + PAYMENT_INFO.supportAdmin + "</b> ይላኩ።"
    ].join("\n");

    const inlineWith = {
      inline_keyboard: [
        [{ text: "📤 ወጪ ለማዘዝ አድሚንን ያነጋግሩ", url: "https://t.me/" + PAYMENT_INFO.supportAdmin.replace("@", "") }],
      ],
    };

    await sendMessage(chatId, msg, inlineWith);
    return;
  }

  // 5. 🤝 ጓደኛ ይጋብዙ
  if (text === "/referral" || text.includes("referral") || text.includes("ጋብዝ") || text.includes("ጓደኛ")) {
    const refLink = "https://t.me/Phoenix_Bingo_Bot?start=ref_" + userId;
    const msg = [
      "🤝 <b>ጓደኛዎን ይጋብዙ — ነፃ ቦነስ ያግኙ!</b>",
      "",
      "ለእያንዳንዱ በእርስዎ ሊንክ ለሚመዘገብ ጓደኛ <b>" + PAYMENT_INFO.referralBonus + " ETB</b> ነፃ ቦነስ ያገኛሉ!",
      "",
      "🔗 <b>የእርስዎ መጋበዣ ሊንክ፦</b>",
      "<code>" + refLink + "</code>"
    ].join("\n");

    const inlineShare = {
      inline_keyboard: [
        [{ text: "📤 ሊንኩን ለጓደኛ አጋራ (Share)", url: "https://t.me/share/url?url=" + encodeURIComponent(refLink) + "&text=" + encodeURIComponent("🔥 ና እዚህ ፈጣን የቀጥታ ካርቴላ ቢንጎ እንጫወት!") }],
      ],
    };

    await sendMessage(chatId, msg, inlineShare);
    return;
  }

  // 6. 🆘 እርዳታ
  if (text === "/help" || text.includes("help") || text.includes("እርዳታ") || text.includes("ድጋፍ")) {
    const msg = "🆘 <b>የደንበኞች ድጋፍ እና እርዳታ</b>\n\nማንኛውም ጥያቄ ወይም በክፍያ ዙሪያ ችግር ካጋጠመዎት አድሚናችንን ያነጋግሩ፦\n👉 <b>" + PAYMENT_INFO.supportAdmin + "</b>";
    await sendMessage(chatId, msg);
    return;
  }

  // 7. 👤 ፕሮፋይል
  if (text.includes("ፕሮፋይል")) {
    const msg = [
      "👤 <b>የተጠቃሚ ፕሮፋይል (Profile)</b>",
      "",
      "• <b>ስም:</b> " + userName,
      "• <b>የቴሌግራም ID:</b> <code>" + userId + "</code>",
      "• <b>የአካውንት ደረጃ:</b> ቪአይፒ (VIP Player) ⭐",
      "• <b>ዳታቤዝ:</b> MongoDB Atlas Cloud ✅"
    ].join("\n");
    await sendMessage(chatId, msg);
    return;
  }

  // 8. 🗣 ድርጅቱን አስተዋውቅ
  if (text.includes("አስተዋውቅ")) {
    const msg = "🦅 <b>ስለ ፊኒክስ ቢንጎ (About Phoenix Bingo)</b>\n\nፊኒክስ ቢንጎ በኢትዮጵያ ውስጥ ፈጣን፣ አስተማማኝ እና ፍትሃዊ የቀጥታ የካርቴላ ቢንጎ ጨዋታ መድረክ ነው።\n• 24/7 ፈጣን የቴሌብር እና የባንክ ክፍያዎች\n• ትላልቅ የጃክፖት ሽልማቶች";
    await sendMessage(chatId, msg);
    return;
  }

  // 9. 📖 መመሪያ
  if (text.includes("መመሪያ")) {
    const msg = [
      "📖 <b>የካርቴላ ቢንጎ አጨዋወት መመሪያ</b>",
      "",
      "1. <b>ካርቴላ ይምረጡ፦</b> ጨዋታው ከመጀመሩ በፊት የሚፈልጉትን ካርቴላ ይግዙ።",
      "2. <b>ቁጥሮችን ይከታተሉ፦</b> የሚወጡትን እጣ ቁጥሮች በካርቴላዎ ላይ ያመሳክሩ።",
      "3. <b>ቢንጎ ይበሉ፦</b> መስመር ሲሞላ ቢንጎ ብለው ያሸንፉ!"
    ].join("\n");
    await sendMessage(chatId, msg);
    return;
  }

  // 10. 📜 ደንቦች
  if (text.includes("ደንብ")) {
    const msg = [
      "📜 <b>የፕላትፎርሙ ደንቦች</b>",
      "",
      "1. እድሜያቸው ከ 18 ዓመት በላይ ለሆኑ ብቻ የተፈቀደ ነው።",
      "2. የሀሰት ደረሰኝ ማቅረብ ከአካውንት ያግዳል!",
      "3. ያሸነፉት ገንዘብ ያለምንም ቅድመ ሁኔታ ወዲያውኑ ይከፈላል።"
    ].join("\n");
    await sendMessage(chatId, msg);
    return;
  }

  // 11. 🌐 ቋንቋ
  if (text.includes("ቋንቋ")) {
    await sendMessage(chatId, "🇪🇹 <b>የአሁኑ ቋንቋ፦</b> አማርኛ (Amharic)");
    return;
  }

  await sendMessage(chatId, "ሰላም " + userName + "፣ ከታች ያሉትን አማራጮች በመጠቀም ይምረጡ፦");
}

let offset = 0;
async function pollUpdates() {
  console.log("🚀 Phoenix Bingo Bot is starting polling...");
  await getDatabase();
  await setBotCommands();
  console.log("✅ Polling loop active. Listening for updates!");

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
