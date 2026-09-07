import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { TodayPanel } from "@/components/TodayPanel";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, MinusCircle, BookOpen } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/panel")({ component: PanelPage });

type TopicStat = {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  summary: string | null;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
};

function PanelPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TopicStat[]>([]);
  const [totals, setTotals] = useState({ total: 0, correct: 0, wrong: 0, blank: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate({ to: "/auth" }); return; }
      setUser(data.session.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("question_attempts").select(`
        selected_option, is_correct,
        questions!inner(topic_id, topics!inner(id, name, summary, subjects!inner(name)))
      `).eq("user_id", user.id);

      const map = new Map<string, TopicStat>();
      let total = 0, correct = 0, wrong = 0, blank = 0;
      (data ?? []).forEach((a: any) => {
        const t = a.questions.topics;
        const key = t.id;
        if (!map.has(key)) map.set(key, {
          topic_id: t.id, topic_name: t.name, subject_name: t.subjects.name,
          summary: t.summary, total: 0, correct: 0, wrong: 0, blank: 0,
        });
        const s = map.get(key)!;
        s.total++; total++;
        if (a.selected_option === null) { s.blank++; blank++; }
        else if (a.is_correct) { s.correct++; correct++; }
        else { s.wrong++; wrong++; }
      });
      setStats(Array.from(map.values()).sort((a, b) => (b.wrong + b.blank) - (a.wrong + a.blank)));
      setTotals({ total, correct, wrong, blank });
      setLoading(false);
    })();
  }, [user]);

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Panelim</div>
        <h1 className="font-serif text-3xl mt-1">Merhaba{user.email ? `, ${user.email.split("@")[0]}` : ""}</h1>
        <p className="text-muted-foreground mt-2">Konu bazlı ilerlemen ve eksik olduğun alanlar.</p>

        <div className="mt-6">
          <TodayPanel />
        </div>



        {/* Totals */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Toplam" value={totals.total} icon={<BookOpen className="h-4 w-4 text-primary" />} />
          <StatBox label="Doğru" value={totals.correct} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
          <StatBox label="Yanlış" value={totals.wrong} icon={<XCircle className="h-4 w-4 text-destructive" />} />
          <StatBox label="Boş" value={totals.blank} icon={<MinusCircle className="h-4 w-4 text-muted-foreground" />} />
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-16">Yükleniyor...</div>
        ) : stats.length === 0 ? (
          <div className="paper-card rounded-lg mt-8 p-12 text-center">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
            <p className="text-muted-foreground mb-4">Henüz soru çözmedin.</p>
            <Link to="/sorular"><Button>Soru çözmeye başla</Button></Link>
          </div>
        ) : (
          <div className="mt-8">
            <h2 className="font-serif text-xl mb-3">Konu bazlı ilerleme</h2>
            <div className="space-y-3">
              {stats.map(s => {
                const eksiklik = s.total > 0 ? Math.round(((s.wrong + s.blank * 0.5) / s.total) * 100) : 0;
                return (
                  <div key={s.topic_id} className="paper-card rounded-lg p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-xs text-muted-foreground">{s.subject_name}</div>
                        <h3 className="font-serif text-lg">{s.topic_name}</h3>
                      </div>
                      <Badge variant={eksiklik > 50 ? "destructive" : eksiklik > 25 ? "secondary" : "default"}>Eksiklik %{eksiklik}</Badge>
                    </div>
                    <Progress value={s.total ? (s.correct / s.total) * 100 : 0} className="mb-3" />
                    <div className="grid grid-cols-4 text-center text-sm">
                      <div><div className="font-serif text-xl">{s.total}</div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Toplam</div></div>
                      <div><div className="font-serif text-xl text-green-600">{s.correct}</div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Doğru</div></div>
                      <div><div className="font-serif text-xl text-destructive">{s.wrong}</div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Yanlış</div></div>
                      <div><div className="font-serif text-xl text-muted-foreground">{s.blank}</div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Boş</div></div>
                    </div>
                    {(s.wrong > 0 || s.blank > 0) && s.summary && (
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer text-gold text-xs uppercase tracking-widest">Konu özetini gör</summary>
                        <p className="mt-2 text-foreground leading-relaxed">{s.summary}</p>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatBox({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="paper-card rounded-lg p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="font-serif text-3xl mt-2">{value}</div>
    </div>
  );
}
