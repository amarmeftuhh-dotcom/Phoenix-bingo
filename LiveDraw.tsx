import { History } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { letterFor } from "@/lib/bingo";

export function LiveDraw({ drawn }: { drawn: number[] }) {
  const { t } = useLang();
  const current = drawn[0];
  const previous = drawn.slice(1, 6);

  return (
    <section className="px-4 pt-5">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-grad p-5 shadow-card-soft">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

        <p className="relative text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t("currentNumber")}
        </p>

        <div className="relative mt-4 grid place-items-center">
          <div className="grid h-32 w-32 place-items-center rounded-full bg-fire p-[3px] shadow-glow-fire animate-pulse-ring">
            <div className="grid h-full w-full place-items-center rounded-full bg-background/85">
              {current ? (
                <span
                  key={`${current}-${drawn.length}`}
                  className="animate-number-in text-5xl font-black tabular-nums tracking-tight text-fire"
                >
                  <span className="mr-1 text-2xl text-gold">{letterFor(current)}</span>
                  {current}
                </span>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">{t("waiting")}</span>
              )}
            </div>
          </div>
        </div>

        <div className="relative mt-5">
          <div className="mb-2 flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("lastNumbers")}
            </span>
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
            {previous.length === 0 && (
              <span className="text-xs text-muted-foreground">{t("noDraws")}</span>
            )}
            {previous.map((n, i) => (
              <div
                key={`${n}-${i}`}
                className="grid h-11 min-w-11 shrink-0 place-items-center rounded-2xl border border-border bg-secondary text-sm font-bold tabular-nums text-gold"
                style={{ opacity: 1 - i * 0.13 }}
              >
                <span className="mr-0.5 text-[10px] text-primary">{letterFor(n)}</span>
                {n}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
