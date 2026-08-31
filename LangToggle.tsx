import { Globe } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { buzz } from "@/lib/bingo";

export function LangToggle() {
  const { lang, setLang } = useLang();

  const toggle = () => {
    buzz(8);
    setLang(lang === "en" ? "am" : "en");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-2.5 text-xs font-black uppercase tracking-wider text-foreground transition-all active:scale-95 hover:border-primary/50"
    >
      <Globe className="h-3.5 w-3.5 text-primary" />
      <span>{lang === "en" ? "AM" : "EN"}</span>
    </button>
  );
}
