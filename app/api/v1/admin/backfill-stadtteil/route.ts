import { NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db } from "@/lib/db";
import { getPickupDates } from "@/lib/sab";

// POST /api/v1/admin/backfill-stadtteil
// Temporary one-off endpoint: fills stadtteil_id for all addresses that are
// missing it. Delete this file after use.
export async function POST() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await db`
    SELECT id, street, house_number
    FROM addresses
    WHERE stadtteil_id IS NULL
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
    try {
      const schedule = await getPickupDates(
        addr.street as string,
        addr.house_number as string,
      );

      if (schedule.stadtteilId) {
        await db`
          UPDATE addresses
          SET stadtteil_id = ${schedule.stadtteilId}
          WHERE id = ${addressId}
        `;
        result.success++;
      } else {
        result.failed++;
        result.errors.push({
          addressId,
          error: `No stadtteil_id in SAB response for ${addr.street} ${addr.house_number}`,
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
