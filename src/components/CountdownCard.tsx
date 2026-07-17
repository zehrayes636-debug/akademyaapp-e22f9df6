import { useEffect, useState } from "react";

function diff(target: Date) {
  const total = Math.max(0, target.getTime() - Date.now());
  const d = Math.floor(total / 86400000);
  const h = Math.floor((total % 86400000) / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  return { d, h, m, s, total };
}

export function CountdownCard({ name, date, tone = "navy" }: { name: string; date: string; tone?: "navy" | "gold" }) {
  const target = new Date(date);
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const i = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(i);
  }, [date]);

  const isNavy = tone === "navy";
  return (
    <div className={`relative overflow-hidden rounded-lg border ${isNavy ? "border-primary/20 bg-primary text-primary-foreground" : "border-gold/40 bg-card text-foreground"} p-6`}>
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-60" />
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className={`text-[10px] uppercase tracking-[0.24em] ${isNavy ? "text-gold" : "text-muted-foreground"}`}>
            Sınava kalan süre
          </div>
          <h3 className="mt-1 font-serif text-3xl">{name}</h3>
          <div className={`mt-1 text-xs ${isNavy ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {target.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
        {([["Gün", t.d],["Saat", t.h],["Dk", t.m],["Sn", t.s]] as const).map(([l, v]) => (
          <div key={l} className={`rounded-md ${isNavy ? "bg-primary-foreground/5 border border-primary-foreground/10" : "bg-secondary border border-border"} px-2 py-3 text-center`}>
            <div className={`font-serif text-2xl sm:text-3xl tabular-nums ${isNavy ? "text-primary-foreground" : "text-foreground"}`}>
              {String(v).padStart(2, "0")}
            </div>
            <div className={`text-[10px] uppercase tracking-widest mt-1 ${isNavy ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
