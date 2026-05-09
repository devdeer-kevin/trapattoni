import { getPickupDates, getGelbeTonneDates } from "@/lib/sab";
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

  const stadtteilId = schedule.stadtteilId;

  // Persist stadtteilId in DB if we received it and the address doesn't have it yet
  if (stadtteilId) {
    await db`
      UPDATE addresses
      SET stadtteil_id = ${stadtteilId}
      WHERE id = ${addressId} AND stadtteil_id IS NULL
    `;
  }

  // Insert all non-Gelbe-Tonne collections with behaelter = NULL
  for (const collection of schedule.collections) {
    if (collection.type === "Gelbe Tonne") continue;
    for (const entry of collection.dates) {
      await db`
        INSERT INTO pickup_events (address_id, pickup_date, bin_type, is_holiday_shift, behaelter)
        VALUES (${addressId}, ${entry.date}, ${collection.type}, ${entry.isHolidayShift}, NULL)
        ON CONFLICT (address_id, pickup_date, bin_type) WHERE behaelter IS NULL DO NOTHING
      `;
    }
  }

  // Handle Gelbe Tonne separately based on stadtteilId
  if (!stadtteilId) {
    console.error(
      "[syncPickupEvents] No stadtteilId for address",
      addressId,
      "– falling back to getPickupDates Gelbe Tonne data",
    );
    const fallback = schedule.collections.find((c) => c.type === "Gelbe Tonne");
    if (fallback) {
      for (const entry of fallback.dates) {
        await db`
          INSERT INTO pickup_events (address_id, pickup_date, bin_type, is_holiday_shift, behaelter)
          VALUES (${addressId}, ${entry.date}, 'Gelbe Tonne', ${entry.isHolidayShift}, 'b120_b240')
          ON CONFLICT (address_id, pickup_date, bin_type, behaelter) DO NOTHING
        `;
      }
    }
  } else {
    // Always fetch and store both sizes so the UI can filter by the address setting
    for (const size of ["b120_b240", "b1100"] as const) {
      let gelbeCollection;
      try {
        gelbeCollection = await getGelbeTonneDates(stadtteilId, size);
      } catch (err) {
        console.error(
          `[syncPickupEvents] getGelbeTonneDates failed for ${size}`,
          err,
        );
        continue;
      }
      for (const entry of gelbeCollection.dates) {
        await db`
          INSERT INTO pickup_events (address_id, pickup_date, bin_type, is_holiday_shift, behaelter)
          VALUES (${addressId}, ${entry.date}, 'Gelbe Tonne', ${entry.isHolidayShift}, ${size})
          ON CONFLICT (address_id, pickup_date, bin_type, behaelter) DO NOTHING
        `;
      }
    }
  }

  await db`
    UPDATE addresses SET last_synced_at = NOW() WHERE id = ${addressId}
  `;
}
