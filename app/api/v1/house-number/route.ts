import { NextRequest, NextResponse } from "next/server";
import { getHouseNumbers } from "@/lib/sab";

export async function GET(request: NextRequest) {
  const street = request.nextUrl.searchParams.get("street") ?? "";

  if (!street) {
    return NextResponse.json(
      { error: "Missing required parameter: street" },
      { status: 400 },
    );
  }

  try {
    const houseNumbers = await getHouseNumbers(street);
    return NextResponse.json({ houseNumbers });
  } catch (error) {
    console.error("[/api/house-numbers]", error);
    return NextResponse.json(
      { error: "Failed to fetch house numbers" },
      { status: 502 },
    );
  }
}
