"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Trash,
  LogIn,
  UserPlus,
  LogOut,
  MapPin,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
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
      bg: "bg-gray-100",
      text: "text-gray-700",
      dot: "bg-gray-500",
    },
    Bioabfall: {
      bg: "bg-amber-100",
      text: "text-amber-800",
      dot: "bg-amber-800",
    },
    Altpapier: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      dot: "bg-blue-500",
    },
    "Gelbe Tonne": {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      dot: "bg-yellow-400",
    },
  };

function getWasteColor(type: string) {
  return (
    WASTE_COLORS[type] ?? {
      bg: "bg-gray-100",
      text: "text-gray-700",
      dot: "bg-gray-400",
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
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
      />
      {loading && (
        <div className="absolute right-3 top-3.5 h-4 w-4 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
      )}
      {suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li
              key={s}
              onClick={() => {
                onSelect(s);
                setSuggestions([]);
              }}
              className="cursor-pointer px-4 py-2.5 text-sm text-gray-700 first:rounded-t-xl last:rounded-b-xl hover:bg-green-50"
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
    <div className="flex items-center gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm border border-gray-100">
      {/* Trash icon in colored circle */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color?.dot ?? "bg-gray-200"}`}
      >
        <Trash className="h-5 w-5 text-white" />
      </div>

      {/* Date + waste type */}
      <div className="flex flex-col">
        <span className="text-xs text-gray-400">
          {dayLabel}, {formatDate(date)}
          {isToday && (
            <span className="ml-1.5 font-semibold text-green-500">· Heute</span>
          )}
        </span>
        {badge && (
          <p className="text-sm font-semibold text-gray-800">{badge}</p>
        )}
        {isHolidayShift && (
          <p className="text-xs text-orange-500">
            ⚠ Feiertagsbedingt verschoben
          </p>
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
      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-gray-400">
        {month}
      </h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function ScheduleView({ schedule }: { schedule: PickupSchedule }) {
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
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        {schedule.address}
      </h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
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
                    ? "bg-gray-900 text-white"
                    : `${color!.dot} text-white`
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {grouped.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-400">
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
          <p className="mt-4 text-xs text-gray-400">
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
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={open ? query : (active ? `${active.street} ${active.house_number}` : "")}
            placeholder="Adresse wählen..."
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-9 pr-4 text-sm text-gray-900 shadow-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
          />
        </div>
        <Link
          href="/addresses"
          className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
        >
          Adressen verwalten
        </Link>
      </div>

      {/* Dropdown */}
      {open && (
        <ul className="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400">
              Keine Treffer
            </li>
          ) : (
            filtered.map((addr) => {
              const isActive = addr.id === activeId;
              return (
                <li
                  key={addr.id}
                  onClick={() => handleSelect(addr)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 first:rounded-t-xl last:rounded-b-xl hover:bg-green-50 ${
                    isActive ? "bg-green-50" : ""
                  }`}
                >
                  <MapPin
                    className={`h-4 w-4 shrink-0 ${isActive ? "text-green-500" : "text-gray-300"}`}
                  />
                  <span
                    className={`text-sm ${isActive ? "font-semibold text-green-700" : "text-gray-700"}`}
                  >
                    {addr.street} {addr.house_number}
                  </span>
                  {addr.is_default && (
                    <span className="ml-auto shrink-0 text-xs text-gray-400">
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

function UserMenu({ initials, name }: { initials: string; name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative z-50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 hover:bg-green-100"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
          {initials}
        </div>
        <span className="text-sm font-medium text-gray-700">{name}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
          <Link
            href="/addresses"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <MapPin className="h-4 w-4 text-gray-400" />
            Meine Adressen
          </Link>
          <div className="my-1 border-t border-gray-100" />
          <Link
            href="/api/auth/logout"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </Link>
        </div>
      )}
    </div>
  );
}

function AuthSection() {
  const { user, isAuthenticated, isLoading } = useKindeBrowserClient();

  if (isLoading) {
    return <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-100" />;
  }

  if (isAuthenticated && user) {
    const initials =
      `${user.given_name?.[0] ?? ""}${user.family_name?.[0] ?? ""}`.toUpperCase() ||
      user.email?.[0]?.toUpperCase() ||
      "?";

    return (
      <UserMenu
        initials={initials}
        name={user.given_name ?? user.email ?? ""}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/api/auth/login"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
      >
        <LogIn className="h-4 w-4" />
        Anmelden
      </Link>
      <Link
        href="/api/auth/register"
        className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-600"
      >
        <UserPlus className="h-4 w-4" />
        Registrieren
      </Link>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useKindeBrowserClient();

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

  // Fetch saved addresses once auth is resolved, then auto-load the default
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    fetch("/api/v1/addresses")
      .then((r) => r.json())
      .then((data) => {
        const addresses: SavedAddress[] = data.addresses ?? [];
        setSavedAddresses(addresses);
        const defaultAddr =
          addresses.find((a) => a.is_default) ?? addresses[0];
        if (defaultAddr) {
          setActiveAddressId(defaultAddr.id);
          fetchSchedule(defaultAddr.street, defaultAddr.house_number);
        }
      })
      .catch(() => setSavedAddresses([]));
  }, [authLoading, isAuthenticated, fetchSchedule]);

  function handleSwitchAddress(addr: SavedAddress) {
    if (addr.id === activeAddressId) return;
    setActiveAddressId(addr.id);
    fetchSchedule(addr.street, addr.house_number);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!street || !houseNumber) return;
    fetchSchedule(street, houseNumber);
  }

  const hasSavedAddresses = savedAddresses && savedAddresses.length > 0;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              🗑️ Tonneraus
            </h1>
            <p className="text-xs text-gray-400">Abfuhrkalender Magdeburg</p>
          </div>
          <AuthSection />
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-8">
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
                className="w-36 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
              />
              <button
                type="submit"
                disabled={!street || !houseNumber || loading}
                className="flex-1 rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-600 disabled:opacity-50"
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
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
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
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-green-50 hover:border-green-300"
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
                className="h-16 animate-pulse rounded-2xl bg-gray-100"
              />
            ))}
          </div>
        )}

        {/* Schedule */}
        {schedule && <ScheduleView schedule={schedule} />}
      </div>
    </main>
  );
}
