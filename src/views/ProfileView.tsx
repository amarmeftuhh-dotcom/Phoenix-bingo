import { useState } from "react";
import {
  Bird,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Gift,
  KeyRound,
  LogOut,
  Share2,
  Lock,
  Volume2,
  VolumeX,
  Vibrate,
  ShieldCheck,
  Send,
  Sparkles,
  Trophy,
  AlertTriangle,
  Shield,
  Landmark,
  UserCheck,
  Calendar,
  History,
  Target,
  FileText,
  Edit3,
  Flame,
} from "lucide-react";
import { LangToggle } from "@/components/phoenix/LangToggle";
import { WinningPatterns } from "@/components/phoenix/WinningPatterns";
import { useLang } from "@/lib/i18n";
import { buzz } from "@/lib/bingo";
import { cn } from "@/lib/utils";
import { isSoundMuted, setSoundMuted, playBallChime } from "@/lib/sound";
import { getStoredPlayer, saveStoredPlayer, addPlayerActivityLog, WeeklyActivityLog } from "@/lib/platformStore";

const REF_LINK = "https://t.me/Phoenix_Bingo_Bot?start=ref_AMAR932";

export function ProfileView({
  onOpenPromoModal,
  onNavigateAdmin,
  onNavigateFinance,
}: {
  onOpenPromoModal?: () => void;
  onNavigateAdmin?: () => void;
  onNavigateFinance?: () => void;
}) {
  const { t } = useLang();
  const [player, setPlayer] = useState(getStoredPlayer());
  const [copied, setCopied] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [openRules, setOpenRules] = useState(false);
  const [openPassModal, setOpenPassModal] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passDone, setPassDone] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(!isSoundMuted());
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Weekly Profile Customization State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(player.avatarIcon || "🦅");
  const [selectedBadge, setSelectedBadge] = useState(player.weeklyBadge || "የሳምንቱ አሸናፊ 🏆");
  const [luckyNumber, setLuckyNumber] = useState<number>(player.luckyNumber || 7);
  const [weeklyNote, setWeeklyNote] = useState(player.weeklyFileNote || "የዚህ ሳምንት ግብ፡ 1000 ETB ጃክፖት ማሸነፍ!");
  const [saveToast, setSaveToast] = useState(false);

  const AVATAR_OPTIONS = [
    { icon: "🦅", label: "Phoenix ፌኒክስ" },
    { icon: "🦁", label: "Lion አንበሳ" },
    { icon: "🔥", label: "Fire እሳት" },
    { icon: "👑", label: "Crown ንጉሥ" },
    { icon: "⚡", label: "Lightning መብረቅ" },
    { icon: "💎", label: "Diamond አልማዝ" },
    { icon: "🎯", label: "Sniper አነጣጣሪ" },
    { icon: "🚀", label: "Rocket ሮኬት" },
  ];

  const BADGE_OPTIONS = [
    "የሳምንቱ አሸናፊ 🏆",
    "Gold Hunter 💰",
    "የቢንጎ ጌታ 👑",
    "Lucky Star 🌟",
    "Speed Striker ⚡",
    "Master Phoenix 🦅",
  ];

  const handleSaveWeeklyProfile = () => {
    buzz([15, 30]);
    const updated = {
      ...player,
      avatarIcon: selectedAvatar,
      weeklyBadge: selectedBadge,
      luckyNumber: luckyNumber,
      weeklyFileNote: weeklyNote,
    };
    saveStoredPlayer(updated);
    setPlayer(updated);
    setIsEditingProfile(false);
    addPlayerActivityLog({
      type: "weekly_bonus",
      title: "የሳምንቱ ፕሮፋይል ተዘምኗል (Profile Updated)",
      description: `አዲስ ባጅ: ${selectedBadge} • ዕድለኛ ቁጥር: ${luckyNumber}`,
    });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const toggleSound = () => {
    buzz(10);
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundMuted(!next);
    if (next) {
      playBallChime(false);
    }
  };

  const copy = async () => {
    buzz(10);
    try {
      await navigator.clipboard.writeText(REF_LINK);
    } catch {
      /* no-op */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const applyPromo = () => {
    buzz(10);
    setPromoSuccess(true);
    setTimeout(() => {
      setPromoSuccess(false);
      setPromo("");
    }, 2200);
  };

  const handlePasswordChange = () => {
    buzz([10, 30, 10]);
    setPassDone(true);
    setTimeout(() => {
      setPassDone(false);
      setOpenPassModal(false);
      setOldPass("");
      setNewPass("");
    }, 1500);
  };

  return (
    <div className="mx-auto min-h-screen min-h-[100dvh] w-full max-w-2xl overflow-x-hidden pb-32">
      {/* Save Success Toast */}
      {saveToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border border-emerald-500 bg-emerald-950/95 px-4 py-2.5 text-xs font-black text-emerald-300 shadow-2xl backdrop-blur-md animate-in fade-in">
          <Check className="h-4 w-4 text-emerald-400 stroke-[3]" />
          <span>✅ የሳምንቱ ፕሮፋይል እና ምርጫዎ በሚገባ ተቀምጧል!</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pt-5">
        <div>
          <h1 className="truncate text-xl font-black tracking-tight text-fire">
            {t("profile")}
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Phoenix VIP Member • የራስዎ መለያ ገፅ
          </p>
        </div>
        <LangToggle />
      </div>

      {/* Identity & VIP Status Banner */}
      <div className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-b from-amber-950/40 via-card to-background p-5 shadow-glow-gold/10 backdrop-blur-md">
          <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-36 w-36 rounded-full bg-gold/20 blur-3xl" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative select-none">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-primary to-orange-600 p-0.5 shadow-glow-fire">
                  <div className="grid h-full w-full place-items-center rounded-[14px] bg-background text-2xl">
                    {player.avatarIcon || "🦅"}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-[10px] font-black text-black">
                  🔥
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-lg font-black text-foreground">{player.name || "ተጫዋች"}</p>
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-black text-gold border border-gold/30">
                    VIP Lv.3
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-primary/30">
                    {player.weeklyBadge || "የሳምንቱ አሸናፊ 🏆"}
                  </span>
                  <span className="text-[11px] font-extrabold text-gold">
                    ዕድለኛ ቁጥር: #{player.luckyNumber || 7}
                  </span>
                </div>
                <p className="text-xs font-bold text-muted-foreground mt-0.5">
                  {player.phone ? `${player.phone.slice(0, 4)}***${player.phone.slice(-3)}` : "ስልክ አልተያያዘም"} • #{player.id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </span>
              <button
                type="button"
                onClick={() => {
                  buzz(10);
                  setIsEditingProfile(!isEditingProfile);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-gold/40 bg-gold/15 px-2.5 py-1 text-[10px] font-black text-gold hover:bg-gold/30 active:scale-95 transition-all"
              >
                <Edit3 className="h-3 w-3" />
                {isEditingProfile ? "ዝጋ" : "አስተካክል"}
              </button>
            </div>
          </div>

          {/* Player Personal Weekly Memo */}
          {player.weeklyFileNote && (
            <div className="relative mt-3.5 flex items-center gap-2 rounded-2xl border border-border/80 bg-black/40 px-3.5 py-2 text-xs font-medium text-amber-200/90">
              <FileText className="h-4 w-4 text-gold shrink-0" />
              <span className="italic truncate">"{player.weeklyFileNote}"</span>
            </div>
          )}

          {/* Level Progress */}
          <div className="relative mt-4 space-y-1">
            <div className="flex justify-between text-[10px] font-black text-muted-foreground">
              <span>Phoenix Flame Level 3</span>
              <span className="text-gold">1,250 / 2,000 XP</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-gold to-primary"
                style={{ width: "62.5%" }}
              />
            </div>
          </div>

          {/* Player Stats 2x2 Grid */}
          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border/80 bg-black/40 p-3 text-center backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                {t("gamesPlayed")}
              </p>
              <p className="mt-0.5 text-xl font-black tabular-nums text-foreground">
                {player.gamesPlayed || 0}
              </p>
            </div>

            <div className="rounded-2xl border border-gold/40 bg-gold/10 p-3 text-center backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                {t("totalWon")}
              </p>
              <p className="mt-0.5 text-xl font-black tabular-nums text-gold">
                {(player.totalWon || 0).toFixed(2)} <span className="text-[10px]">ETB</span>
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-black/40 p-3 text-center backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                Win Rate
              </p>
              <p className="mt-0.5 text-xl font-black tabular-nums text-emerald-400">
                15.3%
              </p>
            </div>

            <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3 text-center backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                Win Streak
              </p>
              <p className="mt-0.5 text-xl font-black tabular-nums text-primary flex items-center justify-center gap-1">
                <Trophy className="h-4 w-4 text-primary" />
                3 Wins 🔥
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Profile Customization Card */}
      {isEditingProfile && (
        <div className="px-4 pt-3 animate-in fade-in slide-in-from-top-3">
          <div className="rounded-3xl border-2 border-gold/60 bg-gradient-to-b from-amber-950/70 via-card to-background p-4 shadow-card-soft">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <span className="flex items-center gap-1.5 text-xs font-black text-gold uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-gold" />
                የሳምንቱ ፕሮፋይል ምርጫ (Weekly Profile File)
              </span>
              <span className="text-[10px] font-bold text-muted-foreground">
                በየሳምንቱ ይቀይሩ
              </span>
            </div>

            {/* 1. Avatar Selection */}
            <div className="mt-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                1. የአምሳል (Avatar) ምርጫ
              </label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av.icon}
                    type="button"
                    onClick={() => {
                      buzz(8);
                      setSelectedAvatar(av.icon);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 transition-all active:scale-95",
                      selectedAvatar === av.icon
                        ? "border-gold bg-gold/20 text-gold shadow-glow-gold/10"
                        : "border-border/60 bg-secondary/40 text-foreground hover:border-gold/40"
                    )}
                  >
                    <span className="text-2xl">{av.icon}</span>
                    <span className="text-[9px] font-extrabold truncate w-full text-center">{av.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Badge Selection */}
            <div className="mt-4">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                2. የሳምንቱ ማዕረግ / ባጅ (Weekly Badge)
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BADGE_OPTIONS.map((badge) => (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => {
                      buzz(8);
                      setSelectedBadge(badge);
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-xs font-extrabold transition-all active:scale-95",
                      selectedBadge === badge
                        ? "border-gold bg-gold text-black shadow-glow-gold/20 font-black"
                        : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Lucky Number Selection */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  3. ዕድለኛ ቁጥር (1-75)
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={75}
                    value={luckyNumber}
                    onChange={(e) => setLuckyNumber(Math.max(1, Math.min(75, parseInt(e.target.value, 10) || 1)))}
                    className="w-20 rounded-xl border border-gold/60 bg-black/60 px-3 py-2 text-center text-base font-black text-gold outline-none"
                  />
                  <span className="text-[10px] font-bold text-muted-foreground">
                    በጨዋታው ላይ ቅድሚያ ይጠቁራል
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  4. የሳምንቱ ማስታወሻ / ፋይል
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={weeklyNote}
                  onChange={(e) => setWeeklyNote(e.target.value)}
                  placeholder="የዚህ ሳምንት ግቤ..."
                  className="mt-1.5 w-full rounded-xl border border-border/80 bg-black/60 px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-gold"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveWeeklyProfile}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-gold to-yellow-500 py-3 text-xs font-black uppercase tracking-wider text-black shadow-glow-gold active:scale-95"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              ምርጫዬን መዝግብ (SAVE PROFILE)
            </button>
          </div>
        </div>
      )}

      {/* Weekly Activity Logs (ተጫዋቹ ያደረጋቸው ድርጊቶች ማሳያ) */}
      <div className="px-4 pt-3">
        <div className="rounded-3xl border border-border/80 bg-surface-grad p-4 shadow-card-soft">
          <div className="flex items-center justify-between pb-2">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <History className="h-3.5 w-3.5 text-primary" />
              የሳምንቱ ድርጊቶች ታሪክ (Activity History)
            </p>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold text-emerald-400 border border-emerald-500/30">
              Live Log
            </span>
          </div>

          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
            {player.weeklyLogs && player.weeklyLogs.length > 0 ? (
              player.weeklyLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-black/40 p-2.5 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-gold/10 text-gold font-black text-sm">
                      {log.type === "game_win" ? "🏆" : log.type === "deposit" ? "💳" : log.type === "ticket_bought" ? "🎟️" : "⭐"}
                    </div>
                    <div>
                      <p className="text-xs font-black text-foreground">{log.title}</p>
                      <p className="text-[10px] font-bold text-muted-foreground">{log.description}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground/80 shrink-0">
                    {log.timestamp}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-6 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-secondary/60 text-muted-foreground text-lg">
                  📋
                </div>
                <p className="mt-2 text-xs font-black text-muted-foreground">
                  እስካሁን ምንም የተመዘገበ ድርጊት የለም
                </p>
                <p className="text-[10px] font-bold text-muted-foreground/70">
                  ካርቴላ ሲገዙ፣ ሲያሸንፉና ገንዘብ ሲያስገቡ እዚህ ይዘረዘራሉ!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sound & Haptics Preferences */}
      <div className="px-4 pt-4">
        <div className="rounded-3xl border border-border/80 bg-surface-grad p-4 shadow-card-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pb-2">
            ድምፅና ንዝረት (Sound & Haptics)
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleSound}
              className={cn(
                "flex flex-col gap-1 rounded-2xl border p-3 transition-all active:scale-95 text-left",
                soundEnabled
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                  : "border-border/60 bg-secondary/40 text-muted-foreground"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black">
                  {soundEnabled ? "🔔 የጨዋታ ድምፅ (On)" : "🔇 ድምፅ ዝጋ (Off)"}
                </span>
                {soundEnabled ? (
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">
                {soundEnabled ? "ደወል በርቷል (Chimes active)" : "ድምፅ ጠፍቷል (Muted)"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                buzz(15);
                setVibrationEnabled(!vibrationEnabled);
              }}
              className={cn(
                "flex flex-col gap-1 rounded-2xl border p-3 transition-all active:scale-95 text-left",
                vibrationEnabled
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-border/60 bg-secondary/40 text-muted-foreground"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black">
                  {vibrationEnabled ? "📳 ንዝረት (On)" : "📳 ንዝረት (Off)"}
                </span>
                <Vibrate className="h-3.5 w-3.5" />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">
                {vibrationEnabled ? "ንዝረት በርቷል (Haptics active)" : "ንዝረት ጠፍቷል"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Referral Link Program */}
      <div className="px-4 pt-3">
        <div className="rounded-3xl border border-border/80 bg-surface-grad p-4 shadow-card-soft">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <Share2 className="h-3.5 w-3.5 text-primary" />
              {t("referral")} Program
            </p>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-extrabold text-primary border border-primary/30">
              +20 ETB Bonus
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate rounded-xl border border-border/80 bg-background/80 px-3 py-2.5 text-xs font-bold text-foreground/80">
              {REF_LINK}
            </p>
            <button
              type="button"
              onClick={copy}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-gold px-3.5 text-xs font-black uppercase tracking-wider text-black shadow-glow-gold active:scale-95"
            >
              {copied ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
          <p className="mt-2 text-[10px] font-bold text-muted-foreground">
            👥 12 Friends Invited • 240 ETB Total Earned from referrals
          </p>
        </div>
      </div>

      {/* Promo Code Section */}
      <div className="px-4 pt-3">
        <div className="rounded-3xl border border-border/80 bg-surface-grad p-4 shadow-card-soft">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Gift className="h-3.5 w-3.5 text-gold" />
            {t("promo")}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value.toUpperCase())}
              placeholder="PHOENIX50"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-border/80 bg-background/80 px-3 text-sm font-black uppercase tracking-wider text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground/40 focus:border-gold"
            />
            <button
              type="button"
              disabled={!promo}
              onClick={onOpenPromoModal || applyPromo}
              className="min-h-11 shrink-0 rounded-xl bg-gradient-to-r from-amber-500 via-gold to-amber-500 px-4 text-xs font-black uppercase tracking-wider text-black shadow-glow-gold active:scale-95 disabled:opacity-40 disabled:shadow-none"
            >
              {promoSuccess ? "Applied!" : t("apply")}
            </button>
          </div>
          {promoSuccess && (
            <p className="mt-2 text-xs font-black text-gold animate-number-in">
              🎉 Promo code accepted! 50 ETB Play Bonus credited.
            </p>
          )}
        </div>
      </div>

      {/* Guide & Rules Accordion */}
      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={() => {
            buzz(8);
            setOpenRules((v) => !v);
          }}
          className="flex min-h-13 w-full items-center gap-3 rounded-2xl border border-border/80 bg-surface-grad px-4 text-left active:scale-[0.99]"
        >
          <BookOpen className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-xs font-black text-foreground">
            📌 አጨዋወት፣ ህጎች እና ማሳሰቢያ (Rules & Disclaimer)
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              openRules ? "rotate-90" : ""
            }`}
          />
        </button>

        {openRules && (
          <div className="mt-2 space-y-3.5 rounded-3xl border border-border/80 bg-black/60 p-4 shadow-xl">
            {/* Disclaimer Box */}
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5">
              <div className="flex items-center gap-2 pb-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs font-black text-amber-400">
                  ⚠️ ማሳሰቢያ (Disclaimer):
                </p>
              </div>
              <p className="text-xs leading-relaxed font-medium text-amber-200/90">
                ቢንጎ (Bingo) ሙሉ በሙሉ በእድል ላይ የተመሰረተ ጨዋታ (Game of Chance) ነው። ማንኛውም አሸናፊ የሚለየው ሲስተሙ በዘፈቀደ (Randomly) በሚያወጣቸው ቁጥሮች ብቻ ነው። ስለዚህ ሲጫወቱ ይህንን ተረድተው በኃላፊነት እንዲጫወቱ እናሳስባለን።
              </p>
            </div>

            {/* Rules Section */}
            <div className="space-y-2.5">
              <p className="text-xs font-black text-gold uppercase tracking-wider flex items-center gap-1.5">
                📌 አጨዋወት እና ህጎች
              </p>

              <div className="rounded-2xl border border-border/70 bg-secondary/50 p-3 space-y-2.5 text-xs leading-relaxed text-foreground/90 font-medium">
                <p className="flex items-start gap-2">
                  <span className="shrink-0 text-base leading-none">1️⃣</span>
                  <span>
                    <strong className="text-gold font-bold">መጫወቻ ሂሳብ (Play Balance):</strong> ካርድ ገዝቶ ለመጫወት ብቻ የሚያገለግል ሲሆን ወጪ (Withdraw) ማድረግ አይቻልም።
                  </span>
                </p>

                <p className="flex items-start gap-2">
                  <span className="shrink-0 text-base leading-none">2️⃣</span>
                  <span>
                    <strong className="text-emerald-400 font-bold">ዋና ሂሳብ (Main Balance):</strong> ተጫውተው ሲያሸንፉ የሚገባበት ሲሆን፣ በማንኛውም ሰዓት ወጪ ማድረግ ይችላሉ።
                  </span>
                </p>

                <p className="flex items-start gap-2">
                  <span className="shrink-0 text-base leading-none">3️⃣</span>
                  <span>
                    <strong className="text-sky-400 font-bold">የጨዋታው ሂደት:</strong> ካርድ ሲገዙ ከ 1 እስከ 75 ባሉት ቁጥሮች የተሞላ 5x5 ካርቴላ ይሰጥዎታል። ጨዋታው ሲጀመር ሲስተሙ በየ 3 ሰከንዱ ቁጥሮችን ይጠራል። ሲስተሙ ራሱ ያጠቁርልዎታል (ምንም መንካት አይጠበቅብዎትም)።
                  </span>
                </p>
              </div>
            </div>

            {/* Visual Winning Patterns Diagram */}
            <WinningPatterns />
          </div>
        )}
      </div>

      {/* Telegram Support & Channel Direct Buttons */}
      <div className="px-4 pt-3 grid grid-cols-2 gap-2">
        <a
          href="https://t.me/Phonix_s"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-3 text-xs font-black text-sky-400 active:scale-95"
        >
          <Send className="h-4 w-4" />
          Support Admin 💬
        </a>

        <a
          href="https://t.me/Phoenix_Bingo_Bot"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 p-3 text-xs font-black text-gold active:scale-95"
        >
          <Sparkles className="h-4 w-4" />
          Play on Bot 🎮
        </a>
      </div>

      {/* Security Actions */}
      <div className="space-y-2 px-4 pt-3">
        <button
          type="button"
          onClick={() => {
            buzz(8);
            setOpenPassModal(true);
          }}
          className="flex min-h-13 w-full items-center gap-3 rounded-2xl border border-border/80 bg-surface-grad px-4 text-left active:scale-[0.99]"
        >
          <KeyRound className="h-4 w-4 shrink-0 text-gold" />
          <span className="min-w-0 flex-1 truncate text-xs font-black text-foreground">
            {t("changePassword")}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => buzz([10, 30, 10])}
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 px-4 text-xs font-black uppercase tracking-wider text-destructive active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </button>
      </div>

      {/* Password Modal */}
      {openPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-3xl border border-border/80 bg-surface-grad p-5 text-left shadow-card-soft">
            <div className="flex items-center gap-2 text-gold">
              <Lock className="h-5 w-5" />
              <h3 className="text-sm font-black">{t("changePassword")}</h3>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Current Password
                </label>
                <input
                  type="password"
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-border/80 bg-background/80 px-3 text-sm text-foreground outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-border/80 bg-background/80 px-3 text-sm text-foreground outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setOpenPassModal(false)}
                className="flex-1 min-h-11 rounded-xl border border-border/80 bg-secondary text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!oldPass || !newPass}
                onClick={handlePasswordChange}
                className="flex-1 min-h-11 rounded-xl bg-gold-grad text-xs font-black uppercase text-gold-foreground shadow-glow-gold disabled:opacity-40"
              >
                {passDone ? "Updated!" : t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
