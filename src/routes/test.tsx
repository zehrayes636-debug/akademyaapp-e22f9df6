import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MinusCircle, ArrowRight, RotateCcw } from "lucide-react";
import type { User } from "@supabase/supabase-js";

type Q = {
  id: string; question_text: string; options: { key: string; text: string }[];
  correct_option: string; explanation: string; year: number | null; difficulty: string | null;
  topic_id: string; topics: { id: string; name: string; summary: string | null };
};

export const Route = createFileRoute("/test")({
  validateSearch: (s: Record<string, unknown>) => ({
    exam: typeof s.exam === "string" ? s.exam : "",
    subject: typeof s.subject === "string" ? s.subject : "",
    topic: typeof s.topic === "string" ? s.topic : "",
  }),
  component: TestPage,
});

function TestPage() {
  const { exam, subject, topic } = Route.useSearch();
  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [done, setDone] = useState(false);
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null)); }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase.from("questions").select(`
        id, question_text, options, correct_option, explanation, year, difficulty, topic_id,
        topics!inner(id, name, summary, subjects!inner(id, exam_id, exams!inner(slug)))
      `).limit(20);
      if (topic) query = query.eq("topic_id", topic);
      else if (subject) query = query.eq("topics.subject_id", subject);
      else if (exam) query = query.eq("topics.subjects.exams.slug", exam);
      const { data } = await query;
      const shuffled = (data as unknown as Q[] ?? []).sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      setLoading(false);
    })();
  }, [exam, subject, topic]);

  const current = questions[i];

  const answer = (opt: string | null) => {
    if (!current) return;
    setAnswers(prev => ({ ...prev, [current.id]: opt }));
  };

  const next = async () => {
    if (i + 1 < questions.length) setI(i + 1);
    else await finish();
  };

  const finish = async () => {
    if (user) {
      const rows = questions.map(q => {
        const sel = answers[q.id] ?? null;
        return {
          user_id: user.id, question_id: q.id, selected_option: sel,
          is_correct: sel === null ? null : sel === q.correct_option,
          session_id: sessionId,
        };
      });
      await supabase.from("question_attempts").insert(rows);
    }
    setDone(true);
  };

  if (loading) return <AppShell><div className="p-16 text-center text-muted-foreground">Yükleniyor...</div></AppShell>;
  if (questions.length === 0) return <AppShell><div className="p-16 text-center"><p className="text-muted-foreground mb-4">Bu filtrelere uygun soru bulunamadı.</p><Link to="/sorular"><Button variant="outline">Filtrelere dön</Button></Link></div></AppShell>;

  if (done) {
    const correct = questions.filter(q => answers[q.id] === q.correct_option).length;
    const wrong = questions.filter(q => answers[q.id] && answers[q.id] !== q.correct_option).length;
    const blank = questions.filter(q => !answers[q.id]).length;

    // Topic summary for wrong topics
    const wrongByTopic = new Map<string, { name: string; summary: string | null; count: number }>();
    questions.forEach(q => {
      const sel = answers[q.id];
      if (sel && sel !== q.correct_option) {
        const cur = wrongByTopic.get(q.topics.id);
        if (cur) cur.count++;
        else wrongByTopic.set(q.topics.id, { name: q.topics.name, summary: q.topics.summary, count: 1 });
      }
    });

    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Test Tamamlandı</div>
          <h1 className="font-serif text-3xl mt-1">Sonuçların</h1>

          <div className="paper-card rounded-lg p-6 mt-6 grid grid-cols-3 gap-4 text-center">
            <div><CheckCircle2 className="mx-auto h-6 w-6 text-green-600 mb-2" /><div className="font-serif text-3xl">{correct}</div><div className="text-xs uppercase tracking-widest text-muted-foreground">Doğru</div></div>
            <div><XCircle className="mx-auto h-6 w-6 text-destructive mb-2" /><div className="font-serif text-3xl">{wrong}</div><div className="text-xs uppercase tracking-widest text-muted-foreground">Yanlış</div></div>
            <div><MinusCircle className="mx-auto h-6 w-6 text-muted-foreground mb-2" /><div className="font-serif text-3xl">{blank}</div><div className="text-xs uppercase tracking-widest text-muted-foreground">Boş</div></div>
          </div>

          {wrongByTopic.size > 0 && (
            <div className="mt-8">
              <h2 className="font-serif text-xl mb-3">Zayıf konuların — kısa özet</h2>
              <div className="space-y-3">
                {Array.from(wrongByTopic.values()).map((t, k) => (
                  <div key={k} className="paper-card rounded-lg p-5 border-l-4 border-l-gold">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-serif text-lg">{t.name}</h3>
                      <Badge variant="secondary">{t.count} yanlış</Badge>
                    </div>
                    {t.summary ? <p className="text-sm text-foreground leading-relaxed">{t.summary}</p>
                      : <p className="text-sm text-muted-foreground italic">Bu konu için özet henüz yok.</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <Button onClick={() => { setI(0); setAnswers({}); setDone(false); }}>
              <RotateCcw className="h-4 w-4 mr-2" /> Tekrar dene
            </Button>
            <Link to="/panel"><Button variant="outline">Panelime git</Button></Link>
            <Link to="/sorular"><Button variant="ghost">Sorulara dön</Button></Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const sel = answers[current.id];
  const answered = sel !== undefined;
  const progress = ((i + 1) / questions.length) * 100;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between text-sm">
          <div className="text-muted-foreground">Soru <span className="text-foreground font-serif text-lg">{i + 1}</span> / {questions.length}</div>
          <div className="text-xs text-gold uppercase tracking-widest">{current.topics.name}</div>
        </div>
        <Progress value={progress} className="mb-6" />

        <div className="paper-card rounded-lg p-6 sm:p-8">
          <p className="font-serif text-xl leading-relaxed whitespace-pre-wrap">{current.question_text}</p>
          <div className="mt-6 space-y-2">
            {current.options.map(o => {
              const isSel = sel === o.key;
              const isCorrect = answered && o.key === current.correct_option;
              const isWrong = answered && isSel && o.key !== current.correct_option;
              return (
                <button key={o.key} disabled={answered} onClick={() => answer(o.key)}
                  className={`w-full text-left rounded-md border px-4 py-3 flex items-start gap-3 transition-colors
                    ${isCorrect ? "border-green-600 bg-green-50 dark:bg-green-950/30" :
                      isWrong ? "border-destructive bg-destructive/5" :
                      isSel ? "border-gold bg-gold/5" : "border-border hover:border-gold/60"}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-serif ${isSel ? "border-gold text-gold" : "border-border text-muted-foreground"}`}>{o.key}</span>
                  <span className="pt-0.5">{o.text}</span>
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="mt-4 rounded-md border border-gold/40 bg-gold/5 p-4">
              <div className="text-xs uppercase tracking-widest text-gold">Çözüm</div>
              <p className="mt-2 text-sm leading-relaxed">{current.explanation}</p>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => { answer(null); next(); }} disabled={answered}>Boş bırak</Button>
            <Button onClick={next} disabled={!answered}>
              {i + 1 === questions.length ? "Bitir" : "Sonraki"} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
