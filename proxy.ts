import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";

export default withAuth;

export const config = {
  matcher: [
    /*
     * Run Kinde's auth middleware on every request EXCEPT:
     *   - _next/static  – compiled assets
     *   - _next/image   – image optimisation
     *   - favicon.ico
     *   - /api/auth     – Kinde auth routes (login, logout, callback)
     *   - /api/v1/streets, /api/v1/house-numbers, /api/v1/pickups
     *     These are public SAB lookup endpoints that anonymous users must reach.
     *
     * The middleware refreshes Kinde tokens in serverless environments so that
     * isAuthenticated() returns the correct value in protected API routes.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/auth|api/v1/streets|api/v1/house-numbers|api/v1/pickups).*)",
  ],
};
