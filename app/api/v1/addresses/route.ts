import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/db/ensure-user";
import { syncPickupEvents } from "@/lib/sab/sync-pickup-events";

// GET /api/v1/addresses – list all saved addresses for the authenticated user
export async function GET() {
  const { isAuthenticated, getUser } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kindeUser = await getUser();
  if (!kindeUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db`
    SELECT id FROM users WHERE kinde_id = ${kindeUser.id}
  `;

  if (!user) {
    return NextResponse.json({ addresses: [] });
  }

  const addresses = await db`
    SELECT
      a.id,
      a.street,
      a.house_number,
      a.gelbe_tonne_behaelter,
      ua.is_default,
      ua.created_at
    FROM user_addresses ua
    JOIN addresses a ON a.id = ua.address_id
    WHERE ua.user_id = ${user.id}
    ORDER BY ua.is_default DESC, ua.created_at ASC
  `;

  return NextResponse.json({ addresses });
}

// POST /api/v1/addresses – save a new address for the authenticated user
export async function POST(request: NextRequest) {
  const { isAuthenticated, getUser } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kindeUser = await getUser();
  if (!kindeUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { street, house_number, sab_standplatz_id, gelbe_tonne_behaelter } = body;

  if (!street || !house_number || !sab_standplatz_id) {
    return NextResponse.json(
      { error: "Straße, Hausnummer und Standplatz-ID sind erforderlich." },
      { status: 400 },
    );
  }

  await ensureUser(kindeUser.id, kindeUser.email ?? "");

  const [user] = await db`
    SELECT id, account_type FROM users WHERE kinde_id = ${kindeUser.id}
  `;

  // Enforce 50-address limit
  const [{ count }] = await db`
    SELECT COUNT(*) AS count FROM user_addresses WHERE user_id = ${user.id}
  `;

  if (Number(count) >= 50) {
    return NextResponse.json(
      { error: "Maximale Anzahl von 50 Adressen erreicht." },
      { status: 422 },
    );
  }

  const accountType = ((user.account_type as string) ?? "private") as
    | "private"
    | "business";
  const gelbeTonenBehaelter =
    accountType === "private"
      ? ((gelbe_tonne_behaelter as string) ?? "b120_b240")
      : "b120_b240";

  // Find or create the canonical address record.
  // The unique key is (sab_street_id, house_number); sab_standplatz_id is NOT
  // unique — it identifies a waste-collection tour, not a single address.
  const [address] = await db`
    INSERT INTO addresses (street, house_number, sab_street_id, sab_standplatz_id, gelbe_tonne_behaelter)
    VALUES (${street}, ${house_number}, ${street}, ${sab_standplatz_id}, ${gelbeTonenBehaelter})
    ON CONFLICT (sab_street_id, house_number)
    DO UPDATE SET sab_standplatz_id = EXCLUDED.sab_standplatz_id,
                 gelbe_tonne_behaelter = EXCLUDED.gelbe_tonne_behaelter
    RETURNING id
  `;

  // Prevent duplicate associations
  const [existing] = await db`
    SELECT address_id FROM user_addresses
    WHERE user_id = ${user.id} AND address_id = ${address.id}
  `;

  if (existing) {
    return NextResponse.json(
      { error: "Diese Adresse ist bereits gespeichert." },
      { status: 409 },
    );
  }

  // First address automatically becomes the default
  const isFirst = Number(count) === 0;

  await db`
    INSERT INTO user_addresses (user_id, address_id, is_default)
    VALUES (${user.id}, ${address.id}, ${isFirst})
  `;

  const [newAddress] = await db`
    SELECT
      a.id,
      a.street,
      a.house_number,
      a.gelbe_tonne_behaelter,
      ua.is_default,
      ua.created_at
    FROM user_addresses ua
    JOIN addresses a ON a.id = ua.address_id
    WHERE ua.user_id = ${user.id} AND ua.address_id = ${address.id}
  `;

  // Fire-and-forget: cache pickup events from the SAB API.
  // Errors are logged inside syncPickupEvents and never surface here.
  syncPickupEvents(address.id, street, house_number, accountType).catch((err) =>
    console.error("[addresses POST] syncPickupEvents unexpected error:", err),
  );

  return NextResponse.json({ address: newAddress }, { status: 201 });
}
