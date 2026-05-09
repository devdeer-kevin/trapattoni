"use client";

import { useState, useEffect } from "react";
import { Printer, SlidersHorizontal } from "lucide-react";
import type { RouteEvent, RouteResponse } from "@/app/api/v1/route/route";
import { AddressFilterPanel } from "../components/AddressFilterPanel";
import type { AddressEntry } from "../components/AddressFilterPanel";

// ---------------------------------------------------------------------------
// Preferences persistence
// ---------------------------------------------------------------------------

const ROUTE_PREFS_KEY = "tonnenraus-route-prefs";
type RoutePrefs = { hiddenIds: number[]; order: number[] };

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
// Address filter helpers
// ---------------------------------------------------------------------------

function extractAddresses(
  currentWeek: { [date: string]: RouteEvent[] },
  nextWeek: { [date: string]: RouteEvent[] },
): AddressEntry[] {
  const map = new Map<
    number,
    { addressId: number; label: string; position: number }
  >();
  for (const events of [
    ...Object.values(currentWeek),
    ...Object.values(nextWeek),
  ]) {
    for (const ev of events) {
      if (!map.has(ev.addressId)) {
        map.set(ev.addressId, {
          addressId: ev.addressId,
          label: `${ev.street} ${ev.houseNumber}`,
          position: ev.position,
        });
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => a.position - b.position)
    .map(({ addressId, label }) => ({ addressId, label }));
}

function normaliseOrder(
  savedOrder: number[],
  allAddressIds: number[],
): number[] {
  const filtered = savedOrder.filter((id) => allAddressIds.includes(id));
  const appended = allAddressIds.filter((id) => !filtered.includes(id));
  return [...filtered, ...appended];
}

function applyFilterAndOrder(
  weekEvents: { [date: string]: RouteEvent[] },
  hiddenAddressIds: Set<number>,
  addressOrder: number[],
): { [date: string]: RouteEvent[] } {
  const result: { [date: string]: RouteEvent[] } = {};
  for (const [date, events] of Object.entries(weekEvents)) {
    const filtered = events
      .filter((ev) => !hiddenAddressIds.has(ev.addressId))
      .sort(
        (a, b) =>
          addressOrder.indexOf(a.addressId) - addressOrder.indexOf(b.addressId),
      );
    if (filtered.length > 0) result[date] = filtered;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Address-view helpers
// ---------------------------------------------------------------------------

type AddressViewEntry = {
  addressId: number;
  street: string;
  houseNumber: string;
  bins: Array<{ binType: string; behaelter: string | null }>;
};

type AddressViewDay = {
  date: string;
  out: AddressViewEntry[];
  in: AddressViewEntry[];
};

function getBinLabel(
  binType: string,
  behaelter: string | null,
  accountType: string,
): string {
  if (binType === "Gelbe Tonne" && accountType === "business" && behaelter) {
    return behaelter === "b1100" ? "Gelbe Tonne 1100 L" : "Gelbe Tonne 120/240 L";
  }
  return binType;
}

function buildAddressView(
  weekEvents: { [date: string]: RouteEvent[] },
  addressOrder: number[],
): AddressViewDay[] {
  const outByDate = new Map<string, Map<number, AddressViewEntry>>();
  const inByDate = new Map<string, Map<number, AddressViewEntry>>();

  for (const events of Object.values(weekEvents)) {
    for (const ev of events) {
      for (const [dateKey, byDate] of [
        [ev.binOut, outByDate],
        [ev.binIn, inByDate],
      ] as [string, Map<string, Map<number, AddressViewEntry>>][]) {
        if (!byDate.has(dateKey)) byDate.set(dateKey, new Map());
        const addrMap = byDate.get(dateKey)!;
        if (!addrMap.has(ev.addressId)) {
          addrMap.set(ev.addressId, {
            addressId: ev.addressId,
            street: ev.street,
            houseNumber: ev.houseNumber,
            bins: [],
          });
        }
        const entry = addrMap.get(ev.addressId)!;
        if (
          !entry.bins.some(
            (b) => b.binType === ev.binType && b.behaelter === ev.behaelter,
          )
        ) {
          entry.bins.push({ binType: ev.binType, behaelter: ev.behaelter });
        }
      }
    }
  }

  const allDates = Array.from(
    new Set([...outByDate.keys(), ...inByDate.keys()]),
  ).sort();

  const sortByOrder = (a: AddressViewEntry, b: AddressViewEntry) =>
    addressOrder.indexOf(a.addressId) - addressOrder.indexOf(b.addressId);

  return allDates.map((date) => ({
    date,
    out: Array.from(outByDate.get(date)?.values() ?? []).sort(sortByOrder),
    in: Array.from(inByDate.get(date)?.values() ?? []).sort(sortByOrder),
  }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type Action = "out" | "in";

function ActionBadge({ action }: { action: Action }) {
  if (action === "out") {
    return (
      <span className="inline-flex items-center rounded-full bg-accent-muted/35 px-2.5 py-0.5 text-xs font-semibold text-accent-secondary print:bg-transparent print:text-black print:font-bold">
        Tonne raus
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-semibold text-warning print:bg-transparent print:text-black">
      Tonne rein
    </span>
  );
}

const BIN_TYPE_STYLES: Record<string, { dot: string; text: string }> = {
  Bioabfall: { dot: "bg-amber-700", text: "text-amber-800" },
  Altpapier: { dot: "bg-blue-600", text: "text-blue-700" },
  "Gelbe Tonne": { dot: "bg-yellow-400", text: "text-yellow-600" },
  Restabfall: { dot: "bg-gray-700", text: "text-gray-700" },
};

function BinTypeBadge({
  binType,
  behaelter,
  accountType,
}: {
  binType: string;
  behaelter: string | null;
  accountType: string;
}) {
  let label = binType;
  if (binType === "Gelbe Tonne" && accountType === "business" && behaelter) {
    label =
      behaelter === "b1100" ? "Gelbe Tonne 1100 L" : "Gelbe Tonne 120/240 L";
  }

  const styleKey = binType === "Gelbe Tonne" ? "Gelbe Tonne" : binType;
  const style = BIN_TYPE_STYLES[styleKey] ?? {
    dot: "bg-gray-400",
    text: "text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${style.text}`}
    >
      <span
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
      />
      {label}
    </span>
  );
}

type DayEntry = { event: RouteEvent; action: Action };
type CombinedDayEntry = { event: RouteEvent; actions: Action[] };

function groupByAddress(
  entries: DayEntry[],
  addressOrder: number[],
): CombinedDayEntry[] {
  const map = new Map<string, CombinedDayEntry>();
  for (const { event, action } of entries) {
    const key = `${event.addressId}-${event.binType}-${event.behaelter ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      if (!existing.actions.includes(action)) {
        existing.actions.push(action);
        existing.actions.sort((a) => (a === "out" ? -1 : 1));
      }
    } else {
      map.set(key, { event, actions: [action] });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      addressOrder.indexOf(a.event.addressId) -
      addressOrder.indexOf(b.event.addressId),
  );
}

function DaySection({
  date,
  entries,
  showDate = true,
  subLabel,
  accountType,
}: {
  date: string; // YYYY-MM-DD
  entries: CombinedDayEntry[];
  showDate?: boolean;
  subLabel?: string;
  accountType: string;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-2">
      {(showDate || subLabel) && (
        <div className="mb-1 flex items-baseline gap-2 px-1 print:mb-0.5">
          {showDate && (
            <span className="text-sm font-semibold text-foreground-secondary print:text-xs">
              {formatDate(date)}
            </span>
          )}
          {subLabel && (
            <span className="text-xs text-foreground-tertiary">{subLabel}</span>
          )}
        </div>
      )}

      {/* Table */}
      <table className="w-full table-fixed border-collapse overflow-hidden border border-border-subtle bg-background-subtle shadow-sm print:rounded-none print:shadow-none">
        <colgroup>
          <col />
          <col className="w-48" />
          <col className="w-44" />
        </colgroup>
        <thead className="print:hidden">
          <tr className="border-b border-border-subtle bg-background text-left text-xs font-medium text-foreground-tertiary">
            <th className="px-3 py-2">Adresse</th>
            <th className="px-3 py-2">Tonne</th>
            <th className="px-3 py-2">Aktion</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ event: ev, actions }) => (
            <tr
              key={`${ev.addressId}-${ev.binType}-${ev.pickupDate}-${ev.behaelter ?? ""}`}
              className="border-b border-border-subtle last:border-0 hover:bg-background print:border-border"
            >
              <td className="px-3 py-2.5 text-xs sm:text-sm text-foreground print:py-1 print:text-xs">
                {ev.street} {ev.houseNumber}
              </td>
              <td className="px-3 py-2.5 text-sm print:py-1 print:text-xs">
                <BinTypeBadge
                  binType={ev.binType}
                  behaelter={ev.behaelter}
                  accountType={accountType}
                />
              </td>
              <td className="px-3 py-2.5 print:py-1">
                <div className="flex flex-wrap gap-1.5">
                  {actions.map((action) => (
                    <ActionBadge key={action} action={action} />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekSection({
  title,
  weekEvents,
  addressOrder,
  accountType,
}: {
  title: string;
  weekEvents: { [date: string]: RouteEvent[] };
  addressOrder: number[];
  accountType: string;
}) {
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
          {allDates.map((date) => {
            const sortByOrder = (a: RouteEvent, b: RouteEvent) =>
              addressOrder.indexOf(a.addressId) -
              addressOrder.indexOf(b.addressId);

            const outAll = (outBuckets[date] ?? []).slice().sort(sortByOrder);
            const inAll = (inBuckets[date] ?? []).slice().sort(sortByOrder);

            // Events where binOut=date AND pickupDate=date are put out the same
            // morning before the collection (Monday case). All other out-events
            // on this date are put out in the afternoon for the next pickup.
            const morningOut = outAll
              .filter((ev) => ev.pickupDate === date)
              .map((ev) => ({ event: ev, action: "out" as Action }));
            const afternoonOut = outAll
              .filter((ev) => ev.pickupDate !== date)
              .map((ev) => ({ event: ev, action: "out" as Action }));
            const afternoonIn = inAll.map((ev) => ({
              event: ev,
              action: "in" as Action,
            }));

            // Split only when same-day raus and afternoon actions coexist (Monday)
            const needsSplit =
              morningOut.length > 0 &&
              (afternoonIn.length > 0 || afternoonOut.length > 0);

            if (needsSplit) {
              return (
                <div key={date} className="space-y-2 print:space-y-1">
                  <DaySection
                    date={date}
                    entries={groupByAddress(morningOut, addressOrder)}
                    subLabel="→ Vormittags"
                    accountType={accountType}
                  />
                  {afternoonIn.length > 0 && (
                    <DaySection
                      date={date}
                      entries={groupByAddress(afternoonIn, addressOrder)}
                      showDate={false}
                      subLabel="Nachmittags – rein"
                      accountType={accountType}
                    />
                  )}
                  {afternoonOut.length > 0 && (
                    <DaySection
                      date={date}
                      entries={groupByAddress(afternoonOut, addressOrder)}
                      showDate={false}
                      subLabel="Nachmittags – raus"
                      accountType={accountType}
                    />
                  )}
                </div>
              );
            }

            // Normal case: one row per address, both actions shown side by side
            const combined = groupByAddress(
              [...morningOut, ...afternoonOut, ...afternoonIn],
              addressOrder,
            );
            return (
              <DaySection
                key={date}
                date={date}
                entries={combined}
                accountType={accountType}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function AddressDaySection({
  date,
  outEntries,
  inEntries,
  accountType,
}: {
  date: string;
  outEntries: AddressViewEntry[];
  inEntries: AddressViewEntry[];
  accountType: string;
}) {
  if (outEntries.length === 0 && inEntries.length === 0) return null;

  const tableRows = (entries: AddressViewEntry[]) =>
    entries.map((entry) => (
      <tr
        key={entry.addressId}
        className="border-b border-border-subtle last:border-0 hover:bg-background print:border-border"
      >
        <td className="px-3 py-2.5 text-xs sm:text-sm text-foreground print:py-1 print:text-xs">
          {entry.street} {entry.houseNumber}
        </td>
        <td className="px-3 py-2.5 text-sm text-foreground-secondary print:py-1 print:text-xs">
          {entry.bins
            .map((b) => getBinLabel(b.binType, b.behaelter, accountType))
            .join(", ")}
        </td>
      </tr>
    ));

  return (
    <div className="mt-2">
      <div className="mb-1 px-1">
        <span className="text-sm font-semibold text-foreground-secondary print:text-xs">
          {formatDate(date)}
        </span>
      </div>

      {outEntries.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 px-1">
            <ActionBadge action="out" />
          </div>
          <table className="w-full table-fixed border-collapse overflow-hidden border border-border-subtle bg-background-subtle shadow-sm print:rounded-none print:shadow-none">
            <colgroup>
              <col />
              <col className="w-56" />
            </colgroup>
            <tbody>{tableRows(outEntries)}</tbody>
          </table>
        </div>
      )}

      {inEntries.length > 0 && (
        <div>
          <div className="mb-1 px-1">
            <ActionBadge action="in" />
          </div>
          <table className="w-full table-fixed border-collapse overflow-hidden border border-border-subtle bg-background-subtle shadow-sm print:rounded-none print:shadow-none">
            <colgroup>
              <col />
              <col className="w-56" />
            </colgroup>
            <tbody>{tableRows(inEntries)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WeekSectionByAddress({
  title,
  weekEvents,
  addressOrder,
  accountType,
}: {
  title: string;
  weekEvents: { [date: string]: RouteEvent[] };
  addressOrder: number[];
  accountType: string;
}) {
  const days = buildAddressView(weekEvents, addressOrder);
  const isEmpty = days.length === 0;

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
          {days.map((day) => (
            <AddressDaySection
              key={day.date}
              date={day.date}
              outEntries={day.out}
              inEntries={day.in}
              accountType={accountType}
            />
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
  const [hiddenAddressIds, setHiddenAddressIds] = useState<Set<number>>(
    new Set(),
  );
  const [addressOrder, setAddressOrder] = useState<number[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"byBin" | "byAddress">("byBin");

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
      .then((d: RouteResponse | null) => {
        if (!d) return;
        const addresses = extractAddresses(d.currentWeek, d.nextWeek);
        const allIds = addresses.map((a) => a.addressId);
        let prefs: RoutePrefs | null = null;
        try {
          prefs = JSON.parse(localStorage.getItem(ROUTE_PREFS_KEY) ?? "null");
        } catch {
          // ignore corrupted storage
        }
        const order = normaliseOrder(prefs?.order ?? [], allIds);
        const hiddenIds = (prefs?.hiddenIds ?? []).filter((id) =>
          allIds.includes(id),
        );
        setAddressOrder(order);
        setHiddenAddressIds(new Set(hiddenIds));
        setData(d);
      })
      .catch(() => setError("Tourenplan konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data || addressOrder.length === 0) return;
    localStorage.setItem(
      ROUTE_PREFS_KEY,
      JSON.stringify({
        hiddenIds: Array.from(hiddenAddressIds),
        order: addressOrder,
      }),
    );
  }, [hiddenAddressIds, addressOrder, data]);

  function handleToggleAddress(id: number) {
    setHiddenAddressIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleShowAll() {
    setHiddenAddressIds(new Set());
  }

  function handleHideAll(allIds: number[]) {
    setHiddenAddressIds(new Set(allIds));
  }

  function handleMoveUp(id: number) {
    setAddressOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function handleMoveDown(id: number) {
    setAddressOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      return next;
    });
  }

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
        <div className="max-w-3xl md:px-8 px-4 py-4 print:px-2 print:py-0">
          {/* Header bar */}
          <div className="no-print flex items-center justify-between pb-4 mb-6 border-b border-border-subtle">
            <h1 className="text-xl font-semibold text-foreground">
              Wochenplan
            </h1>
            <div className="flex items-center gap-2">
              {data && (
                <button
                  onClick={() => setFilterOpen((o) => !o)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium shadow-sm ${
                    filterOpen
                      ? "border-accent bg-accent/10 text-accent-secondary"
                      : "border-border bg-background-subtle text-foreground-secondary hover:bg-background"
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Adressen
                  {hiddenAddressIds.size > 0 && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-white leading-none">
                      {hiddenAddressIds.size}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl border border-border bg-background-subtle px-3 py-2 text-sm font-medium text-foreground-secondary shadow-sm hover:bg-background"
              >
                <Printer className="h-4 w-4" />
                Drucken
              </button>
            </div>
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

          {/* View toggle */}
          {data && (
            <div className="no-print mb-6 flex w-fit rounded-xl border border-border bg-background-subtle p-1">
              <button
                onClick={() => setViewMode("byBin")}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "byBin"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground-secondary hover:text-foreground"
                }`}
              >
                Nach Tonne
              </button>
              <button
                onClick={() => setViewMode("byAddress")}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "byAddress"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground-secondary hover:text-foreground"
                }`}
              >
                Nach Adresse
              </button>
            </div>
          )}

          {/* Route data */}
          {data &&
            (() => {
              const addresses = extractAddresses(
                data.currentWeek,
                data.nextWeek,
              );
              const orderedAddresses = [...addresses].sort(
                (a, b) =>
                  addressOrder.indexOf(a.addressId) -
                  addressOrder.indexOf(b.addressId),
              );
              const currentFiltered = applyFilterAndOrder(
                data.currentWeek,
                hiddenAddressIds,
                addressOrder,
              );
              const nextFiltered = applyFilterAndOrder(
                data.nextWeek,
                hiddenAddressIds,
                addressOrder,
              );
              return (
                <>
                  <AddressFilterPanel
                    isOpen={filterOpen}
                    onClose={() => setFilterOpen(false)}
                    addresses={orderedAddresses}
                    hiddenAddressIds={hiddenAddressIds}
                    onToggle={handleToggleAddress}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onShowAll={handleShowAll}
                    onHideAll={() =>
                      handleHideAll(orderedAddresses.map((a) => a.addressId))
                    }
                  />
                  {viewMode === "byBin" ? (
                    <>
                      <WeekSection
                        title={`Diese Woche (ab ${currentWeekLabel()})`}
                        weekEvents={currentFiltered}
                        addressOrder={addressOrder}
                        accountType={data.accountType}
                      />
                      <WeekSection
                        title={`Nächste Woche (ab ${nextWeekLabel()})`}
                        weekEvents={nextFiltered}
                        addressOrder={addressOrder}
                        accountType={data.accountType}
                      />
                    </>
                  ) : (
                    <>
                      <WeekSectionByAddress
                        title={`Diese Woche (ab ${currentWeekLabel()})`}
                        weekEvents={currentFiltered}
                        addressOrder={addressOrder}
                        accountType={data.accountType}
                      />
                      <WeekSectionByAddress
                        title={`Nächste Woche (ab ${nextWeekLabel()})`}
                        weekEvents={nextFiltered}
                        addressOrder={addressOrder}
                        accountType={data.accountType}
                      />
                    </>
                  )}
                </>
              );
            })()}
        </div>
      </main>
    </>
  );
}
