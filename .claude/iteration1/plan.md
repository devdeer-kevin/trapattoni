# Trapattoni — Iteration 1 Plan

## Goal
A Next.js web app that lets Magdeburg residents look up their waste collection schedule
by entering their address (street + house number).

---

## Data Source
**SAB API** — `https://sab.ssl.metageneric.de/app/sab_i_tp/index.2025_2026.php`

All requests: `POST`, `Content-Type: application/x-www-form-urlencoded`

| Action | Payload | Returns |
|---|---|---|
| Street search | `r=findStrasse&strasse=<query>` | HTML with matching street names |
| House numbers | `r=getStandplatzInfo&strasse=<street>` | HTML with house number buttons |
| Pickup dates | `r=getHausnummerInfo&strasse=<street>&hausnummer=<number>` | HTML with full pickup schedule |

**Key findings:**
- Umlauts must be UTF-8 encoded (`ä` → `%C3%A4`)
- Pickup dates are embedded directly in the HTML — no date calculation needed
- Response is split by `###$$$###` — we only need the HTML part (before the separator)
- Waste types: Restabfall, Bioabfall, Altpapier, Gelbe Tonne

---

## Scope

### In scope
- Address search: street autocomplete + free-text house number input
- Pickup date overview for a selected address
- User accounts (NextAuth.js) to save a home address
- Responsive UI (mobile-first)

### Out of scope (future iterations)
- Push notifications / reminders
- Info pages about waste types and recycling
- Native / React Native app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth.js |
| Database | PostgreSQL via Supabase |
| HTML parsing | cheerio |
| API | Next.js Route Handlers |

---

## Project Structure

```
trapattoni/
├── app/
│   ├── api/
│   │   ├── streets/
│   │   │   └── route.ts        # GET /api/streets?q=<query>
│   │   ├── house-numbers/
│   │   │   └── route.ts        # GET /api/house-numbers?street=<street> (fallback only)
│   │   └── pickups/
│   │       └── route.ts        # GET /api/pickups?street=<street>&houseNumber=<nr>
│   └── page.tsx                # Frontend
└── lib/
    └── sab.ts                  # SAB API client + HTML parser
```

---

## Build Order

### Step 1 — `lib/sab.ts`
Three functions, each wrapping one SAB API call + parsing the HTML response:
- `searchStreets(query: string): Promise<string[]>`
- `getHouseNumbers(street: string): Promise<string[]>`
- `getPickupDates(street: string, houseNumber: string): Promise<PickupSchedule>`

`PickupSchedule` type:
```ts
type PickupEntry = {
  date: string        // "2026-03-09"
  dayLabel: string    // "Mo", "Di", ...
  isHolidayShift: boolean
}

type PickupSchedule = {
  address: string
  collections: {
    type: string        // "Restabfall" | "Bioabfall" | "Altpapier" | "Gelbe Tonne"
    frequency: string   // "14-täglich Montag"
    dates: PickupEntry[]
  }[]
}
```

### Step 2 — API Routes
Thin wrappers around `lib/sab.ts` — validate query params, call the lib, return JSON.

### Step 3 — Frontend (`page.tsx`)

**Happy path (99% of users):**
1. Street input with autocomplete (debounced, calls `/api/streets`)
2. House number free-text input (user knows their own number)
3. On submit: call `/api/pickups` directly → show pickup schedule

**Fallback (house number not found):**
1. Show error message: *"House number not found"*
2. Call `/api/house-numbers` and show the available numbers as a selection
3. User picks from the list → retry `/api/pickups`

### Step 4 — Auth + Saved Address
- NextAuth.js setup with email/password or OAuth
- Supabase: `users` table with a `saved_address` field
- "Save this address" button on the schedule view

---

## API Design

```
GET /api/streets?q=Egerl
→ { streets: ["Egerländer Weg", ...] }

GET /api/house-numbers?street=Egerländer%20Weg
→ { houseNumbers: ["2", "2a", "2b", "3", ...] }
(only called as fallback when a house number is not found)

GET /api/pickups?street=Egerländer%20Weg&houseNumber=14
→ { address: "Egerländer Weg 14", collections: [...] }
```

---

## Open Questions
- Do we want to cache SAB API responses? (The data changes once a year)
- Should the street list be stored in the DB or fetched live from the SAB HTML?
- OAuth provider for auth (GitHub, Google) or credentials only?# trapattoni — Iteration 1 Plan

## Goal
A Next.js web app that lets Magdeburg residents look up their waste collection schedule
by entering their address (street + house number).

---

## Data Source
**SAB API** — `https://sab.ssl.metageneric.de/app/sab_i_tp/index.2025_2026.php`

All requests: `POST`, `Content-Type: application/x-www-form-urlencoded`

| Action | Payload | Returns |
|---|---|---|
| Street search | `r=findStrasse&strasse=<query>` | HTML with matching street names |
| House numbers | `r=getStandplatzInfo&strasse=<street>` | HTML with house number buttons |
| Pickup dates | `r=getHausnummerInfo&strasse=<street>&hausnummer=<number>` | HTML with full pickup schedule |

**Key findings:**
- Umlauts must be UTF-8 encoded (`ä` → `%C3%A4`)
- Pickup dates are embedded directly in the HTML — no date calculation needed
- Response is split by `###$$$###` — we only need the HTML part (before the separator)
- Waste types: Restabfall, Bioabfall, Altpapier, Gelbe Tonne

---

## Scope

### In scope
- Address search: street autocomplete + free-text house number input
- Pickup date overview for a selected address
- User accounts (NextAuth.js) to save a home address
- Responsive UI (mobile-first)

### Out of scope (future iterations)
- Push notifications / reminders
- Info pages about waste types and recycling
- Native / React Native app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth.js |
| Database | PostgreSQL via Supabase |
| HTML parsing | cheerio |
| API | Next.js Route Handlers |

---

## Project Structure

```
trapattoni/
├── app/
│   ├── api/
│   │   ├── streets/
│   │   │   └── route.ts        # GET /api/streets?q=<query>
│   │   ├── house-numbers/
│   │   │   └── route.ts        # GET /api/house-numbers?street=<street> (fallback only)
│   │   └── pickups/
│   │       └── route.ts        # GET /api/pickups?street=<street>&houseNumber=<nr>
│   └── page.tsx                # Frontend
└── lib/
    └── sab.ts                  # SAB API client + HTML parser
```

---

## Build Order

### Step 1 — `lib/sab.ts`
Three functions, each wrapping one SAB API call + parsing the HTML response:
- `searchStreets(query: string): Promise<string[]>`
- `getHouseNumbers(street: string): Promise<string[]>`
- `getPickupDates(street: string, houseNumber: string): Promise<PickupSchedule>`

`PickupSchedule` type:
```ts
type PickupEntry = {
  date: string        // "2026-03-09"
  dayLabel: string    // "Mo", "Di", ...
  isHolidayShift: boolean
}

type PickupSchedule = {
  address: string
  collections: {
    type: string        // "Restabfall" | "Bioabfall" | "Altpapier" | "Gelbe Tonne"
    frequency: string   // "14-täglich Montag"
    dates: PickupEntry[]
  }[]
}
```

### Step 2 — API Routes
Thin wrappers around `lib/sab.ts` — validate query params, call the lib, return JSON.

### Step 3 — Frontend (`page.tsx`)

**Happy path (99% of users):**
1. Street input with autocomplete (debounced, calls `/api/streets`)
2. House number free-text input (user knows their own number)
3. On submit: call `/api/pickups` directly → show pickup schedule

**Fallback (house number not found):**
1. Show error message: *"House number not found"*
2. Call `/api/house-numbers` and show the available numbers as a selection
3. User picks from the list → retry `/api/pickups`

### Step 4 — Auth + Saved Address
- NextAuth.js setup with email/password or OAuth
- Supabase: `users` table with a `saved_address` field
- "Save this address" button on the schedule view

---

## API Design

```
GET /api/streets?q=Egerl
→ { streets: ["Egerländer Weg", ...] }

GET /api/house-numbers?street=Egerländer%20Weg
→ { houseNumbers: ["2", "2a", "2b", "3", ...] }
(only called as fallback when a house number is not found)

GET /api/pickups?street=Egerländer%20Weg&houseNumber=14
→ { address: "Egerländer Weg 14", collections: [...] }
```

---

## Open Questions
- Do we want to cache SAB API responses? (The data changes once a year)
- Should the street list be stored in the DB or fetched live from the SAB HTML?
- OAuth provider for auth (GitHub, Google) or credentials only?
