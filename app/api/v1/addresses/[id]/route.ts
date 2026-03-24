import { NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/db/ensure-user";

// PATCH /api/v1/addresses/[id] – set as default
export async function PATCH(
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
    SELECT address_id FROM user_addresses
    WHERE user_id = ${user.id} AND address_id = ${id}
  `;

  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  // Remove current default, set new one – two steps to avoid index conflicts
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
