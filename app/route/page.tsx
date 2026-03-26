"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { RouteEvent, RouteResponse } from "@/app/api/v1/route/route";

// ---------------------------------------------------------------------------
// Date helpers (client-side)
// ---------------------------------------------------------------------------

const WEEKDAY_DE: Record<number, string> = {
  1: "Montag",
  2: "Dienstag",
  3: "Mittwoch",
  4: "Donnerstag",
  5: "Freitag",
};

function parseLocalDate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

function formatDate(iso: string): string {
  const d = parseLocalDate(iso);
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

function shortDate(iso: string): string {
  const d = parseLocalDate(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

/** Returns the ISO date string for the Monday of the week containing today. */
function currentWeekLabel(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

function nextWeekLabel(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + 7);
  return monday.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type Action = "out" | "in";

type DisplayRow = RouteEvent & { action: Action };

function buildRows(events: RouteEvent[]): DisplayRow[] {
  const rows: DisplayRow[] = [];
  for (const ev of events) {
    // "Tonne raus" on the previous workday
    rows.push({ ...ev, action: "out" });
    // "Tonne rein" on the next workday
    rows.push({ ...ev, action: "in" });
  }
  return rows;
}

function ActionBadge({ action }: { action: Action }) {
  if (action === "out") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 print:bg-transparent print:text-black print:font-bold">
        Tonne raus
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 print:bg-transparent print:text-black">
      Tonne rein
    </span>
  );
}

function DaySection({
  date,
  events,
  actionType,
}: {
  date: string; // YYYY-MM-DD
  events: RouteEvent[];
  actionType: Action;
}) {
  if (events.length === 0) return null;

  return (
    <div className="mb-1">
      {/* Day header */}
      <div className="mb-1 flex items-baseline gap-2 px-1 print:mb-0.5">
        <span className="text-sm font-semibold text-gray-700 print:text-xs">
          {formatDate(date)}
        </span>
        <span className="text-xs text-gray-400 print:hidden">
          {actionType === "out" ? "→ Tonne rausstellen" : "→ Tonne reinholen"}
        </span>
      </div>

      {/* Table */}
      <table className="w-full border-collapse overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm print:rounded-none print:shadow-none">
        <thead className="print:hidden">
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500">
            <th className="px-3 py-2 w-8">#</th>
            <th className="px-3 py-2">Adresse</th>
            <th className="px-3 py-2">Tonne</th>
            <th className="px-3 py-2">Aktion</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr
              key={`${ev.addressId}-${ev.binType}-${actionType}`}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50 print:border-gray-200"
            >
              <td className="px-3 py-2.5 text-xs text-gray-400 tabular-nums print:py-1 print:text-xs">
                {ev.position + 1}
              </td>
              <td className="px-3 py-2.5 text-sm text-gray-800 print:py-1 print:text-xs">
                {ev.street} {ev.houseNumber}
              </td>
              <td className="px-3 py-2.5 text-sm text-gray-600 print:py-1 print:text-xs">
                {ev.binType}
              </td>
              <td className="px-3 py-2.5 print:py-1">
                <ActionBadge action={actionType} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Renders all days in a week. For each day, the pickup events contribute two
 * rows in the schedule: one on binOut day ("Tonne raus") and one on binIn day
 * ("Tonne rein"). We expand the event list into action-keyed buckets.
 */
function WeekSection({
  title,
  weekEvents,
}: {
  title: string;
  weekEvents: { [date: string]: RouteEvent[] };
}) {
  // Collect all unique action dates that appear across the week's events
  const outBuckets: { [date: string]: RouteEvent[] } = {};
  const inBuckets: { [date: string]: RouteEvent[] } = {};

  for (const events of Object.values(weekEvents)) {
    for (const ev of events) {
      if (!outBuckets[ev.binOut]) outBuckets[ev.binOut] = [];
      outBuckets[ev.binOut].push(ev);

      if (!inBuckets[ev.binIn]) inBuckets[ev.binIn] = [];
      inBuckets[ev.binIn].push(ev);
    }
  }

  // Merge and sort all action dates
  const allDates = Array.from(
    new Set([...Object.keys(outBuckets), ...Object.keys(inBuckets)]),
  ).sort();

  const isEmpty = allDates.length === 0;

  return (
    <section className="mb-8 print:mb-4">
      <h2 className="mb-3 text-base font-bold text-gray-900 print:mb-1 print:text-sm">
        {title}
      </h2>

      {isEmpty ? (
        <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400 print:hidden">
          Keine Abholungen in dieser Woche.
        </p>
      ) : (
        <div className="space-y-4 print:space-y-2">
          {allDates.map((date) => (
            <div key={date}>
              {/* "Tonne raus" actions on this date */}
              <DaySection
                date={date}
                events={(outBuckets[date] ?? []).sort(
                  (a, b) => a.position - b.position,
                )}
                actionType="out"
              />
              {/* "Tonne rein" actions on this date */}
              <DaySection
                date={date}
                events={(inBuckets[date] ?? []).sort(
                  (a, b) => a.position - b.position,
                )}
                actionType="in"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RoutePage() {
  const [data, setData] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/route")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/api/auth/login";
          return null;
        }
        if (!r.ok) throw new Error("Fehler beim Laden.");
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => setError("Tourenplan konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Print-only styles injected via a style tag */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          main { padding: 0 !important; }
        }
      `}</style>

      <main className="min-h-screen bg-gray-50 print:bg-white">
        {/* Header – hidden on print */}
        <header className="no-print sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-base font-semibold text-gray-900">
                Wochenplan
              </h1>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              Drucken
            </button>
          </div>
        </header>

        {/* Print header – only visible when printing */}
        <div className="hidden print:block px-4 pt-4 pb-2 border-b border-gray-200 mb-4">
          <h1 className="text-lg font-bold text-gray-900">Wochenplan – Tonnen</h1>
          <p className="text-xs text-gray-500">
            Gedruckt am{" "}
            {new Date().toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="mx-auto max-w-2xl px-4 py-6 print:px-2 print:py-0">
          {/* Loading skeletons */}
          {loading && (
            <div className="no-print space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-gray-100"
                />
              ))}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="no-print rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Route data */}
          {data && (
            <>
              <WeekSection
                title={`Diese Woche (ab ${currentWeekLabel()})`}
                weekEvents={data.currentWeek}
              />
              <WeekSection
                title={`Nächste Woche (ab ${nextWeekLabel()})`}
                weekEvents={data.nextWeek}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
