import { NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/db/ensure-user";
import { prevDay, getPrevWorkday, getNextWorkday, getBinOutDay } from "@/lib/utils/workdays";

// Returns the ISO date string (YYYY-MM-DD) for a Date in UTC.
function toISODate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Returns Monday of the week containing the given date (UTC).
function weekStart(d: Date): Date {
  const day = d.getUTCDay(); // 0 = Sun … 6 = Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

// Returns Friday of the week containing the given date (UTC).
function weekEnd(d: Date): Date {
  const monday = weekStart(d);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  friday.setUTCHours(23, 59, 59, 999);
  return friday;
}

export type RouteEvent = {
  addressId: number;
  street: string;
  houseNumber: string;
  /** 0-based position of the address in the user's saved list */
  position: number;
  pickupDate: string; // YYYY-MM-DD
  binType: string;
  binOut: string; // YYYY-MM-DD – prev workday
  binIn: string; // YYYY-MM-DD – next workday
};

export type RouteResponse = {
  accountType: string;
  currentWeek: { [date: string]: RouteEvent[] };
  nextWeek: { [date: string]: RouteEvent[] };
};

// GET /api/v1/route – weekly pickup route for the authenticated user
export async function GET() {
  const { isAuthenticated, getUser } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kindeUser = await getUser();
  if (!kindeUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUser(kindeUser.id, kindeUser.email ?? "");

  const [user] = await db`
    SELECT id, account_type FROM users WHERE kinde_id = ${kindeUser.id}
  `;

  if (!user) {
    return NextResponse.json<RouteResponse>({
      accountType: "private",
      currentWeek: {},
      nextWeek: {},
    });
  }

  const accountType = (user.account_type as string) ?? "private";

  // Fetch all addresses for this user, ordered by the user's saved order.
  const userAddresses = await db`
    SELECT
      a.id          AS address_id,
      a.street,
      a.house_number,
      ROW_NUMBER() OVER (ORDER BY ua.is_default DESC, ua.created_at ASC) - 1 AS position
    FROM user_addresses ua
    JOIN addresses a ON a.id = ua.address_id
    WHERE ua.user_id = ${user.id}
    ORDER BY ua.is_default DESC, ua.created_at ASC
  `;

  if (userAddresses.length === 0) {
    return NextResponse.json<RouteResponse>({ accountType, currentWeek: {}, nextWeek: {} });
  }

  const addressIds = userAddresses.map((a) => a.address_id);

  // Determine the date range: Mon of current week … Fri of next week.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const rangeStart = weekStart(today);
  const rangeEnd = weekEnd(new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000));

  const events = await db`
    SELECT
      address_id,
      pickup_date::text AS pickup_date,
      bin_type
    FROM pickup_events
    WHERE address_id = ANY(${addressIds})
      AND pickup_date >= ${toISODate(rangeStart)}
      AND pickup_date <= ${toISODate(rangeEnd)}
    ORDER BY pickup_date ASC
  `;

  // Build a lookup map: addressId → { position, street, houseNumber }
  const addrMap = new Map(
    userAddresses.map((a) => [
      Number(a.address_id),
      {
        position: Number(a.position),
        street: a.street as string,
        houseNumber: a.house_number as string,
      },
    ]),
  );

  const currentWeekStart = weekStart(today);
  const nextWeekStart = new Date(
    currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  const currentWeek: { [date: string]: RouteEvent[] } = {};
  const nextWeek: { [date: string]: RouteEvent[] } = {};

  for (const ev of events) {
    const addr = addrMap.get(Number(ev.address_id));
    if (!addr) continue;

    const pickupDate = ev.pickup_date as string; // YYYY-MM-DD
    const pickupDateObj = new Date(pickupDate + "T00:00:00Z");

    const routeEvent: RouteEvent = {
      addressId: Number(ev.address_id),
      street: addr.street,
      houseNumber: addr.houseNumber,
      position: addr.position,
      pickupDate,
      binType: ev.bin_type as string,
      binOut: accountType === "business"
        ? toISODate(getBinOutDay(pickupDateObj))
        : toISODate(prevDay(pickupDateObj)),
      binIn: accountType === "business"
        ? pickupDate
        : toISODate(getNextWorkday(pickupDateObj)),
    };

    // Assign to current or next week bucket based on the Monday boundaries.
    const isCurrentWeek = pickupDateObj >= currentWeekStart && pickupDateObj < nextWeekStart;
    const bucket = isCurrentWeek ? currentWeek : nextWeek;

    if (!bucket[pickupDate]) {
      bucket[pickupDate] = [];
    }
    // Sort entries within a day by address position
    bucket[pickupDate].push(routeEvent);
    bucket[pickupDate].sort((a, b) => a.position - b.position);
  }

  return NextResponse.json<RouteResponse>({ accountType, currentWeek, nextWeek });
}
