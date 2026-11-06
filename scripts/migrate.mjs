// Применяет SQL-файлы из db/migrations по порядку.
// Запуск: npm run db:migrate  (берёт DATABASE_URL из окружения или .env.local)
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

if (!process.env.DATABASE_URL && existsSync(".env.local") && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env.local");
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Нет DATABASE_URL. Добавь его в .env.local или передай в окружении.");
  process.exit(1);
}

const sql = postgres(url, {
  prepare: false,
  max: 1,
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  onnotice: () => {},
});

const dir = path.resolve("db/migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

try {
  for (const file of files) {
    const text = await readFile(path.join(dir, file), "utf8");
    await sql.unsafe(text);
    console.log(`✓ ${file}`);
  }
  console.log("Готово: схема базы данных актуальна.");
} catch (error) {
  console.error("Миграция не удалась:", error?.message ?? error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
