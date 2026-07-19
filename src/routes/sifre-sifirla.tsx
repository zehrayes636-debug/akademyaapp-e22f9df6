import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/sifre-sifirla")({ component: ResetPage });

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase recovery link creates a session automatically on redirect.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Şifre en az 6 karakter olmalı.");
    if (password !== confirm) return toast.error("Şifreler eşleşmiyor.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Şifren güncellendi.");
    navigate({ to: "/panel" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="text-center mb-8">
          <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Hesap</div>
          <h1 className="font-serif text-3xl mt-1">Yeni şifre belirle</h1>
        </div>
        <div className="paper-card rounded-lg p-6">
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">
              Bağlantı doğrulanıyor... Bu sayfayı e-postandaki bağlantıdan açtığından emin ol.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>Yeni şifre</Label>
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} required minLength={6}
                    value={password} onChange={e => setPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPw ? "Gizle" : "Göster"}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Şifre (tekrar)</Label>
                <Input type={showPw ? "text" : "password"} required minLength={6}
                  value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Şifreyi güncelle
              </Button>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
