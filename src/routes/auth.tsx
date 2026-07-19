import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "E-posta veya şifre hatalı.";
  if (m.includes("email not confirmed")) return "E-postanı doğrulaman gerekiyor. Gelen kutunu kontrol et.";
  if (m.includes("user already registered")) return "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.";
  if (m.includes("password should be at least")) return "Şifre en az 6 karakter olmalı.";
  if (m.includes("rate limit") || m.includes("over_email_send_rate_limit")) return "Çok fazla istek. Biraz sonra tekrar dene.";
  if (m.includes("network")) return "Bağlantı hatası. İnternetini kontrol et.";
  return msg;
}

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<"auth" | "forgot">("auth");
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string; name?: string }>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/panel" });
    });
  }, [navigate]);

  const validate = (opts: { needName?: boolean; needPw?: boolean } = { needPw: true }) => {
    const err: typeof fieldErr = {};
    if (!validateEmail(email)) err.email = "Geçerli bir e-posta gir.";
    if (opts.needPw && password.length < 6) err.password = "Şifre en az 6 karakter olmalı.";
    if (opts.needName && name.trim().length < 2) err.name = "Adını gir.";
    setFieldErr(err);
    return Object.keys(err).length === 0;
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Hoş geldin!");
    navigate({ to: "/panel" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate({ needName: true, needPw: true })) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/` },
    });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Kayıt başarılı! E-postanı doğrulaman gerekebilir.");
    navigate({ to: "/panel" });
  };

  const forgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate({ needPw: false })) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/sifre-sifirla`,
    });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Sıfırlama bağlantısı gönderildi. E-postanı kontrol et.");
    setMode("auth");
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Google ile giriş başarısız.");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="text-center mb-8">
          <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Hesap</div>
          <h1 className="font-serif text-3xl mt-1">
            {mode === "forgot" ? "Şifreni sıfırla" : "Akademya'ya giriş"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "forgot"
              ? "E-postanı gir, sana sıfırlama bağlantısı gönderelim."
              : "İlerlemeni kaydetmek ve tüm özellikleri kullanmak için."}
          </p>
        </div>

        <div className="paper-card rounded-lg p-6">
          {mode === "forgot" ? (
            <form onSubmit={forgot} className="space-y-3">
              <div>
                <Label>E-posta</Label>
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  aria-invalid={!!fieldErr.email} />
                {fieldErr.email && <p className="text-xs text-destructive mt-1">{fieldErr.email}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sıfırlama bağlantısı gönder
              </Button>
              <button type="button" onClick={() => setMode("auth")}
                className="w-full text-xs text-muted-foreground hover:text-foreground">
                ← Geri dön
              </button>
            </form>
          ) : (
            <>
              <Button variant="outline" className="w-full gap-2 mb-4" onClick={google} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.5 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.5l6.2 5.3C41 34.8 44 30 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
                Google ile devam et
              </Button>

              <div className="relative my-4"><div className="h-px bg-border" /><span className="absolute inset-x-0 -top-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground"><span className="bg-card px-2">veya e-posta ile</span></span></div>

              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="signin">Giriş</TabsTrigger><TabsTrigger value="signup">Kayıt</TabsTrigger></TabsList>
                <TabsContent value="signin">
                  <form onSubmit={signIn} className="space-y-3 mt-3">
                    <div>
                      <Label>E-posta</Label>
                      <Input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                        aria-invalid={!!fieldErr.email} />
                      {fieldErr.email && <p className="text-xs text-destructive mt-1">{fieldErr.email}</p>}
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Şifre</Label>
                        <button type="button" onClick={() => setMode("forgot")}
                          className="text-xs text-muted-foreground hover:text-foreground">
                          Şifremi unuttum
                        </button>
                      </div>
                      <div className="relative">
                        <Input type={showPw ? "text" : "password"} required value={password}
                          onChange={e => setPassword(e.target.value)} aria-invalid={!!fieldErr.password}
                          className="pr-10" />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}>
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldErr.password && <p className="text-xs text-destructive mt-1">{fieldErr.password}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Giriş yap
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={signUp} className="space-y-3 mt-3">
                    <div>
                      <Label>Ad Soyad</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} aria-invalid={!!fieldErr.name} />
                      {fieldErr.name && <p className="text-xs text-destructive mt-1">{fieldErr.name}</p>}
                    </div>
                    <div>
                      <Label>E-posta</Label>
                      <Input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                        aria-invalid={!!fieldErr.email} />
                      {fieldErr.email && <p className="text-xs text-destructive mt-1">{fieldErr.email}</p>}
                    </div>
                    <div>
                      <Label>Şifre</Label>
                      <div className="relative">
                        <Input type={showPw ? "text" : "password"} required minLength={6} value={password}
                          onChange={e => setPassword(e.target.value)} aria-invalid={!!fieldErr.password}
                          className="pr-10" />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}>
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldErr.password && <p className="text-xs text-destructive mt-1">{fieldErr.password}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">En az 6 karakter.</p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Kayıt ol
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-4">
          Devam ederek <Link to="/" className="underline">kullanım koşullarını</Link> kabul etmiş olursun.
        </p>
      </div>
    </AppShell>
  );
}
