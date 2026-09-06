import { PlayCircle, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function TestControls({
  onDraw,
  onReset,
}: {
  onDraw?: () => void;
  onReset?: () => void;
}) {
  const { t } = useLang();

  return (
    <div className="mx-4 mt-6 rounded-2xl border border-dashed border-border/80 bg-secondary/30 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("testControls")}
        </span>
      </div>
      <div className="flex gap-2">
        {onDraw && (
          <button
            type="button"
            onClick={onDraw}
            className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/80 text-xs font-bold text-foreground active:scale-95"
          >
            <PlayCircle className="h-3.5 w-3.5 text-primary" />
            {t("simulateDraw")}
          </button>
        )}

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/80 text-xs font-bold text-foreground active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5 text-gold" />
            {t("resetBoard")}
          </button>
        )}
      </div>
    </div>
  );
}
