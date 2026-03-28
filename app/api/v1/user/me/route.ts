import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/db/ensure-user";

const ALLOWED_ACCOUNT_TYPES = ["private", "business"] as const;
type AccountType = (typeof ALLOWED_ACCOUNT_TYPES)[number];

// GET /api/v1/user/me – return the authenticated user's account_type
export async function GET() {
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
    SELECT account_type FROM users WHERE kinde_id = ${kindeUser.id}
  `;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ account_type: user.account_type });
}

// PATCH /api/v1/user/me – update the authenticated user's account_type
export async function PATCH(request: NextRequest) {
  const { isAuthenticated, getUser } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kindeUser = await getUser();
  if (!kindeUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUser(kindeUser.id, kindeUser.email ?? "");

  const body = await request.json();
  const { account_type } = body;

  if (!ALLOWED_ACCOUNT_TYPES.includes(account_type as AccountType)) {
    return NextResponse.json(
      { error: "account_type must be 'private' or 'business'" },
      { status: 400 },
    );
  }

  await db`
    UPDATE users
    SET account_type = ${account_type}, updated_at = NOW()
    WHERE kinde_id = ${kindeUser.id}
  `;

  return NextResponse.json({ success: true });
}
