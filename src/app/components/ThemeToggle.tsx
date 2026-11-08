"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    let initialTheme: "light" | "dark" =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";
    try {
      const savedTheme = localStorage.getItem("loacheck-theme-v2");
      if (savedTheme === "light" || savedTheme === "dark") {
        initialTheme = savedTheme;
      }
    } catch {
      // Keep the current theme when browser storage is unavailable.
    }
    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
    const syncTheme = (event: StorageEvent) => {
      if (event.key !== "loacheck-theme-v2") return;
      const next = event.newValue === "light" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("loacheck-theme-v2", next);
    } catch {
      // Storage can be unavailable in private browsing; the current tab still switches.
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle flex h-9 w-9 items-center justify-center rounded-lg border transition-colors"
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      aria-pressed={theme === "light"}
      title={theme === "dark" ? "라이트 모드" : "다크 모드"}
    >
      {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}
