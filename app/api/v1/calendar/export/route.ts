import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/db/ensure-user";
import { getBinOutDay, getPrevWorkday } from "@/lib/utils/workdays";
import {
  buildIcal,
  BIN_LABELS_REMIND,
  BIN_LABELS_ACTUAL,
  type ICalEvent,
} from "@/lib/ical/build-ical";

// GET /api/v1/calendar/export
// Returns an .ics file containing all-day pickup events for the authenticated
// user's saved addresses.
//
// Query params (private accounts only):
//   ?mode=actual   – use the actual pickup date; no reminder shift applied
//   ?mode=remind   – (default) shift date to the previous workday so the event
//                    acts as a put-out reminder
//
// Business accounts always use getBinOutDay regardless of the mode param.
export async function GET(request: Request) {
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
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Fetch all pickup events for every address linked to this user.
  const rows = await db`
    SELECT
      pe.id          AS pickup_event_id,
      pe.pickup_date::text AS pickup_date,
      pe.bin_type,
      a.street,
      a.house_number
    FROM user_addresses ua
    JOIN addresses a  ON a.id  = ua.address_id
    JOIN pickup_events pe ON pe.address_id = a.id
    WHERE ua.user_id = ${user.id}
    ORDER BY pe.pickup_date ASC, a.street ASC, a.house_number ASC
  `;

  const accountType: string = user.account_type;
  const { searchParams } = new URL(request.url);
  // Only meaningful for private accounts; business always uses getBinOutDay.
  const useActualDate =
    accountType === "private" && searchParams.get("mode") === "actual";

  const labels = useActualDate ? BIN_LABELS_ACTUAL : BIN_LABELS_REMIND;

  const events: ICalEvent[] = rows.map((row) => {
      const pickupDate = new Date(`${row.pickup_date}T00:00:00Z`);

      // Determine the event date based on account type and chosen mode.
      const dtstart =
        accountType === "business"
          ? getBinOutDay(pickupDate)
          : useActualDate
            ? pickupDate
            : getPrevWorkday(pickupDate);

      return {
        uid: `${row.pickup_event_id}@tonnenraus.de`,
        dtstart,
        summary: labels[row.bin_type] ?? row.bin_type,
        description: `${row.street} ${row.house_number}`,
      };
  });

  return new NextResponse(buildIcal(events), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="abfallkalender.ics"',
      "Cache-Control": "no-store",
    },
  });
}
