import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "nleta_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Public routes
   */
  const publicRoutes = [
    "/signin",
    "/signup",
  ];

  /*
   * Allow public authentication pages.
   */
  if (
    publicRoutes.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(`${route}/`)
    )
  ) {
    return NextResponse.next();
  }

  /*
   * Check HTTP-only authentication cookie.
   */
  const authCookie = request.cookies.get(
    AUTH_COOKIE_NAME
  );

  /*
   * No authentication cookie:
   * redirect the user to Sign In.
   */
  if (!authCookie?.value) {
    const loginUrl = new URL(
      "/signin",
      request.url
    );

    /*
     * Remember the page the user originally
     * tried to open.
     */
    loginUrl.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(loginUrl);
  }

  /*
   * Authentication cookie exists.
   * Continue to the requested page.
   *
   * Actual JWT validation and RBAC remain
   * handled by the backend.
   */
  return NextResponse.next();
}

/*
 * Protect application routes while leaving
 * Next.js internal files and public assets alone.
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
     * These are old CRM sections and will be
     * removed from the new CRM navigation later.
     * Keeping them protected for now prevents
     * unauthenticated direct access.
     */
    "/client-assets/:path*",
    "/technicians/:path*",
    "/employees/:path*",
  ],
};