import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Play, BookOpen, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/sorular")({ component: QuestionsPage });

const COUNTS = ["5", "10", "20", "30", "40", "50", "all"] as const;
const LEVELS = [
  { v: "all", label: "Karışık seviye" },
  { v: "kolay", label: "Kolay" },
  { v: "orta", label: "Orta" },
  { v: "zor", label: "Zor" },
] as const;

function QuestionsPage() {
  const [examSlug, setExamSlug] = useState<string>("all");
  const [subjectId, setSubjectId] = useState<string>("all");
  const [topicId, setTopicId] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [count, setCount] = useState<string>("20");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const { data: exams } = useQuery({
    queryKey: ["exams"],
    staleTime: 5 * 60_000,
    queryFn: async () => (await supabase.from("exams").select("*").order("sort_order")).data ?? [],
  });
  const { data: subjects } = useQuery({
    queryKey: ["subjects", examSlug],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      let q = supabase.from("subjects").select("id, name, slug, exam_id, exams!inner(slug)").order("sort_order");
      if (examSlug !== "all") q = q.eq("exams.slug", examSlug);
      return (await q).data ?? [];
    },
  });
  const { data: topics } = useQuery({
    queryKey: ["topics", subjectId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (subjectId === "all") return [];
      return (await supabase.from("topics").select("*").eq("subject_id", subjectId).order("sort_order")).data ?? [];
    },
    enabled: subjectId !== "all",
  });

  const { data: questions, isLoading, isError, refetch } = useQuery({
    queryKey: ["questions", examSlug, subjectId, topicId, level, debouncedQ],
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase.from("questions").select(`
        id, question_text, year, difficulty, source, correct_option,
        topics!inner(id, name, subject_id, subjects!inner(id, name, exam_id, exams!inner(slug, name)))
      `).limit(200);
      if (topicId !== "all") query = query.eq("topic_id", topicId);
      else if (subjectId !== "all") query = query.eq("topics.subject_id", subjectId);
      else if (examSlug !== "all") query = query.eq("topics.subjects.exams.slug", examSlug);
      if (level !== "all") query = query.eq("difficulty", level);
      if (debouncedQ) query = query.ilike("question_text", `%${debouncedQ}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const testHref = useMemo(() => {
    const params = new URLSearchParams();
    if (examSlug !== "all") params.set("exam", examSlug);
    if (subjectId !== "all") params.set("subject", subjectId);
    if (topicId !== "all") params.set("topic", topicId);
    if (level !== "all") params.set("level", level);
    params.set("count", count);
    return `/test?${params.toString()}`;
  }, [examSlug, subjectId, topicId, level, count]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Soru Bankası</div>
            <h1 className="font-serif text-2xl sm:text-3xl mt-1">Çıkmış sorular</h1>
          </div>
        </div>

        <div className="paper-card rounded-lg p-4 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={examSlug} onValueChange={(v) => { setExamSlug(v); setSubjectId("all"); setTopicId("all"); }}>
            <SelectTrigger><SelectValue placeholder="Sınav" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tüm sınavlar</SelectItem>{exams?.map(e => <SelectItem key={e.id} value={e.slug}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setTopicId("all"); }}>
            <SelectTrigger><SelectValue placeholder="Ders" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tüm dersler</SelectItem>{subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={topicId} onValueChange={setTopicId} disabled={subjectId === "all"}>
            <SelectTrigger><SelectValue placeholder="Konu" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tüm konular</SelectItem>{topics?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Soru içinde ara..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>

        {/* Test kurucu */}
        <div className="paper-card rounded-lg p-4 mb-6">
          <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-3">Test Oluştur</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue placeholder="Zorluk" /></SelectTrigger>
              <SelectContent>{LEVELS.map(l => <SelectItem key={l.v} value={l.v}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger><SelectValue placeholder="Soru sayısı" /></SelectTrigger>
              <SelectContent>{COUNTS.map(c => <SelectItem key={c} value={c}>{c === "all" ? "Tüm sorular" : `${c} soru`}</SelectItem>)}</SelectContent>
            </Select>
            <a href={testHref} className="block">
              <Button className="w-full gap-2"><Play className="h-4 w-4" /> Teste başla</Button>
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Seçtiğin sınav, ders, konu ve zorluk filtreleriyle {count === "all" ? "tüm sorulardan" : `${count} soruluk`} bir test hazırlanır.
          </p>
        </div>


        {isLoading ? (
          <div className="text-center text-muted-foreground py-16">Yükleniyor...</div>
        ) : questions?.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 paper-card rounded-lg">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
            Bu filtrelerle soru bulunamadı.
          </div>
        ) : (
          <div className="space-y-3">
            {questions?.map((q) => {
              const t: any = q.topics;
              return (
                <Link key={q.id} to="/sorular/$id" params={{ id: q.id }}
                  className="block paper-card rounded-lg p-5 hover:border-gold/60 transition-colors group">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Badge variant="secondary" className="text-[10px]">{t.subjects.exams.name}</Badge>
                    <span>·</span>
                    <span>{t.subjects.name}</span>
                    <span>·</span>
                    <span className="text-gold">{t.name}</span>
                    {q.year && <><span>·</span><span>{q.year}</span></>}
                    {q.difficulty && <><span>·</span><span className="capitalize">{q.difficulty}</span></>}
                  </div>
                  <p className="text-foreground line-clamp-2">{q.question_text}</p>
                  <div className="mt-3 text-xs text-gold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Çöz <ChevronRight className="h-3 w-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
