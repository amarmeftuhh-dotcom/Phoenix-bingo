import { Home, Ticket, Wallet, Trophy, User } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { buzz } from "@/lib/bingo";

export type NavTab = "home" | "game" | "wallet" | "rank" | "profile" | "admin" | "finance";

export function BottomNav({
  activeTab,
  isGameActive = false,
  onSelectTab,
}: {
  activeTab: NavTab;
  isGameActive?: boolean;
  onSelectTab: (tab: NavTab) => void;
}) {
  const { t } = useLang();

  const navItems: {
    id: NavTab;
    labelKey: "home" | "tickets" | "wallet" | "rank" | "profile";
    icon: typeof Home;
  }[] = [
    { id: "home", labelKey: "home", icon: Home },
    { id: "game", labelKey: "tickets", icon: Ticket },
    { id: "wallet", labelKey: "wallet", icon: Wallet },
    { id: "rank", labelKey: "rank", icon: Trophy },
    { id: "profile", labelKey: "profile", icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-2xl border-t border-border bg-card/95 backdrop-blur-md px-2 py-1.5 shadow-card-soft">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                buzz(8);
                onSelectTab(item.id);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl py-1.5 text-center transition-all active:scale-95",
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-xl transition-all",
                  isActive ? "bg-primary/20 text-primary shadow-glow-fire/20" : ""
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="mt-0.5 text-[10px] tracking-tight">
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
