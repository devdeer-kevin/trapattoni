"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MapPin, Calendar } from "lucide-react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";

// ---------------------------------------------------------------------------
// Types (mirrored from lib/sab.ts)
// ---------------------------------------------------------------------------

type PickupEntry = {
  date: string;
  dayLabel: string;
  isHolidayShift: boolean;
};

type WasteCollection = {
  type: string;
  frequency: string;
  dates: PickupEntry[];
};

type PickupSchedule = {
  address: string;
  collections: WasteCollection[];
};

type HouseNumberEntry = {
  number: string;
  sabStandplatzId: string;
};

type SavedAddress = {
  id: string;
  street: string;
  house_number: string;
  is_default: boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WASTE_COLORS: Record<string, { bg: string; text: string; dot: string }> =
  {
    Restabfall: {
      bg: "bg-[#707D7D]/20",
      text: "text-foreground",
      dot: "bg-[#707D7D]",
    },
    Bioabfall: {
      bg: "bg-[#17876D]/25",
      text: "text-foreground",
      dot: "bg-[#17876D]",
    },
    Altpapier: {
      bg: "bg-[#AAC8C4]/30",
      text: "text-foreground",
      dot: "bg-[#AAC8C4]",
    },
    "Gelbe Tonne": {
      bg: "bg-[#F5A623]/25",
      text: "text-foreground",
      dot: "bg-[#F5A623]",
    },
    Grünschnitt: {
      bg: "bg-[#2CC295]/25",
      text: "text-foreground",
      dot: "bg-[#2CC295]",
    },
  };

function getWasteColor(type: string) {
  return (
    WASTE_COLORS[type] ?? {
      bg: "bg-background-overlay",
      text: "text-foreground-secondary",
      dot: "bg-foreground-tertiary",
    }
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const today = new Date();
today.setHours(0, 0, 0, 0);

function isFuture(dateStr: string): boolean {
  return new Date(dateStr) >= today;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Build a flat, chronological list of all upcoming pickups across all waste types
function buildAllTab(collections: WasteCollection[]): {
  date: string;
  dayLabel: string;
  isHolidayShift: boolean;
  type: string;
}[] {
  const entries: {
    date: string;
    dayLabel: string;
    isHolidayShift: boolean;
    type: string;
  }[] = [];

  for (const col of collections) {
    for (const d of col.dates) {
      if (isFuture(d.date)) {
        entries.push({ ...d, type: col.type });
      }
    }
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StreetAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (v: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleChange = useCallback(
    async (v: string) => {
      onChange(v);
      if (v.length < 3) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/streets?q=${encodeURIComponent(v)}`);
        const data = await res.json();
        setSuggestions(data.streets ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [onChange],
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder="Straße eingeben..."
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background-subtle px-4 py-3 text-foreground shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
      {loading && (
        <div className="absolute right-3 top-3.5 h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      )}
      {suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-xl border border-border-subtle bg-background-subtle shadow-lg">
          {suggestions.map((s) => (
            <li
              key={s}
              onClick={() => {
                onSelect(s);
                setSuggestions([]);
              }}
              className="cursor-pointer px-4 py-2.5 text-sm text-foreground-secondary first:rounded-t-xl last:rounded-b-xl hover:bg-accent-muted/20"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Group entries by month label e.g. "März 2026"
function groupByMonth<T extends { date: string }>(
  entries: T[],
): { month: string; entries: T[] }[] {
  const map = new Map<string, T[]>();
  for (const e of entries) {
    const d = new Date(e.date);
    const label = d.toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
    });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(e);
  }
  return Array.from(map.entries()).map(([month, entries]) => ({
    month,
    entries,
  }));
}

function CalendarCard({
  date,
  dayLabel,
  isHolidayShift,
  badge,
}: {
  date: string;
  dayLabel: string;
  isHolidayShift: boolean;
  badge?: string;
}) {
  const todayStr = today.toISOString().split("T")[0];
  const isToday = date === todayStr;
  const color = badge ? getWasteColor(badge) : null;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-background-subtle px-4 py-2.5 shadow-sm border border-border-subtle">
      {/* Small colored dot */}
      <div
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${color?.dot ?? "bg-background-overlay"}`}
      />

      {/* Date + waste type */}
      <div className="flex flex-col">
        <span className="text-xs text-foreground-tertiary">
          {dayLabel}, {formatDate(date)}
          {isToday && (
            <span className="ml-1.5 font-semibold text-accent">· Heute</span>
          )}
        </span>
        {badge && (
          <p className="text-sm font-semibold text-foreground">{badge}</p>
        )}
        {isHolidayShift && (
          <p className="text-xs text-warning">⚠ Feiertagsbedingt verschoben</p>
        )}
      </div>
    </div>
  );
}

function MonthGroup({
  month,
  children,
}: {
  month: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-foreground-tertiary">
        {month}
      </h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar export button
// ---------------------------------------------------------------------------

function CalendarExportButton({
  street,
  houseNumber,
  isAuthenticated,
  accountType,
}: {
  street: string;
  houseNumber: string;
  isAuthenticated: boolean;
  accountType: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function triggerDownload(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setOpen(false);
  }

  const btnClass =
    "flex items-center gap-1.5 rounded-lg border border-border bg-background-subtle px-3 py-1.5 text-sm font-medium text-foreground-secondary shadow-sm hover:bg-accent-muted/20 hover:border-accent-secondary transition-colors";

  // Business users don't get an export button for now.
  if (isAuthenticated && accountType === "business") {
    return null;
  }

  const publicUrl = (offset: boolean) =>
    `/api/v1/calendar/export/public?street=${encodeURIComponent(street)}&house_number=${encodeURIComponent(houseNumber)}&offset=${offset}`;

  if (!isAuthenticated) {
    return (
      <button
        className={btnClass}
        onClick={() => triggerDownload(publicUrl(false))}
      >
        <Calendar className="h-3.5 w-3.5" />
        Kalender exportieren
      </button>
    );
  }

  // Private account: dropdown to choose actual date or day-before reminder.
  return (
    <div ref={ref} className="relative">
      <button className={btnClass} onClick={() => setOpen((o) => !o)}>
        <Calendar className="h-3.5 w-3.5" />
        Kalender exportieren
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 min-w-[180px] rounded-xl border border-border-subtle bg-background-subtle shadow-lg">
          <button
            onClick={() => triggerDownload(publicUrl(false))}
            className="w-full rounded-t-xl px-4 py-2.5 text-left text-sm text-foreground-secondary hover:bg-accent-muted/20"
          >
            Abfuhrtag
          </button>
          <button
            onClick={() => triggerDownload(publicUrl(true))}
            className="w-full rounded-b-xl px-4 py-2.5 text-left text-sm text-foreground-secondary hover:bg-accent-muted/20"
          >
            Einen Tag vorher
          </button>
        </div>
      )}
    </div>
  );
}

function ScheduleView({
  schedule,
  exportButton,
}: {
  schedule: PickupSchedule;
  exportButton?: React.ReactNode;
}) {
  const tabs = ["Alle", ...schedule.collections.map((c) => c.type)];
  const [activeTab, setActiveTab] = useState("Alle");

  const allEntries = buildAllTab(schedule.collections);
  const activeCollection = schedule.collections.find(
    (c) => c.type === activeTab,
  );

  const activeEntries =
    activeTab === "Alle"
      ? allEntries
      : (activeCollection?.dates
          .filter((d) => isFuture(d.date))
          .map((d) => ({ ...d, type: activeCollection.type })) ?? []);

  const grouped = groupByMonth(activeEntries);

  return (
    <div className="mt-4">
      {/* Tabs + export button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 pb-4 sm:pb-0">
          {tabs.map((tab) => {
            const color = tab === "Alle" ? null : getWasteColor(tab);
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? tab === "Alle"
                      ? "bg-accent text-foreground-inverse"
                      : `${color!.dot} text-foreground-inverse`
                    : "bg-background-overlay text-foreground-secondary hover:bg-background-elevated"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
        {exportButton}
      </div>

      {/* Content */}
      {grouped.length === 0 ? (
        <p className="mt-8 text-center text-sm text-foreground-tertiary">
          Keine bevorstehenden Termine.
        </p>
      ) : (
        grouped.map(({ month, entries }) => (
          <MonthGroup key={month} month={month}>
            {entries.map((e, i) => (
              <CalendarCard
                key={i}
                date={e.date}
                dayLabel={e.dayLabel}
                isHolidayShift={e.isHolidayShift}
                badge={"type" in e ? e.type : undefined}
              />
            ))}
          </MonthGroup>
        ))
      )}

      {/* Frequency info per waste type */}
      {activeTab !== "Alle" &&
        activeCollection &&
        activeCollection.frequency && (
          <p className="mt-4 text-xs text-foreground-tertiary">
            {activeCollection.frequency}
          </p>
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Address switcher (autocomplete dropdown)
// ---------------------------------------------------------------------------

function AddressSwitcher({
  addresses,
  activeId,
  onSelect,
}: {
  addresses: SavedAddress[];
  activeId: string | null;
  onSelect: (addr: SavedAddress) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = addresses.find((a) => a.id === activeId) ?? null;

  const filtered = query.trim()
    ? addresses.filter((a) =>
        `${a.street} ${a.house_number}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : addresses;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(addr: SavedAddress) {
    onSelect(addr);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        {/* Trigger / search input */}
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" />
          <input
            type="text"
            value={
              open
                ? query
                : active
                  ? `${active.street} ${active.house_number}`
                  : ""
            }
            placeholder="Adresse wählen..."
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            className="w-full rounded-xl border border-border bg-background-subtle py-3 pl-9 pr-4 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <ul className="absolute z-10 mt-1 w-full rounded-xl border border-border-subtle bg-background-subtle shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-foreground-tertiary">
              Keine Treffer
            </li>
          ) : (
            filtered.map((addr) => {
              const isActive = addr.id === activeId;
              return (
                <li
                  key={addr.id}
                  onClick={() => handleSelect(addr)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 first:rounded-t-xl last:rounded-b-xl hover:bg-accent-muted/20 ${
                    isActive ? "bg-accent-muted/20" : ""
                  }`}
                >
                  <MapPin
                    className={`h-4 w-4 shrink-0 ${isActive ? "text-accent" : "text-foreground-tertiary"}`}
                  />
                  <span
                    className={`text-sm ${isActive ? "font-semibold text-accent-secondary" : "text-foreground-secondary"}`}
                  >
                    {addr.street} {addr.house_number}
                  </span>
                  {addr.is_default && (
                    <span className="ml-auto shrink-0 text-xs text-foreground-tertiary">
                      Standard
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useKindeBrowserClient();

  // Account type fetched once the user is authenticated
  const [accountType, setAccountType] = useState<string | null>(null);

  // Manual search state
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [fallbackNumbers, setFallbackNumbers] = useState<
    HouseNumberEntry[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<PickupSchedule | null>(null);

  // Saved addresses state (null = not yet fetched)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[] | null>(
    null,
  );
  const [activeAddressId, setActiveAddressId] = useState<string | null>(null);

  const fetchSchedule = useCallback(async (s: string, h: string) => {
    setLoading(true);
    setError(null);
    setFallbackNumbers(null);
    setSchedule(null);

    try {
      const res = await fetch(
        `/api/v1/pickups?street=${encodeURIComponent(s)}&houseNumber=${encodeURIComponent(h)}`,
      );

      if (res.status === 404) {
        // Fallback: load available house numbers
        setError("Hausnummer nicht gefunden. Bitte wähle eine aus der Liste:");
        const fallback = await fetch(
          `/api/v1/house-numbers?street=${encodeURIComponent(s)}`,
        );
        const fallbackData = await fallback.json();
        setFallbackNumbers(fallbackData.houseNumbers ?? []);
        return;
      }

      if (!res.ok) {
        setError("Fehler beim Laden der Termine. Bitte versuche es erneut.");
        return;
      }

      const data: PickupSchedule = await res.json();
      setSchedule(data);
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch saved addresses and account type once auth is resolved
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    fetch("/api/v1/user/me")
      .then((r) => r.json())
      .then((data) => setAccountType(data.account_type ?? "private"))
      .catch(() => setAccountType("private"));

    fetch("/api/v1/addresses")
      .then((r) => r.json())
      .then((data) => {
        const addresses: SavedAddress[] = data.addresses ?? [];
        setSavedAddresses(addresses);
        const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0];
        if (defaultAddr) {
          setActiveAddressId(defaultAddr.id);
          setStreet(defaultAddr.street);
          setHouseNumber(defaultAddr.house_number);
          fetchSchedule(defaultAddr.street, defaultAddr.house_number);
        }
      })
      .catch(() => setSavedAddresses([]));
  }, [authLoading, isAuthenticated, fetchSchedule]);

  function handleSwitchAddress(addr: SavedAddress) {
    if (addr.id === activeAddressId) return;
    setActiveAddressId(addr.id);
    setStreet(addr.street);
    setHouseNumber(addr.house_number);
    fetchSchedule(addr.street, addr.house_number);
  }

  function handleSubmit(e: React.ChangeEvent) {
    e.preventDefault();
    if (!street || !houseNumber) return;
    fetchSchedule(street, houseNumber);
  }

  const hasSavedAddresses = savedAddresses && savedAddresses.length > 0;

  return (
    <div className="max-w-3xl px-4 md:px-8 pb-8 pt-4">
      {/* Manual search form – hidden when the user has saved addresses */}
      {!hasSavedAddresses && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <StreetAutocomplete
            value={street}
            onChange={setStreet}
            onSelect={(s) => {
              setStreet(s);
              setSchedule(null);
              setFallbackNumbers(null);
              setError(null);
            }}
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={houseNumber}
              placeholder="Hausnummer"
              onChange={(e) => setHouseNumber(e.target.value)}
              className="w-36 rounded-xl border border-border bg-background-subtle px-4 py-3 text-foreground shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="submit"
              disabled={!street || !houseNumber || loading}
              className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-foreground-inverse shadow-sm transition-colors hover:bg-accent-secondary disabled:opacity-50"
            >
              {loading ? "Lädt..." : "Termine anzeigen"}
            </button>
          </div>
        </form>
      )}

      {/* Address switcher – shown when the user has saved addresses */}
      {hasSavedAddresses && (
        <AddressSwitcher
          addresses={savedAddresses}
          activeId={activeAddressId}
          onSelect={handleSwitchAddress}
        />
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Fallback house number picker */}
      {fallbackNumbers && fallbackNumbers.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {fallbackNumbers.map((entry) => (
            <button
              key={entry.sabStandplatzId}
              onClick={() => {
                setHouseNumber(entry.number);
                fetchSchedule(street, entry.number);
              }}
              className="rounded-lg border border-border bg-background-subtle px-3 py-1.5 text-sm font-medium text-foreground-secondary shadow-sm hover:bg-accent-muted/20 hover:border-accent-secondary"
            >
              {entry.number}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeleton while the first schedule fetch is in progress */}
      {loading && !schedule && (
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-background-overlay"
            />
          ))}
        </div>
      )}

      {/* Schedule */}
      {schedule && (
        <ScheduleView
          schedule={schedule}
          exportButton={
            <CalendarExportButton
              street={street}
              houseNumber={houseNumber}
              isAuthenticated={!!isAuthenticated}
              accountType={accountType}
            />
          }
        />
      )}
    </div>
  );
}
