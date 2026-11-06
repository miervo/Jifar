import { NextResponse } from "next/server";
import { createAdminSession, SESSION_COOKIE, sessionCookieOptions, verifyAdminPassword } from "@/lib/server/auth";
import { DatabaseNotConfiguredError, logServerError } from "@/lib/server/db";
import { hitRateLimit, rateKey, resetRateLimit } from "@/lib/server/rate-limit";
import { BadRequestError, getClientIp, isSameOrigin, json, readJsonBody } from "@/lib/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IP_LIMIT = 5; // попыток с одного адреса
const GLOBAL_LIMIT = 100; // попыток со всех адресов вместе
const WINDOW_SECONDS = 15 * 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  // Защита от login-CSRF: запрос должен прийти с этого же сайта.
  if (!isSameOrigin(req)) return json({ ok: false, error: "forbidden" }, 403);

  try {
    const body = (await readJsonBody(req, 2048)) as { password?: unknown };
    const password = typeof body?.password === "string" ? body.password : "";
    if (!password || password.length > 256) return json({ ok: false, error: "invalid_password" }, 401);

    const ipKey = rateKey("login", getClientIp(req));
    const [ipLimit, globalLimit] = await Promise.all([
      hitRateLimit(ipKey, IP_LIMIT, WINDOW_SECONDS),
      hitRateLimit("login:global", GLOBAL_LIMIT, WINDOW_SECONDS),
    ]);
    if (!ipLimit.allowed || !globalLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSeconds, globalLimit.retryAfterSeconds);
      return json({ ok: false, error: "rate_limited", retryAfterSeconds: retry }, 429, { "Retry-After": String(retry) });
    }

    const verdict = await verifyAdminPassword(password);
    if (verdict === "not_configured") return json({ ok: false, error: "not_configured" }, 503);
    if (verdict === "wrong") {
      await sleep(350 + Math.floor(Math.random() * 300));
      return json({ ok: false, error: "invalid_password" }, 401);
    }

    await resetRateLimit(ipKey);
    const session = await createAdminSession();
    const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    res.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
    return res;
  } catch (error) {
    if (error instanceof BadRequestError) return json({ ok: false, error: "bad_request" }, 400);
    if (error instanceof DatabaseNotConfiguredError) return json({ ok: false, error: "not_configured" }, 503);
    logServerError("admin.login", error);
    return json({ ok: false, error: "server_error" }, 500);
  }
}
