import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { CountdownCard } from "@/components/CountdownCard";
import { TodayPanel } from "@/components/TodayPanel";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarDays, Sparkles, CheckSquare, LayoutDashboard, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { data: exams } = useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
             style={{ backgroundImage: "radial-gradient(circle at 20% 30%, var(--ink) 1px, transparent 1px), radial-gradient(circle at 80% 60%, var(--ink) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-14 relative">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <span className="h-px w-8 bg-gold" />
            Ücretsiz Çalışma Platformu
          </div>
          <h1 className="mt-4 font-serif text-4xl sm:text-6xl leading-[1.05] text-foreground max-w-3xl">
            Çıkmış sorularla <em className="not-italic text-gold">hazırlanmanın</em> en zarif yolu.
          </h1>
          <p className="mt-5 max-w-2xl text-muted-foreground text-lg">
            YKS ve KPSS için çıkmış sorular, çözümlü test modu, kişisel ders programı ve yapay zeka destekli çalışma asistanı — tamamen ücretsiz.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/sorular"><Button size="lg" className="gap-2">Sorulara başla <ChevronRight className="h-4 w-4" /></Button></Link>
            <Link to="/asistan"><Button size="lg" variant="outline" className="gap-2 border-gold/50">AI Asistan <Sparkles className="h-4 w-4 text-gold" /></Button></Link>
          </div>
        </div>
      </section>

      {/* Countdowns */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Geri Sayım</div>
            <h2 className="font-serif text-2xl mt-1">Sınavına kalan süre</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {exams?.map((e, i) => (
            e.next_exam_date && <CountdownCard key={e.id} name={e.name} date={e.next_exam_date} tone={i === 0 ? "navy" : "gold"} />
          ))}
        </div>
      </section>

      {/* Bugün */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <TodayPanel />
      </section>

      {/* Features */}

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Özellikler</div>
          <h2 className="font-serif text-2xl mt-1">Çalışman için her şey burada</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard to="/sorular" icon={BookOpen} title="Soru Bankası" desc="Sınav ve konu bazlı filtreleme, çözümlü sorular, favoriler ve yorumlar." />
          <FeatureCard to="/sorular" icon={Sparkles} title="Test Modu" desc="Karışık test çöz, sonunda konu bazlı analiz ve kısa özetlerle eksiklerini gör." />
          <FeatureCard to="/panel" icon={LayoutDashboard} title="Panelim" desc="Konu bazlı doğru, yanlış, boş sayıları ve eksiklik puanların." />
          <FeatureCard to="/program" icon={CalendarDays} title="Haftalık Program" desc="Kendi ders programını oluştur, gün gün planla." />
          <FeatureCard to="/gorevler" icon={CheckSquare} title="Görevler & Hatırlatıcılar" desc="Yapılacaklarını takip et, teslim tarihi belirle." />
          <FeatureCard to="/asistan" icon={Sparkles} title="AI Asistan" desc="Konu, program ve dersler hakkında yapay zeka ile sohbet et." />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="paper-card rounded-lg p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-x-8 top-0 gold-rule" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="font-serif text-2xl">Ücretsiz hesap oluştur, ilerlemeni izle</h3>
              <p className="mt-2 text-muted-foreground max-w-xl">Konu bazlı istatistikler, favori sorular, ders programı ve AI asistan için kayıt yeterli.</p>
            </div>
            <Link to="/auth"><Button size="lg">Hesap oluştur</Button></Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function FeatureCard({ to, icon: Icon, title, desc }: { to: "/sorular" | "/panel" | "/program" | "/gorevler" | "/asistan"; icon: typeof BookOpen; title: string; desc: string }) {
  return (
    <Link to={to} className="group paper-card rounded-lg p-5 hover:border-gold/60 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary group-hover:bg-gold/15 group-hover:text-foreground transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-serif text-lg">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4 text-xs text-gold flex items-center gap-1">İncele <ChevronRight className="h-3 w-3" /></div>
    </Link>
  );
}
