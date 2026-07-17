import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/asistan")({ component: AsistanPage });

function AsistanPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Merhaba! Ben Akademya AI Asistan. Dersler, konu anlatımları, ders programı ve çalışma stratejileri hakkında bana istediğini sorabilirsin." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate({ to: "/auth" }); return; }
      setUser(data.session.user);
    });
  }, [navigate]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => { inputRef.current?.focus(); }, [busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) {
        if (res.status === 429) toast.error("Çok fazla istek gönderdin, biraz bekle.");
        else if (res.status === 402) toast.error("AI kredisi tükendi.");
        else toast.error("AI yanıtı alınamadı.");
        setBusy(false);
        return;
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let acc = "";
      setMessages(m => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e) {
      toast.error("Bağlantı hatası");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8 flex flex-col" style={{ minHeight: "calc(100vh - 8rem)" }}>
        <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">AI Asistan</div>
        <h1 className="font-serif text-3xl mt-1 flex items-center gap-2">Akademya <Sparkles className="h-6 w-6 text-gold" /></h1>
        <p className="text-sm text-muted-foreground mt-1">Konu anlatımı, ders programı, çalışma önerileri — hepsi burada.</p>

        <div className="flex-1 mt-6 space-y-4 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-4 py-3 ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "paper-card"
              }`}>
                {m.role === "assistant" && (
                  <div className="text-[10px] uppercase tracking-widest text-gold mb-1">Asistan</div>
                )}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
              </div>
            </div>
          ))}
          {busy && messages[messages.length-1]?.role === "user" && (
            <div className="flex justify-start"><div className="paper-card rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Düşünüyor...</div></div>
          )}
          <div ref={endRef} />
        </div>

        <div className="mt-4 paper-card rounded-lg p-3">
          <Textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            placeholder="Sorunu yaz..." rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="border-0 focus-visible:ring-0 resize-none" />
          <div className="flex justify-end mt-1">
            <Button onClick={send} disabled={busy || !input.trim()} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Gönder
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
