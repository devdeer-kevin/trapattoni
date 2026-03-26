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
        className="w-full rounded-xl border border-border bg-background-subtle px-4 py-3 text-foreground shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-4 pb-8 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-background-subtle p-6 shadow-xl">
        <h3 className="text-base font-semibold text-foreground">
          Adresse entfernen?
        </h3>
        <p className="mt-2 text-sm text-foreground-tertiary">
          <span className="font-medium text-foreground-secondary">
            {address.street} {address.house_number}
          </span>{" "}
          wird aus deinen gespeicherten Adressen entfernt.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground-secondary hover:bg-background"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-error py-2.5 text-sm font-semibold text-foreground-inverse hover:bg-error/80"
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
      className={`rounded-2xl border bg-background-subtle px-4 py-4 shadow-sm transition-all ${
        address.is_default
          ? "border-accent/40 ring-1 ring-accent/20"
          : "border-border-subtle"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icon + text */}
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              address.is_default ? "bg-accent-muted/35" : "bg-background-overlay"
            }`}
          >
            <MapPin
              className={`h-4 w-4 ${address.is_default ? "text-accent-secondary" : "text-foreground-tertiary"}`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {address.street} {address.house_number}
            </p>
            {address.is_default ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-muted/35 px-2 py-0.5 text-xs font-medium text-accent-secondary">
                <Star className="h-3 w-3 fill-accent text-accent" />
                Standard
              </span>
            ) : (
              <button
                onClick={() => onSetDefault(address.id)}
                className="mt-1 text-xs text-foreground-tertiary hover:text-accent-secondary"
              >
                Als Standard setzen
              </button>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(address)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-tertiary hover:bg-error/10 hover:text-error"
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
    <div className="rounded-2xl border border-border-subtle bg-background-subtle p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Neue Adresse</h2>
        <button
          onClick={onCancel}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-tertiary hover:bg-background-overlay"
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
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}

        {houseEntries && houseEntries.length === 0 && (
          <p className="text-sm text-foreground-tertiary">
            Keine Hausnummern für diese Straße gefunden.
          </p>
        )}

        {houseEntries && houseEntries.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-foreground-tertiary">
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
                      ? "border-accent bg-accent-muted/20 text-accent-secondary"
                      : "border-border bg-background-subtle text-foreground-secondary hover:border-accent-secondary hover:bg-accent-muted/20"
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
            className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-foreground-inverse shadow-sm transition-colors hover:bg-accent-secondary disabled:opacity-50"
          >
            {saving
              ? "Speichert..."
              : `${street} ${selected.number} speichern`}
          </button>
        )}

        {error && (
          <p className="rounded-xl bg-error/10 px-4 py-2.5 text-sm text-error">
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
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-background-subtle px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-tertiary hover:bg-background-overlay"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Meine Adressen
            </h1>
            {!pageLoading && (
              <p className="text-xs text-foreground-tertiary">
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background-subtle py-4 text-sm font-medium text-foreground-tertiary transition-colors hover:border-accent-secondary hover:text-accent"
          >
            <Plus className="h-4 w-4" />
            Adresse hinzufügen
          </button>
        )}

        {/* Fetch error */}
        {pageError && (
          <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
            {pageError}
          </div>
        )}

        {/* Loading skeletons */}
        {pageLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-background-overlay"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!pageLoading && !pageError && addresses.length === 0 && !showAddForm && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-muted/20">
              <MapPin className="h-8 w-8 text-accent" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              Noch keine Adressen
            </h2>
            <p className="mt-1 max-w-xs text-sm text-foreground-tertiary">
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
          <p className="text-center text-xs text-foreground-tertiary">
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
