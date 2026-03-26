import { getPickupDates } from "@/lib/sab";
import { db } from "@/lib/db";

/**
 * Fetches pickup events from the SAB API for the given address and caches
 * them in the pickup_events table. Also updates last_synced_at on the address.
 *
 * Safe to call fire-and-forget: all errors are logged but never re-thrown,
 * so a failure here will never affect the caller's response.
 */
export async function syncPickupEvents(
  addressId: number,
  street: string,
  houseNumber: string,
): Promise<void> {
  let schedule;

  try {
    schedule = await getPickupDates(street, houseNumber);
  } catch (err) {
    console.error(
      "[syncPickupEvents] SAB fetch failed for address",
      addressId,
      err,
    );
    return;
  }

  if (schedule.collections.length === 0) {
    console.warn(
      "[syncPickupEvents] No pickup dates returned for address",
      addressId,
    );
    return;
  }

  // Insert each (address_id, pickup_date, bin_type) combination.
  // ON CONFLICT DO NOTHING keeps the function idempotent.
  for (const collection of schedule.collections) {
    for (const entry of collection.dates) {
      await db`
        INSERT INTO pickup_events (address_id, pickup_date, bin_type, is_holiday_shift)
        VALUES (${addressId}, ${entry.date}, ${collection.type}, ${entry.isHolidayShift})
        ON CONFLICT (address_id, pickup_date, bin_type) DO NOTHING
      `;
    }
  }

  await db`
    UPDATE addresses SET last_synced_at = NOW() WHERE id = ${addressId}
  `;
}
