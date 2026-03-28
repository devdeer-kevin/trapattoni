import { NextResponse } from "next/server";
import { getPickupDates } from "@/lib/sab";
import { buildIcal, BIN_LABELS, type ICalEvent } from "@/lib/ical/build-ical";

// GET /api/v1/calendar/export/public?street=...&house_number=...
// Fully public endpoint – no authentication required.
// Fetches pickup dates live from the SAB API and returns an .ics file.
//
// Required query parameters:
//   street       – street name (e.g. "Musterstraße")
//   house_number – house number (e.g. "12a")
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const street = searchParams.get("street");
  const houseNumber = searchParams.get("house_number");

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

  const events: ICalEvent[] = schedule.collections.flatMap((collection) =>
    collection.dates.map((entry) => ({
      uid: `${entry.date}-${collection.type}@tonnenraus.de`,
      dtstart: new Date(`${entry.date}T00:00:00Z`),
      summary: BIN_LABELS[collection.type] ?? collection.type,
      description: `${street} ${houseNumber}`,
    })),
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
