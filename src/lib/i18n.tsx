import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "am" | "en";

const dict = {
  // shell / nav
  home: { en: "Home", am: "መነሻ" },
  tickets: { en: "Tickets", am: "ካርቴላ" },
  wallet: { en: "Wallet", am: "ቦርሳ" },
  rank: { en: "Rank", am: "ደረጃ" },
  profile: { en: "Profile", am: "መገለጫ" },

  // lobby
  playWallet: { en: "Play Wallet", am: "የጨዋታ ቦርሳ" },
  mainWallet: { en: "Main Wallet", am: "ዋና ቦርሳ" },
  brandSub: { en: "PHOENIX BINGO", am: "ፊኒክስ ቢንጎ" },
  gameStarting: { en: "Game is Starting", am: "ጨዋታው ሊጀምር ነው" },
  jackpot: { en: "Jackpot", am: "ደራሽ" },
  bonusSoon: { en: "Bonus Coming Soon", am: "ጉርሻ በቅርቡ ይጠበቅ" },
  selectTickets: { en: "Select Tickets", am: "ካርቴላ ይምረጡ" },
  live: { en: "LIVE", am: "በቀጥታ" },
  play: { en: "Play Now", am: "አሁን ይጫወቱ" },
  selected: { en: "selected", am: "ተመርጠዋል" },

  // game
  round: { en: "Round", am: "ዙር" },
  stake: { en: "Stake", am: "መወራረጃ" },
  prize: { en: "Prize", am: "ሽልማት" },
  balls: { en: "Balls", am: "እጣ" },
  currentNumber: { en: "Current Drawn Number", am: "አሁን የወጣው ቁጥር" },
  lastNumbers: { en: "Last 5 numbers", am: "የመጨረሻ 5 ቁጥሮች" },
  myTicket: { en: "My Ticket", am: "የእኔ ካርቴላ" },
  waiting: { en: "Waiting…", am: "በመጠበቅ ላይ…" },
  noDraws: { en: "No previous draws yet", am: "እስካሁን የወጣ ቁጥር የለም" },
  claimBingo: { en: "Claim Bingo!", am: "ቢንጎ ይጠይቁ!" },
  markHint: { en: "Tap your numbers as they are drawn", am: "ቁጥሮች ሲወጡ ምልክት ያድርጉ" },
  backToLobby: { en: "Back to lobby", am: "ወደ መነሻ ተመለስ" },

  // winner
  winnerEyebrow: { en: "The prize has been won…", am: "ሽልማት ገቢ እየተደረገ ነው…" },
  winnerLabel: { en: "WINNER", am: "አሸናፊ" },
  congrats: { en: "Congratulations!", am: "በጋራ አሸንፈዋል!" },
  totalPrize: { en: "Total prize won", am: "ጠቅላላ የደራሽ ሽልማት" },
  winners: { en: "Winners", am: "አሸናፊዎች" },
  ticketShort: { en: "Ticket", am: "ካርቴላ" },
  playNext: { en: "Play Next Round", am: "ቀጣይ ዙር ይጫወቱ" },

  // wallet
  deposit: { en: "Deposit", am: "ገቢ" },
  withdraw: { en: "Withdraw", am: "ወጪ" },
  transactions: { en: "Transaction History", am: "የግብይት ታሪክ" },
  amount: { en: "Amount (ETB)", am: "መጠን (ብር)" },
  method: { en: "Payment method", am: "የክፍያ መንገድ" },
  confirm: { en: "Confirm", am: "አረጋግጥ" },
  noTx: { en: "No transactions yet", am: "እስካሁን ግብይት የለም" },

  // rank
  leaderboard: { en: "Top 10 Players", am: "ምርጥ 10 ተጫዋቾች" },
  thisWeek: { en: "This week", am: "በዚህ ሳምንት" },
  wins: { en: "wins", am: "ድሎች" },

  // profile
  referral: { en: "Referral link", am: "የግብዣ ሊንክ" },
  copy: { en: "Copy", am: "ቅዳ" },
  copied: { en: "Copied!", am: "ተቀድቷል!" },
  gamesPlayed: { en: "Games played", am: "የተጫወቷቸው" },
  totalWon: { en: "Total won", am: "ጠቅላላ ያሸነፉት" },
  guide: { en: "Game guide & rules", am: "የጨዋታ መመሪያ እና ህጎች" },
  promo: { en: "Promo code", am: "የፕሮሞ ኮድ" },
  apply: { en: "Apply", am: "ተጠቀም" },
  changePassword: { en: "Change password", am: "የይለፍ ቃል ቀይር" },
  logout: { en: "Log out", am: "ውጣ" },
  starting: { en: "Round starting…", am: "ዙር እየጀመረ ነው…" },

  // test panel
  testControls: { en: "UI Test Controls", am: "የሙከራ መቆጣጠሪያ" },
  simulateDraw: { en: "Simulate Draw", am: "ዕጣ አውጣ" },
  resetBoard: { en: "Reset Board", am: "ካርቴላ ቀይር" },
} as const;

export type TKey = keyof typeof dict;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "am",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("am");

  useEffect(() => {
    const saved = window.localStorage.getItem("pb-lang");
    if (saved === "am" || saved === "en") setLang(saved);
  }, []);

  const update = (l: Lang) => {
    setLang(l);
    try {
      window.localStorage.setItem("pb-lang", l);
    } catch {
      /* no-op */
    }
  };

  return <LangContext.Provider value={{ lang, setLang: update }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const { lang, setLang } = useContext(LangContext);
  const t = (key: TKey) => dict[key][lang];
  return { lang, setLang, t };
}
