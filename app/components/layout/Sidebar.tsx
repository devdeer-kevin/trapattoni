"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, UserPlus } from "lucide-react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { navItems } from "./NavItems";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useKindeBrowserClient();

  const initials =
    isAuthenticated && user
      ? `${user.given_name?.[0] ?? ""}${user.family_name?.[0] ?? ""}`.toUpperCase() ||
        user.email?.[0]?.toUpperCase() ||
        "?"
      : null;

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 hidden lg:flex flex-col z-40 print:hidden"
      style={{
        borderRight: "1px solid var(--border-subtle)",
        background: "var(--bg-subtle)",
      }}
    >
      {/* Logo + App name */}
      <div
        className="px-6 py-5 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <Image
          src="/logo-tonne.svg"
          alt="TonneRaus Logo"
          width={28}
          height={34}
          className="w-5"
        />
        <span
          className="text-lg font-semibold"
          style={{ color: "var(--accent-primary)" }}
        >
          TonneRaus
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors duration-150"
              style={{
                color: isActive
                  ? "var(--accent-primary)"
                  : "var(--text-secondary)",
                background: isActive ? "var(--accent-glow)" : "transparent",
              }}
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Auth section */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        {isLoading ? (
          <div
            className="h-8 animate-pulse rounded-lg"
            style={{ background: "var(--bg-elevated)" }}
          />
        ) : isAuthenticated && user ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: "var(--accent-primary)",
                  color: "var(--text-inverse)",
                }}
              >
                {initials}
              </div>
              <span
                className="text-sm truncate"
                style={{ color: "var(--text-secondary)" }}
              >
                {user.given_name ?? user.email ?? ""}
              </span>
            </div>
            <Link
              href="/api/auth/logout"
              prefetch={false}
              className="shrink-0"
              style={{ color: "var(--text-tertiary)" }}
              title="Abmelden"
            >
              <LogOut size={16} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              href="/api/auth/login"
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors"
              style={{
                color: "var(--text-secondary)",
                background: "var(--bg-elevated)",
              }}
            >
              <LogIn size={15} />
              Anmelden
            </Link>
            <Link
              href="/api/auth/register"
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors"
              style={{
                background: "var(--accent-primary)",
                color: "var(--text-inverse)",
              }}
            >
              <UserPlus size={15} />
              Registrieren
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
