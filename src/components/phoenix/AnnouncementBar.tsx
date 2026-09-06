import { Flame } from "lucide-react";

export function AnnouncementBar({ text }: { text?: string }) {
  return (
    <div className="relative overflow-hidden bg-fire/15 px-3 py-1.5 text-xs text-primary border-b border-fire/20">
      <div className="flex items-center gap-2">
        <Flame className="h-3.5 w-3.5 shrink-0 text-primary animate-pulse" />
        <div className="overflow-hidden whitespace-nowrap">
          <p className="animate-marquee inline-block text-[11px] font-bold uppercase tracking-wider text-primary">
            {text || "⚡ Instant Telebirr & CBE Payouts • 20,000 ETB Jackpot Live"}
          </p>
        </div>
      </div>
    </div>
  );
}
