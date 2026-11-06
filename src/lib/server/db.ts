import "server-only";
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not configured");
    this.name = "DatabaseNotConfiguredError";
  }
}

const globalForDb = globalThis as unknown as { __lenaGiraffeSql?: Sql };

/**
 * Единственное подключение к Postgres на процесс.
 * prepare: false — обязательно для пулера Supabase в режиме Transaction (порт 6543).
 */
export function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseNotConfiguredError();

  if (!globalForDb.__lenaGiraffeSql) {
    globalForDb.__lenaGiraffeSql = postgres(url, {
      prepare: false,
      max: Number(process.env.DATABASE_POOL_MAX ?? 3),
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
      onnotice: () => {},
      // Не выводить параметры запросов в логи ошибок.
      debug: false,
    });
  }
  return globalForDb.__lenaGiraffeSql;
}

/** Безопасная запись ошибки: только тип и код, без данных анкеты. */
export function logServerError(scope: string, error: unknown) {
  const e = error as { name?: string; code?: string } | undefined;
  console.error(`[${scope}] ${e?.name ?? "Error"}${e?.code ? ` (${e.code})` : ""}`);
}
