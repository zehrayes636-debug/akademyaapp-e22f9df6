import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type Theme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const Icon = resolved === "dark" ? Moon : Sun;

  const items: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Aydınlık", icon: Sun },
    { value: "dark", label: "Karanlık", icon: Moon },
    { value: "system", label: "Sistem", icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Tema seç" className="h-9 w-9">
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map(({ value, label, icon: I }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)}
            className={theme === value ? "bg-secondary" : ""}>
            <I className="mr-2 h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
