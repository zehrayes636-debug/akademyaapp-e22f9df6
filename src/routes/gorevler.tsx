import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/gorevler")({ component: TasksPage });

function TasksPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<"düşük" | "normal" | "yüksek">("normal");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate({ to: "/auth" }); return; }
      setUser(data.session.user);
    });
  }, [navigate]);

  const { data: tasks } = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("tasks").select("*").eq("user_id", user.id).order("is_done").order("due_at", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const add = async () => {
    if (!user || !title.trim()) return;
    await supabase.from("tasks").insert({
      user_id: user.id, title: title.trim(),
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      priority,
    });
    setTitle(""); setDueAt(""); setPriority("normal");
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const toggle = async (id: string, done: boolean) => {
    await supabase.from("tasks").update({ is_done: !done }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const remove = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Görevler</div>
        <h1 className="font-serif text-3xl mt-1">Yapılacaklar & Hatırlatıcılar</h1>

        <div className="paper-card rounded-lg p-4 mt-6">
          <div className="grid gap-2 md:grid-cols-[1fr_180px_140px_auto]">
            <Input placeholder="Görev başlığı..." value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
            <Input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} />
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={priority} onChange={e => setPriority(e.target.value as any)}>
              <option value="düşük">Düşük</option><option value="normal">Normal</option><option value="yüksek">Yüksek</option>
            </select>
            <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Ekle</Button>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {tasks?.length === 0 ? (
            <div className="paper-card rounded-lg p-12 text-center">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
              <p className="text-muted-foreground">Henüz görev yok. Yukarıdan ekle.</p>
            </div>
          ) : tasks?.map(t => (
            <div key={t.id} className={`paper-card rounded-lg p-4 flex items-start gap-3 ${t.is_done ? "opacity-60" : ""}`}>
              <Checkbox checked={t.is_done} onCheckedChange={() => toggle(t.id, t.is_done)} className="mt-1" />
              <div className="flex-1">
                <div className={`text-foreground ${t.is_done ? "line-through" : ""}`}>{t.title}</div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {t.due_at && <Badge variant="outline">{new Date(t.due_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Badge>}
                  <Badge variant={t.priority === "yüksek" ? "destructive" : t.priority === "düşük" ? "secondary" : "default"}>{t.priority}</Badge>
                </div>
              </div>
              <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
