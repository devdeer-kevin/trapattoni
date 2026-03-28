import { NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db } from "@/lib/db";
import { syncPickupEvents } from "@/lib/sab/sync-pickup-events";

// POST /api/v1/admin/backfill-pickups
// Temporary one-off endpoint: syncs pickup events for all addresses that have
// never been synced (last_synced_at IS NULL). Delete this file after use.
export async function POST() {
  const { isAuthenticated } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await db`
    SELECT id, street, house_number
    FROM addresses
    WHERE last_synced_at IS NULL
    ORDER BY id ASC
  `;

  const result = {
    total: addresses.length,
    success: 0,
    failed: 0,
    errors: [] as { addressId: number; error: string }[],
  };

  for (const addr of addresses) {
    const addressId = Number(addr.id);

    // syncPickupEvents swallows all errors and only updates last_synced_at on
    // success, so we check that column afterwards to detect failures.
    await syncPickupEvents(addressId, addr.street as string, addr.house_number as string);

    const [updated] = await db`
      SELECT last_synced_at FROM addresses WHERE id = ${addressId}
    `;

    if (updated?.last_synced_at) {
      result.success++;
    } else {
      result.failed++;
      result.errors.push({
        addressId,
        error: "syncPickupEvents completed but last_synced_at was not updated (SAB fetch likely failed or returned no data)",
      });
    }
  }

  return NextResponse.json(result);
}
