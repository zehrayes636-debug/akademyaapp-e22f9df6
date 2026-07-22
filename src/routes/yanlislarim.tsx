import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XCircle, ChevronRight, Heart } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/yanlislarim")({
  component: MyMistakes,
  head: () => ({
    meta: [
      { title: "Yanlışlarım — Akademya" },
      { name: "description", content: "Yanlış cevapladığın soruları gözden geçir, tekrar çöz ve eksiklerini kapat." },
      { property: "og:title", content: "Yanlışlarım — Akademya" },
      { property: "og:description", content: "Yanlış cevapladığın soruları gözden geçir, tekrar çöz ve eksiklerini kapat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Tab = "wrong" | "favorites";

function MyMistakes() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("wrong");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoaded(true);
    });
  }, []);

  const { data: wrong, isLoading: wLoading } = useQuery({
    queryKey: ["mistakes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("question_attempts")
        .select(`
          id, selected_option, created_at,
          questions!inner(id, question_text, correct_option, year,
            topics!inner(name, subjects!inner(name, exams!inner(name, slug)))
          )
        `)
        .eq("user_id", user!.id)
        .eq("is_correct", false)
        .order("created_at", { ascending: false })
        .limit(200);
      // Deduplicate by question_id keeping latest
      const seen = new Set<string>();
      const rows: any[] = [];
      for (const r of (data ?? []) as any[]) {
        const qid = r.questions?.id;
        if (!qid || seen.has(qid)) continue;
        seen.add(qid);
        rows.push(r);
      }
      return rows;
    },
  });

  const { data: favs, isLoading: fLoading } = useQuery({
    queryKey: ["favs-list", user?.id],
    enabled: !!user && tab === "favorites",
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select(`
          id, created_at,
          questions!inner(id, question_text, year,
            topics!inner(name, subjects!inner(name, exams!inner(name, slug)))
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (loaded && !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-serif text-2xl mb-2">Giriş yap</h1>
          <p className="text-muted-foreground mb-6">Yanlışlarını ve favorilerini görmek için giriş yapman gerekiyor.</p>
          <Button onClick={() => navigate({ to: "/auth" })}>Giriş / Kayıt</Button>
        </div>
      </AppShell>
    );
  }

  const rows = tab === "wrong" ? wrong : favs;
  const loading = tab === "wrong" ? wLoading : fLoading;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Kişisel Arşivim</div>
          <h1 className="font-serif text-3xl mt-1">Yanlışlarım & Favorilerim</h1>
        </div>

        <div className="mb-5 inline-flex rounded-md border border-border bg-card p-1">
          <button
            onClick={() => setTab("wrong")}
            className={`px-4 py-1.5 text-sm rounded ${tab === "wrong" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
          >
            <XCircle className="inline h-4 w-4 mr-1" /> Yanlışlarım
          </button>
          <button
            onClick={() => setTab("favorites")}
            className={`px-4 py-1.5 text-sm rounded ${tab === "favorites" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
          >
            <Heart className="inline h-4 w-4 mr-1" /> Favorilerim
          </button>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-16">Yükleniyor...</div>
        ) : !rows || rows.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 paper-card rounded-lg">
            {tab === "wrong"
              ? "Henüz yanlış cevapladığın bir soru yok. Test çözmeye başla!"
              : "Henüz favorilerine soru eklemedin."}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r: any) => {
              const q = r.questions;
              const t = q.topics;
              return (
                <Link
                  key={r.id}
                  to="/sorular/$id"
                  params={{ id: q.id }}
                  className="block paper-card rounded-lg p-5 hover:border-gold/60 transition-colors group"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{t.subjects.exams.name}</Badge>
                    <span>·</span>
                    <span>{t.subjects.name}</span>
                    <span>·</span>
                    <span className="text-gold">{t.name}</span>
                    {q.year && <><span>·</span><span>{q.year}</span></>}
                    {tab === "wrong" && r.selected_option && (
                      <span className="ml-auto text-destructive">Cevabın: {r.selected_option} · Doğru: {q.correct_option}</span>
                    )}
                  </div>
                  <p className="text-foreground line-clamp-2">{q.question_text}</p>
                  <div className="mt-3 text-xs text-gold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {tab === "wrong" ? "Tekrar çöz" : "Soruya git"} <ChevronRight className="h-3 w-3" />
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
