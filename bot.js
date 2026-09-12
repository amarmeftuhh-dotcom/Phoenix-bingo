/**
 * Phoenix Bingo - Production Telegram Bot Server
 * Single-Instance Polling, Clean Single Messages, 15 ETB Play Wallet, Password Generation.
 */

import https from "node:https";
import http from "node:http";
import { MongoClient } from "mongodb";

// 1. Render Web Service Health Check Server
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Phoenix Bingo Bot is running 24/7 with MongoDB Atlas!\n");
}).listen(PORT, () => {
  console.log("HTTP health-check server listening on port " + PORT);
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
