import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import type { Role } from "./constants";
import {
  verifyClerkSession,
  createClerkSessionToken,
  CLERK_SESSION_COOKIE,
} from "./clerk";

const COOKIE = "mediserve_session";

function secret() {
  return new TextEncoder().encode(
    process.env.CLERK_SECRET_KEY || process.env.AUTH_SECRET || "dev-secret",
  );
}

async function getCookieJar(): Promise<any> {
  try {
    // Safe dynamic load for environments with next/headers
    const nextHeaders = "next/headers";
    const mod = await import(nextHeaders).catch(() => null);
    if (mod?.cookies) {
      return await mod.cookies();
    }
  } catch {
    // pure node / express environment
  }
  return null;
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  doctorId?: string;
  caregiverId?: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await createClerkSessionToken(user);
  try {
    const jar = await getCookieJar();
    if (jar) {
      jar.set(COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
      jar.set(CLERK_SESSION_COOKIE, token, {
        httpOnly: false, // Clerk frontend SDK can read session cookie
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
    }
  } catch {
    // If running outside cookie setting context
  }
  return token;
}

export async function destroySession() {
  try {
    const jar = await getCookieJar();
    if (jar) {
      jar.delete(COOKIE);
      jar.delete(CLERK_SESSION_COOKIE);
    }
  } catch {
    // If running outside cookie context
  }
}

export async function getSession(req?: Request): Promise<SessionUser | null> {
  // 1. Try Clerk session verification (from Bearer token or cookies)
  const clerkUser = await verifyClerkSession(req);
  if (clerkUser) return clerkUser;

  // 2. Fallback to direct cookie inspection if outside request
  try {
    const jar = await getCookieJar();
    if (jar) {
      const token = jar.get(COOKIE)?.value || jar.get(CLERK_SESSION_COOKIE)?.value;
      if (!token) return null;
      const { payload } = await jwtVerify(token, secret());
      return payload as unknown as SessionUser;
    }
    return null;
  } catch {
    return null;
  }
}

export async function requireSession(req?: Request) {
  const s = await getSession(req);
  if (!s) throw new Error("UNAUTHENTICATED");
  return s;
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { doctor: true, caregiver: true },
  });
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  const session: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    doctorId: user.doctor?.id,
    caregiverId: user.caregiver?.id,
  };
  const token = await createSession(session);
  return { session, token };
}

export function homeFor(role: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "DOCTOR") return "/doctor";
  return "/caregiver";
}
