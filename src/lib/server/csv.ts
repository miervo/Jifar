import "server-only";
import type { Submission } from "@/lib/validation";

const HEADERS = [
  "Дата и время",
  "Имя / никнейм",
  "Что наливаем",
  "Аллергия",
  "Любимое животное",
  "Любимый персонаж",
  "Подтверждение участия",
];

/**
 * Ячейка CSV: всё в кавычках, кавычки удваиваются, переносы строк сохраняются.
 * Значения, которые табличный редактор может принять за формулу
 * (= + - @, табуляция, возврат каретки), экранируются апострофом.
 */
export function csvCell(value: string | null | undefined): string {
  let text = value ?? "";
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function submissionsToCsv(rows: Submission[], timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  // Точка с запятой — Excel в русской локали открывает такой файл без мастера импорта.
  const sep = ";";
  const lines = [HEADERS.map(csvCell).join(sep)];
  for (const r of rows) {
    lines.push(
      [
        fmt.format(new Date(r.createdAt)),
        r.nickname,
        r.alcoholPreferencesText,
        r.allergyText,
        r.favoriteAnimal,
        r.favoriteCartoonCharacter,
        r.attendanceConfirmed ? "Да" : "Нет",
      ]
        .map(csvCell)
        .join(sep),
    );
  }
  // BOM — чтобы Excel распознал UTF-8 и показал кириллицу.
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
