"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("haf_theme") as "light" | "dark" | null;
    const initial = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("haf_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="gupy-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
      title={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
    >
      {theme === "light" ? (
        <>
          <Moon className="h-3.5 w-3.5" />
          <span>Dark</span>
        </>
      ) : (
        <>
          <Sun className="h-3.5 w-3.5" />
          <span>Light</span>
        </>
      )}
    </button>
  );
}
