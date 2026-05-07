"use client";

import { Eye, EyeOff, ChevronUp, ChevronDown, X } from "lucide-react";

export type AddressEntry = { addressId: number; label: string };

export function AddressFilterPanel({
  isOpen,
  onClose,
  addresses,
  hiddenAddressIds,
  onToggle,
  onMoveUp,
  onMoveDown,
  onShowAll,
  onHideAll,
}: {
  isOpen: boolean;
  onClose: () => void;
  addresses: AddressEntry[];
  hiddenAddressIds: Set<number>;
  onToggle: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}) {
  const allHidden = addresses.every((a) => hiddenAddressIds.has(a.addressId));
  return (
    <>
      {/* Backdrop */}
      <div
        className={`no-print fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      {/* Sidebar */}
      <div
        className={`no-print fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-background shadow-xl transition-transform duration-300 ease-in-out sm:w-1/2 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <span className="text-sm font-medium text-foreground-secondary">
            Adressen filtern &amp; sortieren
          </span>
          <div className="flex items-center gap-3">
            {!allHidden && (
              <button
                onClick={onHideAll}
                className="text-xs text-foreground-tertiary hover:underline"
              >
                Alle ausblenden
              </button>
            )}
            {hiddenAddressIds.size > 0 && (
              <button
                onClick={onShowAll}
                className="text-xs text-accent-secondary hover:underline"
              >
                Alle einblenden
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-1 rounded-lg p-1.5 text-foreground-tertiary hover:bg-background-subtle hover:text-foreground"
              title="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <ul className="flex-1 divide-y divide-border-subtle overflow-y-auto">
          {addresses.map((addr, idx) => {
            const hidden = hiddenAddressIds.has(addr.addressId);
            return (
              <li
                key={addr.addressId}
                className="flex items-center gap-2 px-4 py-2.5"
              >
                <span
                  className={`flex-1 text-sm ${hidden ? "text-foreground-tertiary line-through" : "text-foreground"}`}
                >
                  {addr.label}
                </span>
                <button
                  onClick={() => onToggle(addr.addressId)}
                  className="rounded-lg p-1.5 text-foreground-tertiary hover:bg-background hover:text-foreground"
                  title={hidden ? "Einblenden" : "Ausblenden"}
                >
                  {hidden ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => onMoveUp(addr.addressId)}
                  disabled={idx === 0}
                  className="rounded-lg p-1.5 text-foreground-tertiary hover:bg-background hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Nach oben"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onMoveDown(addr.addressId)}
                  disabled={idx === addresses.length - 1}
                  className="rounded-lg p-1.5 text-foreground-tertiary hover:bg-background hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Nach unten"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
