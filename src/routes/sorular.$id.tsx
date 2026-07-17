import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Heart, ArrowLeft, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/sorular/$id")({ component: QuestionDetail });

function QuestionDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [comment, setComment] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, []);

  const { data: q } = useQuery({
    queryKey: ["question", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select(`
        *, topics!inner(id, name, summary, subjects!inner(id, name, exams!inner(name, slug)))
      `).eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: fav } = useQuery({
    queryKey: ["fav", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("favorites").select("id").eq("question_id", id).eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data } = await supabase.from("comments").select("id, body, created_at, user_id, profiles(full_name, avatar_url)").eq("question_id", id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const submit = async () => {
    if (!selected) return;
    setSubmitted(true);
    if (user && q) {
      await supabase.from("question_attempts").insert({
        user_id: user.id, question_id: q.id,
        selected_option: selected, is_correct: selected === q.correct_option,
      });
    }
  };

  const toggleFav = async () => {
    if (!user) return toast.error("Favorilere eklemek için giriş yap.");
    if (fav) {
      await supabase.from("favorites").delete().eq("id", fav.id);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, question_id: id });
    }
    qc.invalidateQueries({ queryKey: ["fav", id] });
  };

  const postComment = async () => {
    if (!user) return toast.error("Yorum yapmak için giriş yap.");
    if (!comment.trim()) return;
    await supabase.from("comments").insert({ user_id: user.id, question_id: id, body: comment.trim() });
    setComment("");
    qc.invalidateQueries({ queryKey: ["comments", id] });
  };

  if (!q) return <AppShell><div className="p-16 text-center text-muted-foreground">Yükleniyor...</div></AppShell>;

  const options = (q.options as { key: string; text: string }[]) ?? [];
  const t: any = q.topics;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/sorular" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Sorulara dön
        </Link>

        <div className="paper-card rounded-lg p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-4">
            <Badge variant="secondary">{t.subjects.exams.name}</Badge>
            <span>{t.subjects.name}</span><span>·</span>
            <span className="text-gold">{t.name}</span>
            {q.year && <><span>·</span><span>{q.year}</span></>}
            {q.source && <><span>·</span><span>{q.source}</span></>}
            <div className="ml-auto">
              <Button size="sm" variant="ghost" onClick={toggleFav}>
                <Heart className={`h-4 w-4 ${fav ? "fill-destructive text-destructive" : ""}`} />
              </Button>
            </div>
          </div>

          <p className="font-serif text-xl leading-relaxed text-foreground whitespace-pre-wrap">{q.question_text}</p>

          <div className="mt-6 space-y-2">
            {options.map((o) => {
              const isSelected = selected === o.key;
              const isCorrect = submitted && o.key === q.correct_option;
              const isWrong = submitted && isSelected && o.key !== q.correct_option;
              return (
                <button key={o.key}
                  disabled={submitted}
                  onClick={() => setSelected(o.key)}
                  className={`w-full text-left rounded-md border px-4 py-3 flex items-start gap-3 transition-colors
                    ${isCorrect ? "border-green-600 bg-green-50 dark:bg-green-950/30" :
                      isWrong ? "border-destructive bg-destructive/5" :
                      isSelected ? "border-gold bg-gold/5" : "border-border hover:border-gold/60"}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-serif ${isSelected ? "border-gold text-gold" : "border-border text-muted-foreground"}`}>
                    {o.key}
                  </span>
                  <span className="pt-0.5">{o.text}</span>
                  {isCorrect && <CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />}
                  {isWrong && <XCircle className="ml-auto h-5 w-5 text-destructive" />}
                </button>
              );
            })}
          </div>

          {!submitted ? (
            <Button className="mt-6" onClick={submit} disabled={!selected}>Cevabı gör</Button>
          ) : (
            <div className="mt-6 rounded-md border border-gold/40 bg-gold/5 p-4">
              <div className="text-xs uppercase tracking-widest text-gold">Çözüm</div>
              <p className="mt-2 text-sm text-foreground leading-relaxed">{q.explanation}</p>
              {t.summary && (
                <div className="mt-4 pt-4 border-t border-gold/20">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Konu özeti — {t.name}</div>
                  <p className="mt-2 text-sm text-foreground leading-relaxed">{t.summary}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="mt-8">
          <h2 className="font-serif text-lg mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Yorumlar</h2>
          <div className="paper-card rounded-lg p-4">
            <Textarea placeholder={user ? "Bu soru hakkında yorumun..." : "Yorum yapmak için giriş yap"} value={comment} onChange={e => setComment(e.target.value)} disabled={!user} />
            <div className="flex justify-end mt-2"><Button size="sm" onClick={postComment} disabled={!user}>Gönder</Button></div>
          </div>
          <div className="mt-4 space-y-3">
            {comments?.map((c: any) => (
              <div key={c.id} className="paper-card rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">{c.profiles?.full_name ?? "Kullanıcı"} · {new Date(c.created_at).toLocaleDateString("tr-TR")}</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
            {comments?.length === 0 && <div className="text-center text-sm text-muted-foreground py-4">Henüz yorum yok.</div>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
