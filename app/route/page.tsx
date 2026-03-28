"use client";

import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import type { RouteEvent, RouteResponse } from "@/app/api/v1/route/route";

// ---------------------------------------------------------------------------
// Date helpers (client-side)
// ---------------------------------------------------------------------------

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

function ActionBadge({ action }: { action: Action }) {
  if (action === "out") {
    return (
      <span className="inline-flex items-center rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-semibold text-warning print:bg-transparent print:text-black print:font-bold">
        Tonne raus
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-accent-muted/35 px-2.5 py-0.5 text-xs font-semibold text-accent-secondary print:bg-transparent print:text-black">
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
        <span className="text-sm font-semibold text-foreground-secondary print:text-xs">
          {formatDate(date)}
        </span>
        <span className="text-xs text-foreground-tertiary print:hidden">
          {actionType === "out" ? "→ Tonne rausstellen" : "→ Tonne reinholen"}
        </span>
      </div>

      {/* Table */}
      <table className="w-full border-collapse overflow-hidden rounded-xl border border-border-subtle bg-background-subtle shadow-sm print:rounded-none print:shadow-none">
        <thead className="print:hidden">
          <tr className="border-b border-border-subtle bg-background text-left text-xs font-medium text-foreground-tertiary">
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
              className="border-b border-border-subtle last:border-0 hover:bg-background print:border-border"
            >
              <td className="px-3 py-2.5 text-xs text-foreground-tertiary tabular-nums print:py-1 print:text-xs">
                {ev.position + 1}
              </td>
              <td className="px-3 py-2.5 text-sm text-foreground print:py-1 print:text-xs">
                {ev.street} {ev.houseNumber}
              </td>
              <td className="px-3 py-2.5 text-sm text-foreground-secondary print:py-1 print:text-xs">
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
      <h2 className="mb-3 text-base font-bold text-foreground print:mb-1 print:text-sm">
        {title}
      </h2>

      {isEmpty ? (
        <p className="rounded-xl bg-background px-4 py-6 text-center text-sm text-foreground-tertiary print:hidden">
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

      <main className="min-h-screen bg-background print:bg-background-subtle">
        {/* Print header – only visible when printing */}
        <div className="hidden print:block px-4 pt-4 pb-2 border-b border-border mb-4">
          <h1 className="text-lg font-bold text-foreground">Wochenplan – Tonnen</h1>
          <p className="text-xs text-foreground-tertiary">
            Gedruckt am{" "}
            {new Date().toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="mx-auto max-w-2xl px-4 py-6 print:px-2 print:py-0">
          {/* Print button */}
          <div className="no-print flex items-center justify-between mb-6">
            <h1 className="text-lg font-semibold text-foreground">Wochenplan</h1>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm font-medium text-foreground-secondary shadow-sm hover:bg-background"
            >
              <Printer className="h-4 w-4" />
              Drucken
            </button>
          </div>
          {/* Loading skeletons */}
          {loading && (
            <div className="no-print space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-background-overlay"
                />
              ))}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="no-print rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
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
