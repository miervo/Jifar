// Общий модуль проверки: одни и те же правила работают в браузере
// (подсказки до отправки) и на сервере (окончательная проверка).
import { z } from "zod";

export const TOTAL_STEPS = 5;

export const LIMITS = {
  nickname: 120,
  alcoholPreferencesText: 1000,
  allergyText: 1500,
  favoriteAnimal: 120,
  favoriteCartoonCharacter: 200,
} as const;

/** Ответы гостя в состоянии страницы. */
export type FormValues = {
  nickname: string;
  alcoholPreferencesText: string;
  allergyText: string;
  favoriteAnimal: string;
  favoriteCartoonCharacter: string;
};

export type FieldName = keyof FormValues;
export type FieldErrors = Partial<Record<FieldName, string>>;

export const emptyFormValues: FormValues = {
  nickname: "",
  alcoholPreferencesText: "",
  allergyText: "",
  favoriteAnimal: "",
  favoriteCartoonCharacter: "",
};

/** Какой шаг отвечает за какое поле (порядок совпадает с порядком шагов). */
export const FIELD_STEP: Record<FieldName, number> = {
  nickname: 1,
  alcoholPreferencesText: 2,
  allergyText: 3,
  favoriteAnimal: 4,
  favoriteCartoonCharacter: 5,
};

export const STEP_FIELD: Record<number, FieldName> = {
  1: "nickname",
  2: "alcoholPreferencesText",
  3: "allergyText",
  4: "favoriteAnimal",
  5: "favoriteCartoonCharacter",
};

const FIELD_ORDER: FieldName[] = [1, 2, 3, 4, 5].map((s) => STEP_FIELD[s]!);
const MULTILINE: Record<FieldName, boolean> = {
  nickname: false,
  alcoholPreferencesText: true,
  allergyText: true,
  favoriteAnimal: false,
  favoriteCartoonCharacter: false,
};

// --- Нормализация ---------------------------------------------------------

// Управляющие символы (кроме перевода строки и табуляции) и невидимые
// «направляющие» символы Unicode, которыми можно маскировать текст.
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Однострочное поле: убираем управляющие символы, схлопываем пробелы, обрезаем края. */
export function normalizeLine(value: string): string {
  return value.normalize("NFC").replace(CONTROL_RE, "").replace(/\s+/g, " ").trim();
}

/** Многострочное поле: переводы строк сохраняются, но не больше двух подряд. */
export function normalizeMultiline(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_RE, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const normalizeField = (name: FieldName, value: string) =>
  MULTILINE[name] ? normalizeMultiline(value) : normalizeLine(value);

/** «жираф» в любом регистре, после удаления пробелов по краям. */
export const isGiraffe = (value: string) => value.trim().toLocaleLowerCase("ru") === "жираф";

// --- Правила ---------------------------------------------------------------

const EMPTY_MESSAGES: Record<FieldName, string> = {
  nickname: "Напиши, как тебя называть.",
  alcoholPreferencesText: "Напиши хоть пару слов — даже если это «ничего не пью».",
  allergyText: "Напиши «нет», если аллергии нет, или «не хочу указывать».",
  favoriteAnimal: "Напиши любимое животное.",
  favoriteCartoonCharacter: "Напиши любимого персонажа.",
};

// Длину считаем в кодовых точках — так же, как char_length в Postgres.
const len = (s: string) => Array.from(s).length;

export function validateValues(values: FormValues, steps: number[] = [1, 2, 3, 4, 5]): FieldErrors {
  const errors: FieldErrors = {};
  for (const step of steps) {
    const name = STEP_FIELD[step];
    if (!name) continue;
    const value = normalizeField(name, values[name]);
    if (!value) errors[name] = EMPTY_MESSAGES[name];
    else if (len(value) > LIMITS[name]) errors[name] = `Слишком длинно: максимум ${LIMITS[name]} символов.`;
  }
  return errors;
}

export function firstErrorField(errors: FieldErrors): FieldName | null {
  return FIELD_ORDER.find((f) => errors[f]) ?? null;
}

// --- Обмен с сервером --------------------------------------------------------

/** Тело запроса POST /api/submissions. */
export const submissionRequestSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    nickname: z.string().max(2000),
    alcoholPreferencesText: z.string().max(8000),
    allergyText: z.string().max(8000),
    favoriteAnimal: z.string().max(2000),
    favoriteCartoonCharacter: z.string().max(2000),
    attendanceConfirmed: z.boolean(),
  })
  .strict();

export type SubmissionRequest = z.infer<typeof submissionRequestSchema>;

/** Нормализованная анкета, готовая к записи в базу. */
export type NormalizedSubmission = FormValues & {
  idempotencyKey: string;
  attendanceConfirmed: boolean;
};

export function toSubmissionRequest(
  values: FormValues,
  idempotencyKey: string,
  attendanceConfirmed: boolean,
): SubmissionRequest {
  return {
    idempotencyKey,
    nickname: normalizeField("nickname", values.nickname),
    alcoholPreferencesText: normalizeField("alcoholPreferencesText", values.alcoholPreferencesText),
    allergyText: normalizeField("allergyText", values.allergyText),
    favoriteAnimal: normalizeField("favoriteAnimal", values.favoriteAnimal),
    favoriteCartoonCharacter: normalizeField("favoriteCartoonCharacter", values.favoriteCartoonCharacter),
    attendanceConfirmed,
  };
}

/** Полная серверная проверка: форма данных (zod) + те же правила, что в браузере. */
export function parseSubmission(
  raw: unknown,
): { ok: true; data: NormalizedSubmission } | { ok: false; fieldErrors: FieldErrors; formError?: string } {
  const parsed = submissionRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: {}, formError: "invalid_shape" };

  const input = parsed.data;
  const values: FormValues = {
    nickname: input.nickname,
    alcoholPreferencesText: input.alcoholPreferencesText,
    allergyText: input.allergyText,
    favoriteAnimal: input.favoriteAnimal,
    favoriteCartoonCharacter: input.favoriteCartoonCharacter,
  };
  const fieldErrors = validateValues(values);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    data: {
      idempotencyKey: input.idempotencyKey,
      nickname: normalizeField("nickname", values.nickname),
      alcoholPreferencesText: normalizeField("alcoholPreferencesText", values.alcoholPreferencesText),
      allergyText: normalizeField("allergyText", values.allergyText),
      favoriteAnimal: normalizeField("favoriteAnimal", values.favoriteAnimal),
      favoriteCartoonCharacter: normalizeField("favoriteCartoonCharacter", values.favoriteCartoonCharacter),
      attendanceConfirmed: input.attendanceConfirmed,
    },
  };
}

/** Анкета в том виде, в каком её видит организатор. */
export type Submission = {
  id: string;
  createdAt: string;
  nickname: string;
  alcoholPreferencesText: string;
  allergyText: string;
  favoriteAnimal: string;
  favoriteCartoonCharacter: string;
  attendanceConfirmed: boolean;
};
