import { NextRequest, NextResponse } from "next/server";
import { getPickupDates } from "@/lib/sab";

export async function GET(request: NextRequest) {
  const street = request.nextUrl.searchParams.get("street") ?? "";
  const houseNumber = request.nextUrl.searchParams.get("houseNumber") ?? "";

  if (!street || !houseNumber) {
    return NextResponse.json(
      { error: "Missing required parameters: street, houseNumber" },
      { status: 400 },
    );
  }

  try {
    const schedule = await getPickupDates(street, houseNumber);

    // If no collections were parsed, the house number was not found
    if (schedule.collections.length === 0) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("[/api/v1/pickups]", error);
    return NextResponse.json(
      { error: "Failed to fetch pickup dates" },
      { status: 502 },
    );
  }
}
