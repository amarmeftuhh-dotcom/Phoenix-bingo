import { useState, Dispatch, SetStateAction } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet as WalletIcon,
  Check,
  ShieldCheck,
  History,
  Zap,
  Smartphone,
  Building2,
  CreditCard,
  Sparkles,
  Copy,
  ClipboardPaste,
  AlertTriangle,
} from "lucide-react";
import { LangToggle } from "@/components/phoenix/LangToggle";
import { useLang } from "@/lib/i18n";
import { buzz } from "@/lib/bingo";
import { cn } from "@/lib/utils";

interface WalletViewProps {
  mainWallet?: number;
  setMainWallet?: Dispatch<SetStateAction<number>>;
  playWallet?: number;
  setPlayWallet?: Dispatch<SetStateAction<number>>;
}

const METHODS = [
  {
    id: "telebirr",
    label: "Telebirr",
    subtitle: "Ethio Telecom Instant",
    accountNumber: "0932849138",
    accountHolder: "Phoenix VIP Official",
    icon: Smartphone,
    color: "from-sky-500/20 to-blue-600/20 text-sky-400 border-sky-500/40",
    badge: "Instant ⚡",
  },
  {
    id: "cbe",
    label: "CBE / Commercial Bank",
    subtitle: "Commercial Bank of Ethiopia",
    accountNumber: "1000492819382",
    accountHolder: "Phoenix Entertainment PLC",
    icon: Building2,
    color: "from-purple-500/20 to-amber-600/20 text-amber-400 border-amber-500/40",
    badge: "24/7 Auto",
  },
  {
    id: "mpesa",
    label: "M-Pesa Safaricom",
    subtitle: "Safaricom Ethiopia",
    accountNumber: "0712938491",
    accountHolder: "Phoenix Safaricom M-Pesa",
    icon: CreditCard,
    color: "from-emerald-500/20 to-teal-600/20 text-emerald-400 border-emerald-500/40",
    badge: "Fast 🚀",
  },
];

const INITIAL_TX = [
  {
    id: "TX-9982",
    kind: "deposit",
    label: "Telebirr Deposit (ገቢ)",
    method: "Telebirr",
    amount: 100,
    when: "Today · 20:41",
    status: "Approved",
  },
  {
    id: "TX-9941",
    kind: "stake",
    label: "Round #9398 Cartelas (መጫወቻ)",
    method: "Bingo",
    amount: -40,
    when: "Today · 20:12",
    status: "Completed",
  },
  {
    id: "TX-9910",
    kind: "win",
    label: "🏆 BINGO WIN (አሸናፊ) · Round #9391",
    method: "Jackpot",
    amount: 2029.4,
    when: "Yesterday · 22:03",
    status: "Won",
  },
  {
    id: "TX-9875",
    kind: "withdraw",
    label: "CBE Birr Payout (ወጪ)",
    method: "CBE",
    amount: -500,
    when: "Aug 1 · 09:20",
    status: "Approved",
  },
  {
    id: "TX-9812",
    kind: "deposit",
    label: "M-Pesa Deposit (ገቢ)",
    method: "M-Pesa",
    amount: 250,
    when: "Jul 31 · 18:44",
    status: "Approved",
  },
];

export function WalletView({
  mainWallet = 70.0,
  setMainWallet,
  playWallet = 25.0,
  setPlayWallet,
}: WalletViewProps) {
  const { t } = useLang();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [method, setMethod] = useState("telebirr");
  const [amount, setAmount] = useState("");
  const [smsText, setSmsText] = useState("");
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [done, setDone] = useState(false);
  const [txFilter, setTxFilter] = useState<"all" | "deposit" | "withdraw" | "win">("all");
  const [txList, setTxList] = useState(INITIAL_TX);
  const [localMain, setLocalMain] = useState(mainWallet);

  const currentBalance = setMainWallet ? mainWallet : localMain;
  const currentBankObj = METHODS.find((m) => m.id === method) || METHODS[0]!;

  const handleCopyAccount = async () => {
    buzz(10);
    try {
      await navigator.clipboard.writeText(currentBankObj.accountNumber);
      setCopiedAcc(true);
      setTimeout(() => setCopiedAcc(false), 2000);
    } catch {
      alert(`የባንክ ቁጥር: ${currentBankObj.accountNumber}`);
    }
  };

  const handlePasteSMS = async () => {
    buzz(8);
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clip = await navigator.clipboard.readText();
        if (clip) {
          setSmsText(clip);
          const match =
            clip.match(/(\d+(\.\d+)?)\s*(ETB|ብር|birr)/i) ||
            clip.match(/(ETB|ብር|birr)\s*(\d+(\.\d+)?)/i);
          if (match) {
            const parsedNum = parseFloat(match[1] || match[2] || "0");
            if (parsedNum > 0) setAmount(String(parsedNum));
          }
          return;
        }
      }
      alert(
        "ስልክዎ Paste በተንን አይፈቅድም! እባክዎ ባዶ ሳጥኑ ላይ በጣታዎ ጫን ብለው 'Paste' የሚለውን ይምረጡ።"
      );
    } catch {
      alert(
        "እባክዎ ከባንክ የተላከሎትን የSMS ማረጋገጫ በሳጥኑ ውስጥ በጣታዎ ጫን ብለው Paste ያድርጉ።"
      );
    }
  };

  const submit = () => {
    buzz([10, 30, 10]);
    const num = parseFloat(amount) || 0;
    if (num <= 0) return;

    if (mode === "deposit") {
      const bonus = num >= 100 ? num * 0.2 : 0;

      if (setMainWallet) {
        setMainWallet((b) => b + num);
      } else {
        setLocalMain((b) => b + num);
      }

      if (bonus > 0 && setPlayWallet) {
        setPlayWallet((p) => p + bonus);
      }

      setTxList((prev) => [
        {
          id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
          kind: "deposit",
          label: `${currentBankObj.label} Deposit (ገቢ)`,
          method: currentBankObj.label,
          amount: num,
          when: "Just now",
          status: "Approved",
        },
        ...prev,
      ]);
    } else {
      if (num > currentBalance) {
        alert("በዋና ሂሳብዎ ላይ በቂ ቀሪ ሂሳብ የለም!");
        return;
      }
      if (setMainWallet) {
        setMainWallet((b) => Math.max(0, b - num));
      } else {
        setLocalMain((b) => Math.max(0, b - num));
      }
      setTxList((prev) => [
        {
          id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
          kind: "withdraw",
          label: `${currentBankObj.label} Payout (ወጪ)`,
          method: currentBankObj.label,
          amount: -num,
          when: "Just now",
          status: "Approved",
        },
        ...prev,
      ]);
    }

    setDone(true);
    setAmount("");
    setSmsText("");
    setTimeout(() => setDone(false), 2500);
  };

  const filteredTx = txList.filter((tx) => {
    if (txFilter === "all") return true;
    if (txFilter === "deposit") return tx.kind === "deposit";
    if (txFilter === "withdraw") return tx.kind === "withdraw";
    if (txFilter === "win") return tx.kind === "win" || tx.kind === "stake";
    return true;
  });

  return (
    <div className="mx-auto min-h-screen min-h-[100dvh] w-full max-w-2xl overflow-x-hidden pb-32">
      {/* Top Bar Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pt-5">
        <div>
          <h1 className="truncate text-xl font-black tracking-tight text-fire">
            {t("wallet")}
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Phoenix Financial Portal
          </p>
        </div>
        <LangToggle />
      </div>

      {/* Main Balance Hero Card */}
      <div className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-b from-amber-950/40 via-card to-background p-5 shadow-glow-gold/10 backdrop-blur-md">
          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gold/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-gold">
              <Sparkles className="h-3.5 w-3.5 text-gold animate-pulse" />
              {t("mainWallet")} (Withdrawable)
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              Secured 24/7
            </span>
          </div>

          <div className="relative mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black tabular-nums tracking-tight text-gold">
              {currentBalance.toFixed(2)}
            </span>
            <span className="text-sm font-black text-amber-400">ETB</span>
          </div>

          {/* Sub-balances Grid */}
          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <div className="flex flex-col rounded-2xl border border-border/80 bg-black/40 p-3 backdrop-blur-sm">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <WalletIcon className="h-3 w-3 text-cyan-400" />
                {t("playWallet")}
              </span>
              <span className="mt-1 text-base font-black tabular-nums text-cyan-400">
                {playWallet.toFixed(2)}{" "}
                <span className="text-[10px] font-bold text-muted-foreground">ETB</span>
              </span>
            </div>

            <div className="flex flex-col rounded-2xl border border-border/80 bg-black/40 p-3 backdrop-blur-sm">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Zap className="h-3 w-3 text-emerald-400" />
                Instant Payout
              </span>
              <span className="mt-1 text-base font-black text-emerald-400">
                0% Fee ⚡
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher: Deposit / Withdraw */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-border/80 bg-secondary/50 p-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => {
              buzz(8);
              setMode("deposit");
            }}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 border",
              mode === "deposit"
                ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400 shadow-glow-gold/10"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowDownToLine className="h-4 w-4" />
            {t("deposit")}
          </button>

          <button
            type="button"
            onClick={() => {
              buzz(8);
              setMode("withdraw");
            }}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 border",
              mode === "withdraw"
                ? "border-amber-500/60 bg-amber-500/20 text-amber-400 shadow-glow-gold/10"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowUpFromLine className="h-4 w-4" />
            {t("withdraw")}
          </button>
        </div>

        {/* Dynamic Deposit / Withdraw Special Banner */}
        {mode === "deposit" ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 p-3 text-xs font-bold text-gold">
            <span className="text-lg">🎁</span>
            <div>
              <p className="font-black text-amber-300 uppercase">
                ልዩ ስጦታ (Special 20% Bonus)
              </p>
              <p className="text-[11px] text-amber-200/90 leading-tight">
                ከ 100 ብር ጀምሮ ገቢ ሲያደርጉ ተጨማሪ 20% የጨዋታ ጉርሻ ወዲያውኑ ያገኛሉ!
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-red-500/40 bg-red-950/30 p-3 text-xs font-bold text-red-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-black text-red-300 uppercase">የደህንነት ማሳሰቢያ</p>
              <p className="text-[11px] text-red-200/90 leading-tight">
                ገንዘብ ወጪ የሚደረገው በተመዘገቡበት ስልክ ቁጥር ወደ ቴሌብር፣ ንግድ ባንክ ወይም ሳፋሪኮም ብቻ ነው።
              </p>
            </div>
          </div>
        )}

        {/* Deposit / Withdraw Interactive Form */}
        <div className="mt-3 rounded-3xl border border-border/80 bg-surface-grad p-4.5 shadow-card-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            1. {t("method")} (ባንክ ይምረጡ)
          </p>

          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {METHODS.map((m) => {
              const IconComponent = m.icon;
              const isSelected = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    buzz(8);
                    setMethod(m.id);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition-all active:scale-[0.96]",
                    isSelected
                      ? "border-gold bg-gold/15 shadow-glow-gold/20 font-black text-gold"
                      : "border-border/60 bg-secondary/40 hover:bg-secondary/70 text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br border mb-1",
                      m.color
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-black leading-tight text-foreground">
                    {m.label.split(" ")[0]}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {m.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Copy Account Box */}
          {mode === "deposit" && (
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-gold/50 bg-black/60 p-3 shadow-inner">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  የባንክ አካውንት / ስልክ ({currentBankObj.label})
                </p>
                <p className="text-sm font-black text-gold tabular-nums tracking-wider mt-0.5">
                  {currentBankObj.accountNumber}
                </p>
                <p className="text-[10px] font-bold text-white/80">
                  {currentBankObj.accountHolder}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyAccount}
                className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-400 via-gold to-yellow-500 px-3 py-1.5 text-xs font-black text-black shadow-sm active:scale-95"
              >
                {copiedAcc ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedAcc ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              2. {t("amount")} (ETB)
            </label>
            <span className="text-[10px] font-bold text-gold">
              {mode === "withdraw"
                ? `Available: ${currentBalance.toFixed(2)} ETB`
                : "Min: 50 ETB"}
            </span>
          </div>

          <div className="relative mt-1.5">
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="0.00"
              className="min-h-13 w-full rounded-2xl border border-border/80 bg-background/80 px-4 text-xl font-black tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-gold focus:ring-1 focus:ring-gold"
            />
            <span className="absolute right-4 top-3.5 text-xs font-black text-muted-foreground">
              ETB
            </span>
          </div>

          {/* Quick Amount Selector Chips */}
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {[50, 100, 250, 500].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  buzz(6);
                  setAmount(String(v));
                }}
                className={cn(
                  "min-h-9 rounded-xl border border-border/60 bg-secondary/60 text-xs font-black tabular-nums text-foreground/90 transition-all hover:border-gold/50 active:scale-95",
                  amount === String(v) && "border-gold bg-gold/20 text-gold font-extrabold"
                )}
              >
                +{v}
              </button>
            ))}
          </div>

          {/* SMS Paste for Deposit */}
          {mode === "deposit" && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  3. የባንክ SMS ማረጋገጫ (Paste SMS Confirmation)
                </label>
                <button
                  type="button"
                  onClick={handlePasteSMS}
                  className="flex items-center gap-1 text-[10px] font-bold text-gold hover:underline"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  <span>Paste SMS</span>
                </button>
              </div>
              <textarea
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder="ከቴሌብር ወይም ባንክ የተላከሎትን የ SMS ማረጋገጫ እዚህ ይለጥፉ..."
                rows={2}
                className="w-full rounded-2xl border border-border/80 bg-black/60 p-3 text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>
          )}

          <button
            type="button"
            disabled={
              !amount ||
              parseFloat(amount) <= 0 ||
              (mode === "withdraw" && parseFloat(amount) > currentBalance)
            }
            onClick={submit}
            className={cn(
              "mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl font-black uppercase tracking-wider transition-all shadow-glow-gold active:scale-98 disabled:opacity-40 disabled:shadow-none text-black",
              mode === "deposit"
                ? "bg-gradient-to-r from-emerald-400 via-gold to-emerald-400"
                : "bg-gradient-to-r from-amber-500 via-gold to-amber-500"
            )}
          >
            {done ? <Check className="h-5 w-5 stroke-[3]" /> : null}
            {done
              ? "Completed (ተጠናቋል)!"
              : mode === "deposit"
              ? `ገቢ አድርግ (SUBMIT ${amount || "0"} ETB)`
              : `ወጪ አድርግ (WITHDRAW ${amount || "0"} ETB)`}
          </button>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-black text-foreground">
              {t("transactions")}
            </h2>
          </div>
          <span className="text-[10px] font-bold text-emerald-400">
            ● Live Sync
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {(
            [
              { id: "all", label: "All TXs" },
              { id: "deposit", label: "Deposits" },
              { id: "withdraw", label: "Withdrawals" },
              { id: "win", label: "Wins & Stakes" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                buzz(6);
                setTxFilter(f.id);
              }}
              className={cn(
                "rounded-xl px-3 py-1 text-[10px] font-bold transition-all border shrink-0",
                txFilter === f.id
                  ? "border-gold bg-gold/20 text-gold font-extrabold"
                  : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Transaction Items */}
        <div className="mt-2 space-y-2">
          {filteredTx.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-xs font-bold text-muted-foreground">
              ምንም ታሪክ አልተገኘም (No transactions found)
            </div>
          ) : (
            filteredTx.map((tx) => {
              const isPositive = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface-grad p-3 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-xs font-black",
                        isPositive
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      )}
                    >
                      {isPositive ? "↓" : "↑"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-foreground">
                        {tx.label}
                      </p>
                      <p className="truncate text-[10px] font-bold text-muted-foreground">
                        {tx.id} • {tx.when}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "text-sm font-black tabular-nums",
                        isPositive ? "text-emerald-400" : "text-amber-400"
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {tx.amount.toFixed(2)} ETB
                    </span>
                    <p className="text-[9px] font-bold text-emerald-400/90">
                      ● {tx.status}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
