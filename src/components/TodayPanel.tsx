import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, CheckSquare, Play, Target, XCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function TodayPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const dow = new Date().getDay();

  const { data, isLoading } = useQuery({
    queryKey: ["today-panel", user?.id, dow],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const uid = user!.id;
      const [slots, tasks, attempts] = await Promise.all([
        supabase.from("study_plan_slots").select("id, title, start_time, end_time, color").eq("user_id", uid).eq("day_of_week", dow).order("start_time"),
        supabase.from("tasks").select("id, title, due_at, is_done, priority").eq("user_id", uid).eq("is_done", false).order("due_at", { nullsFirst: false }).limit(5),
        supabase.from("question_attempts").select("is_correct, created_at").eq("user_id", uid).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      ]);
      const today = attempts.data ?? [];
      return {
        slots: slots.data ?? [],
        tasks: tasks.data ?? [],
        solvedToday: today.length,
        correctToday: today.filter((a) => a.is_correct).length,
      };
    },
  });

  if (!ready) return null;

  if (!user) {
    return (
      <div className="paper-card rounded-lg p-6">
        <h3 className="font-serif text-xl">Bugün ne çalışacaksın?</h3>
        <p className="mt-2 text-sm text-muted-foreground">Ücretsiz hesap oluştur; günlük programın, görevlerin ve çözüm istatistiklerin burada görünsün.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/auth"><Button size="sm">Giriş / Kayıt</Button></Link>
          <Link to="/sorular"><Button size="sm" variant="outline">Soru çözmeye başla</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-card rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Bugün · {DAYS[dow]}</div>
          <h3 className="font-serif text-xl mt-1">Günlük planın</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="gap-1"><Target className="h-3 w-3" /> {data?.solvedToday ?? 0} soru</Badge>
          <Badge variant="secondary">{data?.correctToday ?? 0} doğru</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-2/3" />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
              <CalendarDays className="h-3.5 w-3.5" /> Program
            </div>
            {data?.slots.length ? (
              <ul className="space-y-2">
                {data.slots.map((s) => (
                  <li key={s.id} className="rounded-md border border-border px-3 py-2 text-sm flex items-center justify-between gap-2">
                    <span className="truncate">{s.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Bugün için ders saati yok. <Link to="/program" className="text-gold underline underline-offset-2">Program oluştur</Link></p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
              <CheckSquare className="h-3.5 w-3.5" /> Görevler
            </div>
            {data?.tasks.length ? (
              <ul className="space-y-2">
                {data.tasks.map((t) => (
                  <li key={t.id} className="rounded-md border border-border px-3 py-2 text-sm truncate">{t.title}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Açık görevin yok. <Link to="/gorevler" className="text-gold underline underline-offset-2">Görev ekle</Link></p>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/sorular"><Button size="sm" className="gap-2"><Play className="h-4 w-4" /> Test oluştur</Button></Link>
        <Link to="/yanlislarim"><Button size="sm" variant="outline" className="gap-2"><XCircle className="h-4 w-4" /> Yanlışlarım</Button></Link>
        <Link to="/konular"><Button size="sm" variant="ghost">Konu ilerlemem</Button></Link>
      </div>
    </div>
  );
}
