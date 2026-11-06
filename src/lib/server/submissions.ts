import "server-only";
import { getSql } from "./db";
import type { NormalizedSubmission, Submission } from "@/lib/validation";

type Row = {
  id: string;
  created_at: Date;
  nickname: string;
  alcohol_preferences_text: string;
  allergy_text: string;
  favorite_animal: string;
  favorite_cartoon_character: string;
  attendance_confirmed: boolean;
};

/**
 * Сохраняет анкету. Повтор с тем же ключом идемпотентности не создаёт новую
 * строку: это тот же гость, повторивший отправку после сбоя, — запись
 * обновляется последними данными, время первой отправки сохраняется.
 */
export async function saveSubmission(input: NormalizedSubmission): Promise<{ id: string; created: boolean }> {
  const sql = getSql();
  const [row] = await sql<{ id: string; created: boolean }[]>`
    insert into guest_answers (
      idempotency_key, nickname, alcohol_preferences_text, allergy_text,
      favorite_animal, favorite_cartoon_character, attendance_confirmed
    ) values (
      ${input.idempotencyKey}::uuid,
      ${input.nickname},
      ${input.alcoholPreferencesText},
      ${input.allergyText},
      ${input.favoriteAnimal},
      ${input.favoriteCartoonCharacter},
      ${input.attendanceConfirmed}
    )
    on conflict (idempotency_key) do update set
      nickname                   = excluded.nickname,
      alcohol_preferences_text   = excluded.alcohol_preferences_text,
      allergy_text               = excluded.allergy_text,
      favorite_animal            = excluded.favorite_animal,
      favorite_cartoon_character = excluded.favorite_cartoon_character,
      attendance_confirmed       = excluded.attendance_confirmed,
      updated_at                 = now()
    returning id, (xmax = 0) as created
  `;
  return { id: row!.id, created: row!.created };
}

export async function listSubmissions(): Promise<Submission[]> {
  const sql = getSql();
  const rows = await sql<Row[]>`
    select id, created_at, nickname, alcohol_preferences_text, allergy_text,
           favorite_animal, favorite_cartoon_character, attendance_confirmed
    from guest_answers
    order by created_at desc
    limit 5000
  `;
  return rows.map((r) => ({
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    nickname: r.nickname,
    alcoholPreferencesText: r.alcohol_preferences_text,
    allergyText: r.allergy_text,
    favoriteAnimal: r.favorite_animal,
    favoriteCartoonCharacter: r.favorite_cartoon_character,
    attendanceConfirmed: r.attendance_confirmed,
  }));
}
