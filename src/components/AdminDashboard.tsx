"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { content } from "@/config/content";
import type { Submission } from "@/lib/validation";

const a = content.admin;

type SortKey = "time_desc" | "time_asc" | "name_asc" | "name_desc";

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const norm = (s: string) => s.toLocaleLowerCase("ru").replace(/ё/g, "е");

/** Длинный ответ: обрезка + кнопка «Показать полностью». */
function LongText({ text, limit = 80 }: { text: string; limit?: number }) {
  const [open, setOpen] = useState(false);
  const chars = Array.from(text);
  if (chars.length <= limit && !text.includes("\n")) return <span className="long-text">{text}</span>;
  const short = chars.slice(0, limit).join("").split("\n")[0]!.trimEnd();
  return (
    <span className="long-text">
      {open ? text : `${short}…`}{" "}
      <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? "Свернуть" : "Показать полностью"}
      </button>
    </span>
  );
}

function Attendance({ yes }: { yes: boolean }) {
  return yes ? <span className="badge badge--yes">Придёт</span> : <span className="muted">Нет</span>;
}

export function AdminDashboard({ csrfToken }: { csrfToken: string }) {
  const [rows, setRows] = useState<Submission[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [drinkQuery, setDrinkQuery] = useState("");
  const [allergyQuery, setAllergyQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("time_desc");
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/submissions", { cache: "no-store", credentials: "same-origin" });
      if (res.status === 401) {
        window.location.assign("/");
        return;
      }
      const data = (await res.json()) as { ok?: boolean; submissions?: Submission[] };
      if (!res.ok || !data.ok || !Array.isArray(data.submissions)) throw new Error("load_failed");
      setRows(data.submissions);
      setState("ready");
    } catch {
      setState("error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: "{}",
        credentials: "same-origin",
      });
    } finally {
      window.location.assign("/");
    }
  }

  // Свободный текст не классифицируем: считаем только то, что известно точно.
  const confirmed = useMemo(() => rows.filter((r) => r.attendanceConfirmed).length, [rows]);

  const visible = useMemo(() => {
    const qn = norm(nameQuery.trim());
    const qd = norm(drinkQuery.trim());
    const qa = norm(allergyQuery.trim());
    const list = rows.filter(
      (r) =>
        (!qn || norm(r.nickname).includes(qn)) &&
        (!qd || norm(r.alcoholPreferencesText).includes(qd)) &&
        (!qa || norm(r.allergyText).includes(qa)),
    );
    const collator = new Intl.Collator("ru", { sensitivity: "base" });
    list.sort((x, y) => {
      switch (sort) {
        case "time_asc":
          return x.createdAt.localeCompare(y.createdAt);
        case "name_asc":
          return collator.compare(x.nickname, y.nickname);
        case "name_desc":
          return collator.compare(y.nickname, x.nickname);
        default:
          return y.createdAt.localeCompare(x.createdAt);
      }
    });
    return list;
  }, [rows, nameQuery, drinkQuery, allergyQuery, sort]);

  const filtersActive = Boolean(nameQuery.trim() || drinkQuery.trim() || allergyQuery.trim());

  return (
    <div className="admin">
      <header className="admin__header">
        <div>
          <h1 className="admin__title">{a.dashboardTitle}</h1>
          <p className="admin__count" aria-live="polite">
            {state === "ready"
              ? `${rows.length} ${plural(rows.length, "ответ", "ответа", "ответов")}`
              : state === "loading"
                ? "Загружаем ответы…"
                : ""}
          </p>
        </div>
        <div className="admin__actions">
          <button type="button" className="btn btn--ghost btn--small" onClick={() => void load()} disabled={refreshing}>
            {refreshing ? a.refreshing : a.refresh}
          </button>
          <a className="btn btn--primary btn--small" href="/api/admin/export" download>
            {a.exportCsv}
          </a>
          <button type="button" className="btn btn--ghost btn--small" onClick={logout} disabled={loggingOut}>
            {a.logout}
          </button>
        </div>
      </header>

      {state === "error" ? (
        <p className="admin__error" role="alert">
          {a.loadFailed}
        </p>
      ) : null}

      {state === "ready" && rows.length === 0 ? (
        <div className="admin__empty">
          <svg viewBox="0 0 60 52" aria-hidden="true" focusable="false">
            <path d="M10,24 Q6,8 24,6 Q44,2 52,18 Q58,36 40,44 Q20,50 12,38 Q8,32 10,24 Z" />
          </svg>
          <p>{a.empty}</p>
        </div>
      ) : null}

      {state === "ready" && rows.length > 0 ? (
        <>
          <section className="admin__stats" aria-label="Сводка">
            <div className="stat">
              <span className="stat__num">{rows.length}</span>
              <span className="stat__label">{plural(rows.length, "анкета", "анкеты", "анкет")}</span>
            </div>
            <div className="stat stat--accent">
              <span className="stat__num">{confirmed}</span>
              <span className="stat__label">{plural(confirmed, "подтверждение", "подтверждения", "подтверждений")} участия</span>
            </div>
          </section>

          <section className="admin__filters" aria-label="Поиск и сортировка">
            <div className="field field--inline">
              <label htmlFor="admin-search-name" className="field__label">
                Имя или никнейм
              </label>
              <input
                id="admin-search-name"
                type="search"
                className="input"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
              />
            </div>
            <div className="field field--inline">
              <label htmlFor="admin-search-drink" className="field__label">
                Поиск в «Что наливаем»
              </label>
              <input
                id="admin-search-drink"
                type="search"
                className="input"
                value={drinkQuery}
                onChange={(e) => setDrinkQuery(e.target.value)}
              />
            </div>
            <div className="field field--inline">
              <label htmlFor="admin-search-allergy" className="field__label">
                Поиск в ответах об аллергии
              </label>
              <input
                id="admin-search-allergy"
                type="search"
                className="input"
                value={allergyQuery}
                onChange={(e) => setAllergyQuery(e.target.value)}
              />
            </div>
            <div className="field field--inline">
              <label htmlFor="admin-sort" className="field__label">
                Сортировка
              </label>
              <select id="admin-sort" className="input" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="time_desc">Сначала новые</option>
                <option value="time_asc">Сначала старые</option>
                <option value="name_asc">По имени, А–Я</option>
                <option value="name_desc">По имени, Я–А</option>
              </select>
            </div>
          </section>

          <p className="admin__shown" aria-live="polite">
            {filtersActive ? `Показано: ${visible.length} из ${rows.length}` : ""}
          </p>

          {visible.length === 0 ? (
            <p className="admin__empty admin__empty--small">{a.noMatches}</p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Дата и время</th>
                      <th scope="col">Имя / никнейм</th>
                      <th scope="col">Что наливаем</th>
                      <th scope="col">Аллергия</th>
                      <th scope="col">Любимое животное</th>
                      <th scope="col">Любимый персонаж</th>
                      <th scope="col">Участие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={r.id}>
                        <td className="nowrap">
                          <time dateTime={r.createdAt}>{dateFmt.format(new Date(r.createdAt))}</time>
                        </td>
                        <td className="strong">
                          <LongText text={r.nickname} limit={50} />
                        </td>
                        <td>
                          <LongText text={r.alcoholPreferencesText} />
                        </td>
                        <td>
                          <LongText text={r.allergyText} />
                        </td>
                        <td>
                          <LongText text={r.favoriteAnimal} limit={50} />
                        </td>
                        <td>
                          <LongText text={r.favoriteCartoonCharacter} limit={60} />
                        </td>
                        <td>
                          <Attendance yes={r.attendanceConfirmed} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="admin-cards">
                {visible.map((r) => (
                  <li key={r.id} className="guest-card">
                    <div className="guest-card__top">
                      <h2 className="guest-card__name">{r.nickname}</h2>
                      <time className="guest-card__time" dateTime={r.createdAt}>
                        {dateFmt.format(new Date(r.createdAt))}
                      </time>
                    </div>
                    <dl className="guest-card__list">
                      <div>
                        <dt>Наливаем</dt>
                        <dd>
                          <LongText text={r.alcoholPreferencesText} />
                        </dd>
                      </div>
                      <div>
                        <dt>Аллергия</dt>
                        <dd>
                          <LongText text={r.allergyText} />
                        </dd>
                      </div>
                      <div>
                        <dt>Животное</dt>
                        <dd>
                          <LongText text={r.favoriteAnimal} limit={50} />
                        </dd>
                      </div>
                      <div>
                        <dt>Персонаж</dt>
                        <dd>
                          <LongText text={r.favoriteCartoonCharacter} limit={60} />
                        </dd>
                      </div>
                      <div>
                        <dt>Участие</dt>
                        <dd>
                          <Attendance yes={r.attendanceConfirmed} />
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
