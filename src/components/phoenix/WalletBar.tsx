import { Wallet, Plus, Coins } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function WalletBar({
  play = 7,
  main = 70,
  onNavigateWallet,
}: {
  play?: number;
  main?: number;
  onNavigateWallet?: () => void;
}) {
  const { t } = useLang();

  return (
    <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface-grad p-2.5 shadow-card-soft">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-gold shrink-0" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("playWallet")}
            </p>
            <p className="text-xs font-black tabular-nums text-foreground">
              {play.toFixed(2)} <span className="text-[9px] text-muted-foreground">ETB</span>
            </p>
          </div>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-1.5">
          <Wallet className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("mainWallet")}
            </p>
            <p className="text-xs font-black tabular-nums text-gold">
              {main.toFixed(2)} <span className="text-[9px] text-muted-foreground">ETB</span>
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onNavigateWallet}
        className="grid h-8 w-8 place-items-center rounded-xl bg-ember-grad text-primary-foreground shadow-glow-fire transition-transform active:scale-95"
        aria-label={t("deposit")}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
