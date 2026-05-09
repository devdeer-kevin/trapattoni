import { NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/db/ensure-user";
import { syncPickupEvents } from "@/lib/sab/sync-pickup-events";

// PATCH /api/v1/addresses/[id]
// – set as default (no body)
// – update container size: body { gelbe_tonne_behaelter: "b120_b240" | "b1100" }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  // Verify the address belongs to this user
  const [existing] = await db`
    SELECT a.address_id, addr.street, addr.house_number
    FROM user_addresses a
    JOIN addresses addr ON addr.id = a.address_id
    WHERE a.user_id = ${user.id} AND a.address_id = ${id}
  `;

  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  // Parse body – may be empty for "set default" action
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine for set-default
  }

  // Container size change
  if (body.gelbe_tonne_behaelter) {
    const newBehaelter = body.gelbe_tonne_behaelter as string;
    if (!["b120_b240", "b1100"].includes(newBehaelter)) {
      return NextResponse.json({ error: "Ungültige Behältergröße." }, { status: 400 });
    }

    await db`
      UPDATE addresses SET gelbe_tonne_behaelter = ${newBehaelter} WHERE id = ${id}
    `;

    await db`
      DELETE FROM pickup_events WHERE address_id = ${id} AND bin_type = 'Gelbe Tonne'
    `;

    const accountType = ((user.account_type as string) ?? "private") as
      | "private"
      | "business";

    syncPickupEvents(
      Number(id),
      existing.street as string,
      existing.house_number as string,
      accountType,
    ).catch((err) =>
      console.error("[addresses PATCH] syncPickupEvents unexpected error:", err),
    );

    return NextResponse.json({ success: true, gelbe_tonne_behaelter: newBehaelter });
  }

  // Set as default
  await db`
    UPDATE user_addresses
    SET is_default = FALSE, updated_at = NOW()
    WHERE user_id = ${user.id} AND is_default = TRUE
  `;

  await db`
    UPDATE user_addresses
    SET is_default = TRUE, updated_at = NOW()
    WHERE user_id = ${user.id} AND address_id = ${id}
  `;

  return NextResponse.json({ success: true });
}

// DELETE /api/v1/addresses/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    SELECT id FROM users WHERE kinde_id = ${kindeUser.id}
  `;

  const { id } = await params;

  // Verify the address belongs to this user
  const [existing] = await db`
    SELECT address_id, is_default FROM user_addresses
    WHERE user_id = ${user.id} AND address_id = ${id}
  `;

  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  // Remove the association (not the address itself – other users may use it)
  await db`
    DELETE FROM user_addresses
    WHERE user_id = ${user.id} AND address_id = ${id}
  `;

  // If deleted address was default, promote the oldest remaining address
  if (existing.is_default) {
    await db`
      UPDATE user_addresses
      SET is_default = TRUE, updated_at = NOW()
      WHERE user_id = ${user.id}
      ORDER BY created_at ASC
      LIMIT 1
    `;
  }

  return NextResponse.json({ success: true });
}
