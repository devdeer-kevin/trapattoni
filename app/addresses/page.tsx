"use client";

import { useState, useCallback, useEffect } from "react";
import { MapPin, Star, Trash2, Plus, ArrowLeft, X } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SavedAddress = {
  id: string;
  street: string;
  house_number: string;
  is_default: boolean;
  created_at: string;
};

type HouseNumberEntry = {
  number: string;
  sabStandplatzId: string;
};

// ---------------------------------------------------------------------------
// Street autocomplete (same pattern as app/page.tsx)
// ---------------------------------------------------------------------------

function StreetAutocomplete({
  value,
  onChange,
  onSelect,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (v: string) => void;
  disabled?: boolean;
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
        disabled={disabled}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 disabled:opacity-50"
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

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------

function ConfirmDeleteDialog({
  address,
  onConfirm,
  onCancel,
}: {
  address: SavedAddress;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900">
          Adresse entfernen?
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          <span className="font-medium text-gray-700">
            {address.street} {address.house_number}
          </span>{" "}
          wird aus deinen gespeicherten Adressen entfernt.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
          >
            Entfernen
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Address card
// ---------------------------------------------------------------------------

function AddressCard({
  address,
  onSetDefault,
  onDelete,
}: {
  address: SavedAddress;
  onSetDefault: (id: string) => void;
  onDelete: (address: SavedAddress) => void;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white px-4 py-4 shadow-sm transition-all ${
        address.is_default
          ? "border-green-200 ring-1 ring-green-100"
          : "border-gray-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icon + text */}
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              address.is_default ? "bg-green-100" : "bg-gray-100"
            }`}
          >
            <MapPin
              className={`h-4 w-4 ${address.is_default ? "text-green-600" : "text-gray-400"}`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {address.street} {address.house_number}
            </p>
            {address.is_default ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                <Star className="h-3 w-3 fill-green-500 text-green-500" />
                Standard
              </span>
            ) : (
              <button
                onClick={() => onSetDefault(address.id)}
                className="mt-1 text-xs text-gray-400 hover:text-green-600"
              >
                Als Standard setzen
              </button>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(address)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500"
          aria-label="Entfernen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add address form
// ---------------------------------------------------------------------------

function AddAddressForm({
  onSave,
  onCancel,
}: {
  onSave: (
    street: string,
    houseNumber: string,
    sabStandplatzId: string,
  ) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [street, setStreet] = useState("");
  const [houseEntries, setHouseEntries] = useState<HouseNumberEntry[] | null>(
    null,
  );
  const [loadingHouses, setLoadingHouses] = useState(false);
  const [selected, setSelected] = useState<HouseNumberEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When a street is confirmed from the autocomplete, load its house numbers
  async function handleStreetSelect(s: string) {
    setStreet(s);
    setSelected(null);
    setHouseEntries(null);
    setLoadingHouses(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/house-numbers?street=${encodeURIComponent(s)}`,
      );
      const data = await res.json();
      setHouseEntries(data.houseNumbers ?? []);
    } catch {
      setHouseEntries([]);
    } finally {
      setLoadingHouses(false);
    }
  }

  // Typing in the street field resets the house list
  function handleStreetChange(v: string) {
    setStreet(v);
    setSelected(null);
    setHouseEntries(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!street || !selected) return;

    setSaving(true);
    setError(null);
    const err = await onSave(street, selected.number, selected.sabStandplatzId);
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Neue Adresse</h2>
        <button
          onClick={onCancel}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <StreetAutocomplete
          value={street}
          onChange={handleStreetChange}
          onSelect={handleStreetSelect}
          disabled={saving}
        />

        {/* House number picker – appears after a street is selected */}
        {loadingHouses && (
          <div className="flex justify-center py-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
          </div>
        )}

        {houseEntries && houseEntries.length === 0 && (
          <p className="text-sm text-gray-400">
            Keine Hausnummern für diese Straße gefunden.
          </p>
        )}

        {houseEntries && houseEntries.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">
              Hausnummer wählen
            </p>
            <div className="flex flex-wrap gap-2">
              {houseEntries.map((entry) => (
                <button
                  type="button"
                  key={entry.sabStandplatzId}
                  onClick={() => setSelected(entry)}
                  disabled={saving}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selected?.sabStandplatzId === entry.sabStandplatzId
                      ? "border-green-400 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50"
                  }`}
                >
                  {entry.number}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Confirm button – only visible once a house number is selected */}
        {selected && (
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-600 disabled:opacity-50"
          >
            {saving
              ? "Speichert..."
              : `${street} ${selected.number} speichern`}
          </button>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<SavedAddress | null>(null);

  // Load addresses on mount
  useEffect(() => {
    fetch("/api/v1/addresses")
      .then((r) => r.json())
      .then((data) => setAddresses(data.addresses ?? []))
      .catch(() => setPageError("Fehler beim Laden der Adressen."))
      .finally(() => setPageLoading(false));
  }, []);

  // Set as default – optimistic update with rollback
  async function handleSetDefault(id: string) {
    const prev = addresses;
    setAddresses(addresses.map((a) => ({ ...a, is_default: a.id === id })));

    const res = await fetch(`/api/v1/addresses/${id}`, { method: "PATCH" });
    if (!res.ok) setAddresses(prev);
  }

  // Delete – optimistic update with rollback
  async function handleDelete(target: SavedAddress) {
    setConfirmTarget(null);
    const prev = addresses;

    let updated = addresses.filter((a) => a.id !== target.id);
    // If the deleted address was default, promote the first remaining one
    if (target.is_default && updated.length > 0) {
      updated = updated.map((a, i) => ({ ...a, is_default: i === 0 }));
    }
    setAddresses(updated);

    const res = await fetch(`/api/v1/addresses/${target.id}`, {
      method: "DELETE",
    });
    if (!res.ok) setAddresses(prev);
  }

  // Save new address – returns an error string on failure, null on success
  async function handleSave(
    street: string,
    houseNumber: string,
    sabStandplatzId: string,
  ): Promise<string | null> {
    try {
      const res = await fetch("/api/v1/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street,
          house_number: houseNumber,
          sab_standplatz_id: sabStandplatzId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return data.error ?? "Fehler beim Speichern.";
      }

      setAddresses((prev) => [...prev, data.address]);
      setShowAddForm(false);
      return null;
    } catch {
      return "Netzwerkfehler. Bitte versuche es erneut.";
    }
  }

  const atLimit = addresses.length >= 50;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              Meine Adressen
            </h1>
            {!pageLoading && (
              <p className="text-xs text-gray-400">
                {addresses.length} / 50 gespeichert
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {/* Add form – always at the top */}
        {showAddForm && (
          <AddAddressForm
            onSave={handleSave}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* "Add address" trigger button – shown when form is hidden and limit not reached */}
        {!pageLoading && !showAddForm && !atLimit && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white py-4 text-sm font-medium text-gray-400 transition-colors hover:border-green-300 hover:text-green-500"
          >
            <Plus className="h-4 w-4" />
            Adresse hinzufügen
          </button>
        )}

        {/* Fetch error */}
        {pageError && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {pageError}
          </div>
        )}

        {/* Loading skeletons */}
        {pageLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-gray-100"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!pageLoading && !pageError && addresses.length === 0 && !showAddForm && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <MapPin className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-gray-900">
              Noch keine Adressen
            </h2>
            <p className="mt-1 max-w-xs text-sm text-gray-400">
              Füge deine Adresse hinzu, um den Abfuhrkalender schnell
              aufzurufen.
            </p>
          </div>
        )}

        {/* Address list */}
        {!pageLoading && addresses.length > 0 && (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                onSetDefault={handleSetDefault}
                onDelete={setConfirmTarget}
              />
            ))}
          </div>
        )}

        {/* Limit reached notice */}
        {!pageLoading && atLimit && (
          <p className="text-center text-xs text-gray-400">
            Maximale Anzahl von 50 Adressen erreicht.
          </p>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {confirmTarget && (
        <ConfirmDeleteDialog
          address={confirmTarget}
          onConfirm={() => handleDelete(confirmTarget)}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </main>
  );
}
