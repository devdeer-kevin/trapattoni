import { NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db } from "@/lib/db";
import { syncPickupEvents } from "@/lib/sab/sync-pickup-events";

// POST /api/v1/admin/backfill-sync
// Temporary one-off endpoint: re-syncs pickup events for all addresses with
// the new Gelbe Tonne logic (behaelter-aware). Delete this file after use.
// Use offset parameter to paginate: { offset: 0 }, { offset: 5 }, etc.
export async function POST(request: Request) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const offset = Number(body.offset ?? 0);
  const limit = 5;

  const addresses = await db`
    SELECT a.id, a.street, a.house_number, a.stadtteil_id, a.gelbe_tonne_behaelter,
           u.account_type
    FROM addresses a
    JOIN user_addresses ua ON ua.address_id = a.id
    JOIN users u ON u.id = ua.user_id
    ORDER BY a.id ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const result = {
    offset,
    limit,
    returned: addresses.length,
    success: 0,
    failed: 0,
    errors: [] as { addressId: number; error: string }[],
  };

  for (const addr of addresses) {
    const addressId = Number(addr.id);
    try {
      await syncPickupEvents(
        addressId,
        addr.street as string,
        addr.house_number as string,
      );

      const [updated] = await db`
        SELECT last_synced_at FROM addresses WHERE id = ${addressId}
      `;

      if (updated?.last_synced_at) {
        result.success++;
      } else {
        result.failed++;
        result.errors.push({
          addressId,
          error:
            "syncPickupEvents completed but last_synced_at was not updated",
        });
      }
    } catch (err) {
      result.failed++;
      result.errors.push({
        addressId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json(result);
}
