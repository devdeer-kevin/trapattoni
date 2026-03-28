import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Image from "next/image";
import ThemeToggle from "@/app/components/theme-toggle";
import Sidebar from "@/app/components/layout/Sidebar";
import BottomNav from "@/app/components/layout/BottomNav";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "TonneRaus - Abfuhrkalender Magdeburg",
  description: "Abfuhrkalender für Magdeburg",
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("tonnenraus-theme");
    var preferred = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    var theme = stored === "light" || stored === "dark" ? stored : preferred;
    document.documentElement.setAttribute("data-theme", theme);
  } catch (_err) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${outfit.variable} antialiased`}>
        <Sidebar />
        <main
          className="ml-0 lg:ml-60 min-h-screen"
          style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom))" }}
        >
          <header
            className="lg:hidden sticky top-0 z-30 px-4 py-3"
            style={{
              background: "var(--surface-glass)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div className="flex items-center justify-center gap-2.5">
              <Image
                src="/logo-tonne.svg"
                alt="TonneRaus Logo"
                width={22}
                height={27}
                className="w-4"
              />
              <span
                className="text-xl font-semibold"
                style={{ color: "var(--accent-primary)" }}
              >
                TonneRaus
              </span>
            </div>
          </header>
          {children}
        </main>
        <BottomNav />
        <ThemeToggle />
      </body>
    </html>
  );
}
