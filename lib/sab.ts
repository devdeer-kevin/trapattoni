import * as cheerio from "cheerio";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAB_API_URL =
  "https://sab.ssl.metageneric.de/app/sab_i_tp/index.2025_2026.php";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PickupEntry = {
  date: string; // ISO format: "2026-03-09"
  dayLabel: string; // "Mo" | "Di" | "Mi" | "Do" | "Fr" | "Sa" | "So"
  isHolidayShift: boolean; // true when marked with * in the SAB response
};

export type WasteCollection = {
  type: string; // e.g. "Restabfall", "Bioabfall", "Altpapier", "Gelbe Tonne"
  frequency: string; // e.g. "14-täglich Freitag"
  dates: PickupEntry[];
};

export type PickupSchedule = {
  address: string;
  stadtteilId: string | null;
  collections: WasteCollection[];
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * POST to the SAB API with x-www-form-urlencoded body.
 * Returns the raw response text (HTML).
 */
async function sabPost(params: Record<string, string>): Promise<string> {
  const body = new URLSearchParams(params).toString();

  const response = await fetch(SAB_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: "https://sab.ssl.metageneric.de/",
      "User-Agent": "Mozilla/5.0 (compatible; tonneraus/1.0)",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`SAB API error: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Converts a German date string "DD.MM.YYYY" to ISO format "YYYY-MM-DD".
 */
function parseGermanDate(raw: string): string {
  const [day, month, year] = raw.trim().split(".");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Parses a single date cell from the termintable.
 * Raw text examples:
 *   "&nbsp;Fr&nbsp;20.03.2026"
 *   "*&nbsp;Mo&nbsp;28.12.2026"  ← holiday shift
 */
function parseDateCell(text: string, isVtag = false): PickupEntry | null {
  const cleaned = text.replace(/\u00a0/g, " ").trim();

  if (!cleaned) return null;

  const hasStar = cleaned.startsWith("*");
  const withoutStar = hasStar ? cleaned.slice(1).trim() : cleaned;

  const parts = withoutStar.split(" ").filter(Boolean);
  if (parts.length < 2) return null;

  const dayLabel = parts[0];
  const rawDate = parts[1];

  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(rawDate)) return null;

  return {
    date: parseGermanDate(rawDate),
    dayLabel,
    isHolidayShift: hasStar || isVtag,
  };
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/**
 * Search for streets matching a query string.
 * Calls the SAB `findStrasse` endpoint and parses the returned HTML.
 *
 * Returns an array of street name strings.
 */
export async function searchStreets(query: string): Promise<string[]> {
  if (query.length < 3) return [];

  const html = await sabPost({ r: "findStrasse", strasse: query });
  const $ = cheerio.load(html);

  const streets: string[] = [];

  // The SAB response renders street names as clickable spans/links
  // with onclick="setstrasse('...')" — extract the argument.
  $("[onclick]").each((_, el) => {
    const onclick = $(el).attr("onclick") ?? "";
    const match = onclick.match(/setstrasse\('(.+?)'\)/);
    if (match) {
      streets.push(match[1]);
    }
  });

  return streets;
}

export type HouseNumberEntry = {
  number: string;
  sabStandplatzId: string;
};

/**
 * Get all available house numbers for a given street.
 * Calls the SAB `getStandplatzInfo` endpoint and parses the button HTML.
 *
 * Returns entries with the house number and the SAB standplatz ID, e.g.
 * [{ number: "2a", sabStandplatzId: "12345" }, ...]
 */
export async function getHouseNumbers(
  street: string,
): Promise<HouseNumberEntry[]> {
  const html = await sabPost({ r: "getStandplatzInfo", strasse: street });
  const $ = cheerio.load(html);

  const houseNumbers: HouseNumberEntry[] = [];

  // Each house number is rendered as a button with onclick="get('<nr>','<standplatz_id>')"
  $("button[onclick]").each((_, el) => {
    const onclick = $(el).attr("onclick") ?? "";
    const match = onclick.match(/get\('(.+?)','(.+?)'\)/);
    if (match) {
      houseNumbers.push({ number: match[1], sabStandplatzId: match[2] });
    }
  });

  return houseNumbers;
}

/**
 * Get the full pickup schedule for a given street + house number.
 * Calls the SAB `getHausnummerInfo` endpoint and parses the full HTML schedule.
 *
 * Throws if the address is not found (empty collections returned).
 */
export async function getPickupDates(
  street: string,
  houseNumber: string,
): Promise<PickupSchedule> {
  const raw = await sabPost({
    r: "getHausnummerInfo",
    strasse: street,
    hausnummer: houseNumber,
  });

  // The response is split by ###$$$### — format: "###$$$###abfallart#stadtteil_id#behaelter$"
  const html = raw.split("###$$$###")[0];
  const separator = raw.split("###$$$###")[1] ?? "";
  const gelbeTonneEntry = separator.split("$").find(s => s.startsWith("4#"));
  const stadtteilId = gelbeTonneEntry ? gelbeTonneEntry.split("#")[1] : null;
  const $ = cheerio.load(html);

  // Extract the address from the <h4> heading
  const address = $("h4")
    .first()
    .text()
    .replace("Entsorgungstermine für:", "")
    .trim();

  const collections: WasteCollection[] = [];

  // Each waste type section starts with an <h3> heading, followed by a <b>
  // tag with the frequency, then a .termintable with the dates.
  $("h3").each((_, h3El) => {
    const type = $(h3El).text().trim();
    if (!type) return;

    // Frequency is in the next <b> element after the <h3>
    const frequency = $(h3El).next("b").text().trim();

    // Dates are in the .termintable that follows
    const nextContainer = $(h3El).next();
    const termintable = nextContainer.hasClass("termintable")
      ? nextContainer
      : nextContainer.find(".termintable").first().length
        ? nextContainer.find(".termintable").first()
        : $(h3El).nextAll(".termintable").first();
    const dates: PickupEntry[] = [];

    termintable.find("div[class*='col-']").each((_, cell) => {
      const el = $(cell);
      const text = el.text();
      const hasVtag = el.hasClass("vtag");
      const entry = parseDateCell(text, hasVtag);
      if (entry) {
        dates.push(entry);
      }
    });

    if (dates.length > 0) {
      collections.push({ type, frequency, dates });
    }
  });

  return { address, stadtteilId, collections };
}

export async function getGelbeTonneDates(
  stadtteilId: string,
  behaelterValue: string,
): Promise<WasteCollection> {
  const raw = await sabPost({
    r: "getHausnummerInfo",
    stadtteil_id: stadtteilId,
    dsd_behaelter_value: behaelterValue,
    abfallart: "4",
  });

  const html = raw.split("###$$$###")[0];
  const $ = cheerio.load(html);

  const dates: PickupEntry[] = [];

  $("#outA4 .termintable div[class*='col-']").each((_, cell) => {
    const el = $(cell);
    const text = el.text();
    const hasVtag = el.hasClass("vtag");
    const entry = parseDateCell(text, hasVtag);
    if (entry) dates.push(entry);
  });

  return {
    type: "Gelbe Tonne",
    frequency: "",
    dates,
  };
}
