import { NextResponse } from "next/server";
import { destroyAdminSession, requireAdmin, SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/auth";
import { DatabaseNotConfiguredError, logServerError } from "@/lib/server/db";
import { json } from "@/lib/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req, { mutating: true });
    if (!auth.ok) return json({ ok: false, error: auth.status === 401 ? "unauthorized" : "forbidden" }, auth.status);
    await destroyAdminSession(auth.token);
    const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(new Date(0)));
    return res;
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return json({ ok: false, error: "not_configured" }, 503);
    logServerError("admin.logout", error);
    return json({ ok: false, error: "server_error" }, 500);
  }
}
