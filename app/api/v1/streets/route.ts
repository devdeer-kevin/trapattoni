import { NextRequest, NextResponse } from "next/server";
import { searchStreets } from "@/lib/sab";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  if (query.length < 3) {
    return NextResponse.json({ streets: [] });
  }

  try {
    const streets = await searchStreets(query);
    return NextResponse.json({ streets });
  } catch (error) {
    console.error("[/api/streets]", error);
    return NextResponse.json(
      { error: "Failed to fetch streets" },
      { status: 502 },
    );
  }
}
