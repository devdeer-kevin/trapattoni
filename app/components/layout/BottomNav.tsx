"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./NavItems";

export default function BottomNav() {
  const pathname = usePathname();

  return (
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
            className="flex flex-col items-center gap-1 px-3 py-2 transition-colors duration-150"
            style={{
              color: isActive ? "var(--accent-primary)" : "var(--text-tertiary)",
            }}
          >
            <Icon size={22} />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
