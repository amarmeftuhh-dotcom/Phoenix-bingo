export type BotWinnerForceMode =
  | "bots"       // 100% Bots always win
  | "real"       // Real user always wins (if playing)
  | "mix"        // 50/50 balanced mix between real user and bots
  | "mix_real"   // Favors real users higher (75% real / 25% bots)
  | "mix_dep"    // Favors users who have deposited funds
  | "ai";        // Smart Dynamic Casino AI: dynamically checks real player count, engagement & pool

export interface BotSettings {
  isBotSystemActive: boolean;
  botWinnerForce: BotWinnerForceMode;
  botD1: number; // 1 card weight
  botD2: number; // 2 cards weight
  botD3: number; // 3 cards weight
  botD4: number; // 4 cards weight
  minBots: number;
  maxBots: number;
}

const DEFAULT_BOT_SETTINGS: BotSettings = {
  isBotSystemActive: true,
  botWinnerForce: "ai",
  botD1: 5,
  botD2: 4,
  botD3: 3,
  botD4: 3,
  minBots: 60,
  maxBots: 180,
};

export function getStoredBotSettings(): BotSettings {
  try {
    const raw = localStorage.getItem("phoenix_bot_settings");
    if (raw) {
      return { ...DEFAULT_BOT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_BOT_SETTINGS;
}

export function saveStoredBotSettings(settings: BotSettings) {
  try {
    localStorage.setItem("phoenix_bot_settings", JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("phoenix_bot_settings_updated", { detail: settings }));
  } catch {}
}
