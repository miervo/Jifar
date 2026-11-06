import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSql } from "./db";
import { isSameOrigin } from "./request";

const isProd = process.env.NODE_ENV === "production";

/** Префикс __Host- требует Secure и Path=/ — в production это дополнительная защита cookie. */
export const SESSION_COOKIE = isProd ? "__Host-lena-admin" : "lena-admin";

export function sessionTtlMs(): number {
  const hours = Number(process.env.ADMIN_SESSION_TTL_HOURS ?? 8);
  const safe = Number.isFinite(hours) && hours > 0 && hours <= 72 ? hours : 8;
  return safe * 60 * 60 * 1000;
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    path: "/",
    expires,
  };
}

// --- Пароль -----------------------------------------------------------------

type ParsedHash = { N: number; r: number; p: number; salt: Buffer; hash: Buffer };

function parsePasswordHash(value: string | undefined): ParsedHash | null {
  if (!value) return null;
  const parts = value.trim().split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [, n, r, p, salt, hash] = parts;
  const parsed = {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    salt: Buffer.from(salt!, "base64url"),
    hash: Buffer.from(hash!, "base64url"),
  };
  if (!Number.isInteger(parsed.N) || parsed.N < 16384 || !parsed.salt.length || parsed.hash.length < 32) return null;
  return parsed;
}

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, { ...opts, maxmem: 256 * opts.N * opts.r }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

/** Сравнивает пароль с хешем из ADMIN_PASSWORD_HASH. Пароль нигде не сохраняется. */
export async function verifyAdminPassword(password: string): Promise<"ok" | "wrong" | "not_configured"> {
  const parsed = parsePasswordHash(process.env.ADMIN_PASSWORD_HASH);
  if (!parsed) return "not_configured";
  const candidate = await scryptAsync(password.normalize("NFKC"), parsed.salt, parsed.hash.length, parsed);
  return candidate.length === parsed.hash.length && timingSafeEqual(candidate, parsed.hash) ? "ok" : "wrong";
}

// --- Сессии -----------------------------------------------------------------

const sha256 = (value: string) => createHash("sha256").update(value).digest("base64url");

export type AdminSession = { csrfToken: string; expiresAt: Date };

export async function createAdminSession(): Promise<{ token: string; csrfToken: string; expiresAt: Date }> {
  const sql = getSql();
  const token = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionTtlMs());
  await sql`delete from admin_sessions where expires_at < now()`;
  await sql`
    insert into admin_sessions (token_hash, csrf_token, expires_at)
    values (${sha256(token)}, ${csrfToken}, ${expiresAt})
  `;
  return { token, csrfToken, expiresAt };
}

async function findSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token || token.length > 200) return null;
  const sql = getSql();
  const [row] = await sql<{ csrf_token: string; expires_at: Date }[]>`
    select csrf_token, expires_at from admin_sessions
    where token_hash = ${sha256(token)} and expires_at > now()
  `;
  return row ? { csrfToken: row.csrf_token, expiresAt: new Date(row.expires_at) } : null;
}

export async function destroyAdminSession(token: string | undefined) {
  if (!token) return;
  const sql = getSql();
  await sql`delete from admin_sessions where token_hash = ${sha256(token)}`;
}

/** Для серверных компонентов (страница /admin). */
export async function getAdminSessionFromCookies(): Promise<AdminSession | null> {
  const store = await cookies();
  return findSession(store.get(SESSION_COOKIE)?.value);
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return undefined;
}

export function sessionTokenFromRequest(req: Request): string | undefined {
  return readCookie(req, SESSION_COOKIE);
}

/**
 * Проверка прав в route handlers. Любой endpoint с результатами вызывает её
 * первой строкой: без действующей сессии данные не отдаются.
 * Для изменяющих запросов дополнительно сверяются Origin и CSRF-токен.
 */
export async function requireAdmin(
  req: Request,
  options: { mutating?: boolean } = {},
): Promise<{ ok: true; session: AdminSession; token: string } | { ok: false; status: 401 | 403 }> {
  const token = sessionTokenFromRequest(req);
  const session = await findSession(token);
  if (!session || !token) return { ok: false, status: 401 };
  if (options.mutating) {
    if (!isSameOrigin(req)) return { ok: false, status: 403 };
    const header = req.headers.get("x-csrf-token") ?? "";
    const expected = Buffer.from(session.csrfToken);
    const given = Buffer.from(header);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, status: 403 };
  }
  return { ok: true, session, token };
}
