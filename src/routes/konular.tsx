import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Play, Video, ChevronDown, ChevronRight } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/konular")({
  component: KonularPage,
  head: () => ({
    meta: [
      { title: "Konular — Akademya" },
      { name: "description", content: "TYT, AYT, KPSS ve LGS konu listeleri, ilerleme takibi ve konu özetleri." },
      { property: "og:title", content: "Konular — Akademya" },
      { property: "og:description", content: "Tüm sınavlar için eksiksiz konu listesi ve ilerleme takibi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Subject = { id: string; name: string; slug: string; sort_order: number | null };
type Topic = { id: string; name: string; summary: string | null; video_url: string | null; sort_order: number | null };

function KonularPage() {
  const [user, setUser] = useState<User | null>(null);
  const [exams, setExams] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [examSlug, setExamSlug] = useState<string>("tyt");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topicsBySubject, setTopicsBySubject] = useState<Record<string, Topic[]>>({});
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    supabase.from("exams").select("id, slug, name").order("sort_order")
      .then(({ data }) => setExams(data ?? []));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: exam } = await supabase.from("exams").select("id").eq("slug", examSlug).single();
      if (!exam) { setLoading(false); return; }
      const { data: subs } = await supabase.from("subjects")
        .select("id, name, slug, sort_order").eq("exam_id", exam.id).order("sort_order");
      const subjectList = (subs ?? []) as Subject[];
      setSubjects(subjectList);

      if (subjectList.length) {
        const { data: topics } = await supabase.from("topics")
          .select("id, name, summary, video_url, sort_order, subject_id")
          .in("subject_id", subjectList.map(s => s.id))
          .order("sort_order");
        const map: Record<string, Topic[]> = {};
        (topics ?? []).forEach((t: any) => {
          (map[t.subject_id] ||= []).push(t);
        });
        setTopicsBySubject(map);
      } else {
        setTopicsBySubject({});
      }

      if (user) {
        const { data: prog } = await (supabase as any).from("topic_progress")
          .select("topic_id").eq("user_id", user.id).eq("completed", true);
        setProgress(new Set((prog ?? []).map((p: any) => p.topic_id)));
      } else {
        setProgress(new Set());
      }
      setLoading(false);
    })();
  }, [examSlug, user]);

  const toggleTopic = async (topicId: string, completed: boolean) => {
    if (!user) return;
    const next = new Set(progress);
    if (completed) next.add(topicId); else next.delete(topicId);
    setProgress(next);
    if (completed) {
      await (supabase as any).from("topic_progress")
        .upsert({ user_id: user.id, topic_id: topicId, completed: true, completed_at: new Date().toISOString() },
          { onConflict: "user_id,topic_id" });
    } else {
      await (supabase as any).from("topic_progress")
        .delete().eq("user_id", user.id).eq("topic_id", topicId);
    }
  };

  const overallPct = useMemo(() => {
    const all = Object.values(topicsBySubject).flat();
    if (!all.length) return 0;
    const done = all.filter(t => progress.has(t.id)).length;
    return Math.round((done / all.length) * 100);
  }, [topicsBySubject, progress]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Müfredat</div>
            <h1 className="font-serif text-3xl mt-1">Konu Takibi</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              MEB & ÖSYM müfredatına uygun eksiksiz konu listesi. Konuları tamamladıkça işaretle.
            </p>
          </div>
          <Select value={examSlug} onValueChange={setExamSlug}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {exams.map(e => <SelectItem key={e.id} value={e.slug}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {user && (
          <div className="paper-card rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Genel İlerleme</div>
              <Badge variant="secondary">%{overallPct}</Badge>
            </div>
            <Progress value={overallPct} />
          </div>
        )}
        {!user && (
          <div className="paper-card rounded-lg p-4 mb-6 text-sm text-muted-foreground">
            İlerlemeni kaydetmek için <a href="/auth" className="text-gold underline">giriş yap</a>.
          </div>
        )}

        {loading ? (
          <div className="text-center text-muted-foreground py-16">Yükleniyor...</div>
        ) : (
          <div className="space-y-3">
            {subjects.map(s => {
              const topics = topicsBySubject[s.id] ?? [];
              const done = topics.filter(t => progress.has(t.id)).length;
              const pct = topics.length ? Math.round((done / topics.length) * 100) : 0;
              const isOpen = openSubject === s.id;
              return (
                <div key={s.id} className="paper-card rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenSubject(isOpen ? null : s.id)}
                    className="w-full flex items-center gap-3 p-5 text-left hover:bg-secondary/40 transition-colors"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <BookOpen className="h-5 w-5 text-gold" />
                    <div className="flex-1">
                      <div className="font-serif text-lg">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{topics.length} konu · {done} tamamlandı</div>
                    </div>
                    <Badge variant={pct === 100 ? "default" : "secondary"}>%{pct}</Badge>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border">
                      {topics.length === 0 ? (
                        <div className="p-5 text-sm text-muted-foreground">Bu ders için konu bulunmuyor.</div>
                      ) : (
                        <ul className="divide-y divide-border">
                          {topics.map(t => {
                            const completed = progress.has(t.id);
                            return (
                              <li key={t.id} className="p-4 flex items-start gap-3">
                                <Checkbox
                                  checked={completed}
                                  disabled={!user}
                                  onCheckedChange={(v) => toggleTopic(t.id, !!v)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                    {t.name}
                                  </div>
                                  {t.summary && (
                                    <details className="mt-1 text-xs text-muted-foreground">
                                      <summary className="cursor-pointer text-gold uppercase tracking-widest text-[10px]">Özet</summary>
                                      <p className="mt-1 leading-relaxed">{t.summary}</p>
                                    </details>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {t.video_url && (
                                    <a href={t.video_url} target="_blank" rel="noreferrer">
                                      <Button variant="ghost" size="sm" title="Konu Videosu"><Video className="h-4 w-4" /></Button>
                                    </a>
                                  )}
                                  <a href={`/test?topic=${t.id}`}>
                                    <Button size="sm" variant="outline" className="gap-1 text-xs"><Play className="h-3 w-3" /> Soru Çöz</Button>
                                  </a>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
