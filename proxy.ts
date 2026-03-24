import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";

export default withAuth;

export const config = {
  matcher: [
    /*
     * Run Kinde's auth middleware ONLY on protected routes:
     *   - /addresses        – user address management page
     *   - /api/v1/addresses – address API endpoints
     *
     * All other routes are public.
     */
    "/addresses/:path*",
    "/api/v1/addresses/:path*",
  ],
};
