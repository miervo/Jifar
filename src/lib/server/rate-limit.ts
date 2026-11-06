import "server-only";
import { createHmac } from "node:crypto";
import { getSql } from "./db";

/** Ключ без сырого IP: HMAC от адреса с серверной солью. */
export function rateKey(scope: string, ip: string): string {
  const salt = process.env.RATE_LIMIT_SALT || "lena-giraffe-default-salt";
  const digest = createHmac("sha256", salt).update(ip).digest("base64url").slice(0, 32);
  return `${scope}:${digest}`;
}

/**
 * Счётчик с фиксированным окном, общий для всех серверных инстансов (хранится в Postgres).
 */
export async function hitRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const sql = getSql();
  const [row] = await sql<{ count: number; window_start: Date }[]>`
    insert into rate_limits (key, count, window_start)
    values (${key}, 1, now())
    on conflict (key) do update set
      count = case
        when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}::double precision) then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}::double precision) then now()
        else rate_limits.window_start
      end
    returning count, window_start
  `;
  const allowed = row.count <= limit;
  const resetAt = new Date(row.window_start).getTime() + windowSeconds * 1000;
  return { allowed, retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) };
}

export async function resetRateLimit(key: string) {
  const sql = getSql();
  await sql`delete from rate_limits where key = ${key}`;
}
