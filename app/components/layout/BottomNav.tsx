"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { navItems } from "./NavItems";

const STORAGE_KEY = "tonnenraus-theme";

export default function BottomNav() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useKindeBrowserClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-theme") !== "light"
      : true,
  );
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
    setIsDark(!isDark);
  }

  const initials =
    isAuthenticated && user
      ? `${user.given_name?.[0] ?? ""}${user.family_name?.[0] ?? ""}`.toUpperCase() ||
        user.email?.[0]?.toUpperCase() ||
        "?"
      : null;

  // First 3 items only — 4th slot is the user button
  const mainItems = navItems.slice(0, 3);

  return (
    <div className="print:hidden">
      {/* User menu popover */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed right-4 z-50 w-52 rounded-2xl overflow-hidden shadow-lg"
          style={{
            bottom: "calc(60px + env(safe-area-inset-bottom) + 8px)",
            background: "var(--bg-subtle)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {/* User info */}
          {isAuthenticated && user && (
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <p
                className="text-sm font-semibold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {user.given_name
                  ? `${user.given_name} ${user.family_name ?? ""}`.trim()
                  : user.email}
              </p>
              {user.given_name && (
                <p
                  className="text-xs truncate mt-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {user.email}
                </p>
              )}
            </div>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between px-4 py-3 text-sm transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <span>{isDark ? "Dark Mode" : "Light Mode"}</span>
            {isDark ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Auth actions */}
          <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
            {isAuthenticated ? (
              <Link
                href="/api/auth/logout"
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm transition-colors"
                style={{ color: "var(--text-tertiary)" }}
              >
                <LogOut size={15} />
                Abmelden
              </Link>
            ) : (
              <>
                <Link
                  href="/api/auth/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <LogIn size={15} />
                  Anmelden
                </Link>
                <Link
                  href="/api/auth/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold transition-colors"
                  style={{
                    color: "var(--accent-primary)",
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  Registrieren
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 flex lg:hidden items-center justify-around z-40"
        style={{
          height: "calc(60px + env(safe-area-inset-bottom))",
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "var(--surface-glass)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        {mainItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-2 transition-colors duration-150"
              style={{
                color: isActive
                  ? "var(--accent-primary)"
                  : "var(--text-tertiary)",
              }}
            >
              <Icon size={22} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* User avatar button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex flex-col items-center gap-1 px-3 py-2 transition-colors duration-150"
          style={{
            color: menuOpen ? "var(--accent-primary)" : "var(--text-tertiary)",
          }}
        >
          {initials ? (
            <div
              className="flex h-5.5 w-5.5 items-center justify-center rounded-full text-[10px] font-bold"
              style={{
                background: menuOpen
                  ? "var(--accent-primary)"
                  : "var(--accent-muted)",
                color: menuOpen
                  ? "var(--text-inverse)"
                  : "var(--accent-secondary)",
              }}
            >
              {initials}
            </div>
          ) : (
            <UserRound size={22} />
          )}
          <span className="text-xs font-medium">Konto</span>
        </button>
      </nav>
    </div>
  );
}
