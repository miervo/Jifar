import { requireAdmin } from "@/lib/server/auth";
import { submissionsToCsv } from "@/lib/server/csv";
import { DatabaseNotConfiguredError, logServerError } from "@/lib/server/db";
import { json } from "@/lib/server/request";
import { listSubmissions } from "@/lib/server/submissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return json({ ok: false, error: "unauthorized" }, 401);

    const rows = await listSubmissions();
    const timeZone = process.env.APP_TIMEZONE || "Europe/Moscow";
    const csv = submissionsToCsv(rows, timeZone);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="lena-guests-${date}.csv"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return json({ ok: false, error: "not_configured" }, 503);
    logServerError("admin.export", error);
    return json({ ok: false, error: "server_error" }, 500);
  }
}
