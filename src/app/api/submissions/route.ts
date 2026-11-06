import { DatabaseNotConfiguredError, logServerError } from "@/lib/server/db";
import { hitRateLimit, rateKey } from "@/lib/server/rate-limit";
import { BadRequestError, getClientIp, isSameOrigin, json, readJsonBody } from "@/lib/server/request";
import { saveSubmission } from "@/lib/server/submissions";
import { parseSubmission } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json({ ok: false, error: "forbidden" }, 403);

  try {
    const body = await readJsonBody(req, 16 * 1024);

    const limit = await hitRateLimit(rateKey("submit", getClientIp(req)), 30, 10 * 60);
    if (!limit.allowed) {
      return json({ ok: false, error: "rate_limited" }, 429, { "Retry-After": String(limit.retryAfterSeconds) });
    }

    const result = parseSubmission(body);
    if (!result.ok) {
      return json({ ok: false, error: "validation", fieldErrors: result.fieldErrors }, 400);
    }

    await saveSubmission(result.data);
    // Ответ одинаковый для первой записи и для повтора с тем же ключом.
    return json({ ok: true });
  } catch (error) {
    if (error instanceof BadRequestError) return json({ ok: false, error: "bad_request" }, 400);
    if (error instanceof DatabaseNotConfiguredError) return json({ ok: false, error: "not_configured" }, 503);
    logServerError("submissions.post", error);
    return json({ ok: false, error: "server_error" }, 500);
  }
}
