"use client";

import { useState, useCallback } from "react";

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
      bg: "bg-green-100",
      text: "text-green-700",
      dot: "bg-green-500",
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

function PickupBadge({ type }: { type: string }) {
  const color = getWasteColor(type);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
      {type}
    </span>
  );
}

function DateRow({
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
  const isToday = date === today.toISOString().split("T")[0];

  return (
    <div
      className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${
        isToday ? "bg-green-50 ring-1 ring-green-300" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="w-6 text-center text-xs font-semibold text-gray-400">
          {dayLabel}
        </span>
        <span className="text-sm font-medium text-gray-800">
          {formatDate(date)}
        </span>
        {isHolidayShift && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">
            Feiertag
          </span>
        )}
        {isToday && (
          <span className="rounded-full bg-green-200 px-2 py-0.5 text-xs font-semibold text-green-700">
            Heute
          </span>
        )}
      </div>
      {badge && <PickupBadge type={badge} />}
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

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        {schedule.address}
      </h2>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
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
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm">
        {activeTab === "Alle" ? (
          allEntries.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              Keine bevorstehenden Termine.
            </p>
          ) : (
            allEntries.map((e, i) => (
              <DateRow
                key={i}
                date={e.date}
                dayLabel={e.dayLabel}
                isHolidayShift={e.isHolidayShift}
                badge={e.type}
              />
            ))
          )
        ) : activeCollection ? (
          activeCollection.dates.filter((d) => isFuture(d.date)).length ===
          0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              Keine bevorstehenden Termine.
            </p>
          ) : (
            activeCollection.dates
              .filter((d) => isFuture(d.date))
              .map((d, i) => (
                <DateRow
                  key={i}
                  date={d.date}
                  dayLabel={d.dayLabel}
                  isHolidayShift={d.isHolidayShift}
                />
              ))
          )
        ) : null}
      </div>

      {/* Frequency info per waste type */}
      {activeTab !== "Alle" &&
        activeCollection &&
        activeCollection.frequency && (
          <p className="mt-2 text-xs text-gray-400">
            {activeCollection.frequency}
          </p>
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Home() {
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [schedule, setSchedule] = useState<PickupSchedule | null>(null);
  const [fallbackNumbers, setFallbackNumbers] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchSchedule(s: string, h: string) {
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
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!street || !houseNumber) return;
    fetchSchedule(street, houseNumber);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            🗑️ Tonneraus
          </h1>
          <p className="text-xs text-gray-400">Abfuhrkalender Magdeburg</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Search form */}
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

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Fallback house number picker */}
        {fallbackNumbers && fallbackNumbers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {fallbackNumbers.map((nr) => (
              <button
                key={nr}
                onClick={() => {
                  setHouseNumber(nr);
                  fetchSchedule(street, nr);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-green-50 hover:border-green-300"
              >
                {nr}
              </button>
            ))}
          </div>
        )}

        {/* Schedule */}
        {schedule && <ScheduleView schedule={schedule} />}
      </div>
    </main>
  );
}
