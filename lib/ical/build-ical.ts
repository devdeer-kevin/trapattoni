// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ICalEvent = {
  uid: string;
  /** All-day event start date (UTC midnight). */
  dtstart: Date;
  summary: string;
  description: string;
};

// ---------------------------------------------------------------------------
// Bin type label maps
// ---------------------------------------------------------------------------

/** Plain labels used by the public (no-auth) endpoint. */
export const BIN_LABELS: Record<string, string> = {
  Restabfall: "⚫️ Restabfall",
  "Gelbe Tonne": "🟡 Gelbe Tonne",
  Bioabfall: "🟢 Bioabfall",
  Altpapier: "🔵 Altpapier",
};

/** Reminder labels (put-out day) used by the authenticated endpoint. */
export const BIN_LABELS_REMIND: Record<string, string> = {
  Restabfall: "⚫️ Restabfall rausstellen",
  "Gelbe Tonne": "🟡 Gelbe Tonne rausstellen",
  Bioabfall: "🟢 Bioabfall rausstellen",
  Altpapier: "🔵 Altpapier rausstellen",
};

/** Actual-date labels (pickup day) used by the authenticated endpoint. */
export const BIN_LABELS_ACTUAL: Record<string, string> = {
  Restabfall: "⚫️ Restabfall wird abgeholt",
  "Gelbe Tonne": "🟡 Gelbe Tonne wird abgeholt",
  Bioabfall: "🟢 Bioabfall wird abgeholt",
  Altpapier: "🔵 Altpapier wird abgeholt",
};

// ---------------------------------------------------------------------------
// Date formatters
// ---------------------------------------------------------------------------

/** Format a Date as an iCal date string: YYYYMMDD (UTC). */
export function toICalDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Format a Date as an iCal datetime string: YYYYMMDDTHHmmssZ (UTC). */
export function toICalDateTime(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

// ---------------------------------------------------------------------------
// iCal builder
// ---------------------------------------------------------------------------

/**
 * Builds a complete VCALENDAR string from a list of events.
 * Lines are separated by CRLF per RFC 5545.
 */
export function buildIcal(events: ICalEvent[]): string {
  const dtstamp = toICalDateTime(new Date());

  const vevents = events
    .map((ev) => {
      // iCal all-day events require DTEND = start + 1 day.
      const dtend = new Date(ev.dtstart);
      dtend.setUTCDate(dtend.getUTCDate() + 1);

      return [
        "BEGIN:VEVENT",
        `UID:${ev.uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${toICalDate(ev.dtstart)}`,
        `DTEND;VALUE=DATE:${toICalDate(dtend)}`,
        `SUMMARY:${ev.summary}`,
        `DESCRIPTION:${ev.description}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Abfallkalender//Abfall-Calendar//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}
