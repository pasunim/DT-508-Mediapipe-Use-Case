import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function rateLimitedResponse(resetAt: number): NextResponse {
  const res = NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 },
  );
  res.headers.set("Retry-After", String(Math.ceil((resetAt - Date.now()) / 1000)));
  res.headers.set("X-RateLimit-Limit", "0");
  res.headers.set("X-RateLimit-Remaining", "0");
  return res;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;
  const ip = getIp(req);

  // POST /api/register — strict: 5 attempts per 15 min per IP
  if (pathname === "/api/register" && method === "POST") {
    const result = rateLimit(ip, "register", 5, 15 * 60 * 1000);
    if (!result.allowed) return rateLimitedResponse(result.resetAt);
  }

  // POST /api/auth/* (NextAuth login) — 10 per 10 min
  if (pathname.startsWith("/api/auth") && method === "POST") {
    const result = rateLimit(ip, "auth", 10, 10 * 60 * 1000);
    if (!result.allowed) return rateLimitedResponse(result.resetAt);
  }

  // POST /api/game — 25 per 10 min (game saves)
  if (pathname === "/api/game" && method === "POST") {
    const result = rateLimit(ip, "game", 25, 10 * 60 * 1000);
    if (!result.allowed) return rateLimitedResponse(result.resetAt);
  }

  // GET /api/leaderboard — 30 per minute
  if (pathname === "/api/leaderboard" && method === "GET") {
    const result = rateLimit(ip, "leaderboard", 30, 60 * 1000);
    if (!result.allowed) return rateLimitedResponse(result.resetAt);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/register", "/api/auth/:path*", "/api/game", "/api/leaderboard"],
};
