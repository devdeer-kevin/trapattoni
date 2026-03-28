import { NextResponse } from "next/server";
import { getPickupDates } from "@/lib/sab";
import {
  buildIcal,
  BIN_LABELS,
  BIN_LABELS_REMIND,
  type ICalEvent,
} from "@/lib/ical/build-ical";
import { getPrevWorkday } from "@/lib/utils/workdays";

// GET /api/v1/calendar/export/public?street=...&house_number=...&offset=true|false
// Fully public endpoint – no authentication required.
// Fetches pickup dates live from the SAB API and returns an .ics file.
//
// Required query parameters:
//   street       – street name (e.g. "Musterstraße")
//   house_number – house number (e.g. "12a")
//
// Optional query parameters:
//   offset=true  – shift each date to the previous workday (put-out reminder)
//   offset=false – (default) use the actual pickup date
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const street = searchParams.get("street");
  const houseNumber = searchParams.get("house_number");
  const applyOffset = searchParams.get("offset") === "true";

  if (!street || !houseNumber) {
    return NextResponse.json(
      { error: "Query parameters 'street' and 'house_number' are required." },
      { status: 400 },
    );
  }

  let schedule;
  try {
    schedule = await getPickupDates(street, houseNumber);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch pickup dates from SAB API." },
      { status: 502 },
    );
  }

  const labels = applyOffset ? BIN_LABELS_REMIND : BIN_LABELS;

  const events: ICalEvent[] = schedule.collections.flatMap((collection) =>
    collection.dates.map((entry) => {
      const pickupDate = new Date(`${entry.date}T00:00:00Z`);
      return {
        uid: `${entry.date}-${collection.type}@tonneraus`,
        dtstart: applyOffset ? getPrevWorkday(pickupDate) : pickupDate,
        summary: labels[collection.type] ?? collection.type,
        description: `${street} ${houseNumber}`,
      };
    }),
  );

  return new NextResponse(buildIcal(events), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="abfallkalender.ics"',
      "Cache-Control": "no-store",
    },
  });
}
