import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, LayoutDashboard, CalendarDays, CheckSquare, Sparkles, LogOut, User as UserIcon, Menu, X, XCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { User } from "@supabase/supabase-js";

const NAV = [
  { to: "/", label: "Ana Sayfa", icon: null },
  { to: "/sorular", label: "Soru Bankası", icon: BookOpen },
  { to: "/yanlislarim", label: "Yanlışlarım", icon: XCircle },
  { to: "/panel", label: "Panelim", icon: LayoutDashboard },
  { to: "/program", label: "Program", icon: CalendarDays },
  { to: "/gorevler", label: "Görevler", icon: CheckSquare },
  { to: "/asistan", label: "AI Asistan", icon: Sparkles },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-primary-foreground">
              <span className="font-serif text-lg leading-none">A</span>
            </div>
            <div className="leading-tight">
              <div className="font-serif text-lg text-foreground">Akademya</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">YKS · KPSS</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}>
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {user ? (
              <>
                <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-xs">
                  <UserIcon className="h-3.5 w-3.5 text-gold" />
                  <span className="text-foreground max-w-[140px] truncate">{user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} title="Çıkış"><LogOut className="h-4 w-4" /></Button>
              </>
            ) : (
              <Link to="/auth"><Button size="sm">Giriş / Kayıt</Button></Link>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button className="rounded-md p-2 hover:bg-secondary" onClick={() => setOpen(v => !v)} aria-label="Menü">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-border md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                  className="px-3 py-2 text-sm rounded-md text-foreground hover:bg-secondary">
                  {n.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-border pt-3">
                {user ? (
                  <Button variant="outline" size="sm" onClick={signOut} className="w-full">Çıkış yap</Button>
                ) : (
                  <Link to="/auth" onClick={() => setOpen(false)}><Button size="sm" className="w-full">Giriş / Kayıt</Button></Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/60 mt-16">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
          <div>© {new Date().getFullYear()} Akademya — Tamamen ücretsiz.</div>
          <div>YKS ve KPSS'ye hazırlanan öğrenciler için.</div>
        </div>
      </footer>
    </div>
  );
}
