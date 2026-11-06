import { requireAdmin } from "@/lib/server/auth";
import { DatabaseNotConfiguredError, logServerError } from "@/lib/server/db";
import { json } from "@/lib/server/request";
import { listSubmissions } from "@/lib/server/submissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return json({ ok: false, error: "unauthorized" }, 401);
    const submissions = await listSubmissions();
    return json({ ok: true, submissions });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return json({ ok: false, error: "not_configured" }, 503);
    logServerError("admin.submissions", error);
    return json({ ok: false, error: "server_error" }, 500);
  }
}
