import "server-only";

export class BadRequestError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "BadRequestError";
  }
}

/** IP клиента. На Vercel и большинстве прокси первый адрес в x-forwarded-for — клиентский. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Проверка источника для изменяющих запросов (часть защиты от CSRF).
 * Origin должен совпадать с хостом, на который пришёл запрос.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const allowed = new Set<string>();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) allowed.add(host.split(",")[0]!.trim());
  for (const extra of (process.env.ALLOWED_ORIGINS ?? "").split(",")) {
    const value = extra.trim();
    if (!value) continue;
    try {
      allowed.add(new URL(value).host);
    } catch {
      /* пропускаем некорректные значения */
    }
  }
  return allowed.has(originHost);
}

/** Читает JSON-тело с ограничением размера и проверкой Content-Type. */
export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) throw new BadRequestError("content_type");
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new BadRequestError("too_large");
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new BadRequestError("too_large");
  try {
    return JSON.parse(text);
  } catch {
    throw new BadRequestError("invalid_json");
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}
