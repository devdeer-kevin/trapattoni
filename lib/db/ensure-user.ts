import { db } from "@/lib/db";

export async function ensureUser(
  kindeId: string,
  email: string,
): Promise<void> {
  await db`
    INSERT INTO users (kinde_id, email)
    VALUES (${kindeId}, ${email})
    ON CONFLICT (kinde_id) DO UPDATE SET email = EXCLUDED.email
  `;
}
