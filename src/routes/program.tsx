import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export const Route = createFileRoute("/program")({ component: ProgramPage });

function ProgramPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ day_of_week: 0, start_time: "09:00", end_time: "10:00", title: "", notes: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate({ to: "/auth" }); return; }
      setUser(data.session.user);
    });
  }, [navigate]);

  const { data: slots } = useQuery({
    queryKey: ["plan", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("study_plan_slots").select("*").eq("user_id", user.id).order("day_of_week").order("start_time");
      return data ?? [];
    },
    enabled: !!user,
  });

  const add = async () => {
    if (!user || !form.title.trim()) return toast.error("Başlık gerekli");
    const { error } = await supabase.from("study_plan_slots").insert({ ...form, user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("Eklendi");
    setOpen(false);
    setForm({ day_of_week: 0, start_time: "09:00", end_time: "10:00", title: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["plan"] });
  };

  const remove = async (id: string) => {
    await supabase.from("study_plan_slots").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["plan"] });
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Haftalık Program</div>
            <h1 className="font-serif text-3xl mt-1">Ders programın</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Ders ekle</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Programa ders ekle</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Başlık</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Matematik - Türev" /></div>
                <div><Label>Gün</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.day_of_week} onChange={e => setForm({...form, day_of_week: Number(e.target.value)})}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Başlangıç</Label><Input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} /></div>
                  <div><Label>Bitiş</Label><Input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} /></div>
                </div>
                <div><Label>Not (opsiyonel)</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={add}>Kaydet</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DAYS.map((day, di) => {
            const daySlots = slots?.filter(s => s.day_of_week === di) ?? [];
            return (
              <div key={di} className="paper-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-lg">{day}</h3>
                  <span className="text-xs text-muted-foreground">{daySlots.length} ders</span>
                </div>
                <div className="space-y-2">
                  {daySlots.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic py-4 text-center">Boş gün</div>
                  ) : daySlots.map(s => (
                    <div key={s.id} className="group rounded-md border border-border p-3 bg-secondary/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-xs text-gold flex items-center gap-1"><Clock className="h-3 w-3" />{s.start_time.slice(0,5)} — {s.end_time.slice(0,5)}</div>
                          <div className="font-medium text-sm mt-1">{s.title}</div>
                          {s.notes && <div className="text-xs text-muted-foreground mt-1">{s.notes}</div>}
                        </div>
                        <button onClick={() => remove(s.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
