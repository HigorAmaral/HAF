"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      try {
        const attr = document.documentElement.getAttribute("data-theme");
        const saved = localStorage.getItem("haf_theme") as "light" | "dark" | null;
        const initial = attr === "dark" || saved === "dark" ? "dark" : "light";
        setTheme(initial);
        document.documentElement.setAttribute("data-theme", initial);
      } catch {
        // Ignore
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("haf_theme", next);
    } catch {
      // Ignore
    }
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="indeed-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
      title={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
      aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
    >
      {theme === "light" ? (
        <>
          <Moon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Escuro</span>
        </>
      ) : (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Claro</span>
        </>
      )}
    </button>
  );
}
