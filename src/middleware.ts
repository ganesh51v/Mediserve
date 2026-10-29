import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = ["/login"];

function secret() {
  return new TextEncoder().encode(
    process.env.CLERK_SECRET_KEY || process.env.AUTH_SECRET || "dev-secret",
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check Bearer token from header or Clerk/legacy cookies
  let token: string | undefined;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else {
    token =
      req.cookies.get("__session")?.value ||
      req.cookies.get("mediserve_session")?.value;
  }

  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      const roleClaim =
        payload.role ||
        (payload as any).public_metadata?.role ||
        (payload as any).metadata?.role;
      role = roleClaim ? String(roleClaim).toUpperCase() : null;
      if (!role && payload.sub) {
        const sub = String(payload.sub).toLowerCase();
        if (sub.includes("admin")) role = "ADMIN";
        else if (sub.includes("doctor")) role = "DOCTOR";
        else if (sub.includes("caregiver")) role = "CAREGIVER";
      }
    } catch {
      // Fallback try AUTH_SECRET
      const authSecret = process.env.AUTH_SECRET;
      if (authSecret) {
        try {
          const { payload } = await jwtVerify(token, new TextEncoder().encode(authSecret));
          role = String(payload.role ?? "");
        } catch {
          role = null;
        }
      } else {
        role = null;
      }
    }
  }

  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname =
      role === "ADMIN"
        ? "/admin"
        : role === "DOCTOR"
        ? "/doctor"
        : role
        ? "/caregiver"
        : "/login";
    return NextResponse.redirect(url);
  }

  if (PUBLIC.includes(pathname)) {
    if (role) {
      const url = req.nextUrl.clone();
      url.pathname =
        role === "ADMIN" ? "/admin" : role === "DOCTOR" ? "/doctor" : "/caregiver";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/doctor") && role !== "DOCTOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/caregiver") && role !== "CAREGIVER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
