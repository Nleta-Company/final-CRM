import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/*
 * Next.js middleware
 *
 * Authentication is handled by the backend using JWT.
 * The backend is hosted on Render, while the frontend
 * is hosted on Vercel.
 *
 * Therefore, the backend HTTP-only cookie cannot be
 * reliably read by the Vercel middleware.
 *
 * The middleware only allows the request to continue.
 * Backend authentication and RBAC remain responsible
 * for protecting API resources.
 */

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

/*
 * Application routes.
 *
 * These routes are passed through middleware.
 * Authentication itself is handled by the backend/API.
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/clients/:path*",
    "/bde/:path*",
    "/owner/:path*",
    "/analytics/:path*",

    /*
     * Older CRM sections.
     */
    "/client-assets/:path*",
    "/technicians/:path*",
    "/employees/:path*",
  ],
};