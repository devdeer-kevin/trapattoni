"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "tonnenraus-theme";

function getCurrentTheme(): Theme {
  const rootTheme = document.documentElement.getAttribute("data-theme");
  return rootTheme === "light" ? "light" : "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") {
      return "dark";
    }
    return getCurrentTheme();
  });

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Zu hellem Theme wechseln" : "Zu dunklem Theme wechseln"}
      title={isDark ? "Helles Theme" : "Dunkles Theme"}
      onClick={toggleTheme}
      className="fixed bottom-4 right-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-(--surface-glass) text-foreground shadow-md backdrop-blur-md transition-colors hover:border-border-strong hover:bg-background-elevated"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
