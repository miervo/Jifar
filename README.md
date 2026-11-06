# Приглашение на день рождения Лены Кутузовой

Интерактивное приглашение: одна длинная страница с жирафом. Гость начинает
у копыт, отвечает на пять вопросов и поднимается вверх — по ногам, туловищу
и шее — к голове в праздничном колпачке. Там жираф передаёт сообщение,
гость подтверждает участие, ответы складываются в конверт, и только кнопка
«Отправить Леночку!» сохраняет анкету в PostgreSQL. Организатор смотрит
ответы в защищённой панели.

Стек: Next.js (App Router) · TypeScript · Tailwind CSS · Motion · PostgreSQL (Supabase или любой другой).

---

## Быстрый старт (локально)

```bash
npm install
cp .env.example .env.local      # заполнить значения — см. ниже
npm run db:migrate              # создать таблицы
npm run hash-password           # получить ADMIN_PASSWORD_HASH
npm run dev                     # http://localhost:3000
```

Без `DATABASE_URL` сайт откроется, но отправка анкеты честно вернёт ошибку
«база данных не подключена» — экран успеха показывается только после
подтверждённой записи в базу.

---

## Подключение базы данных

### Вариант А: Supabase

1. Создай проект на supabase.com.
2. **Project Settings → Database → Connection string**, вкладка **Transaction pooler**
   (порт `6543`). Подставь пароль базы и вставь строку в `DATABASE_URL`.
3. Примени схему одним из способов:
   - `npm run db:migrate` (локально, с заполненным `.env.local`);
   - или скопируй `db/migrations/001_init.sql` в **SQL Editor** Supabase и нажми Run.

Что делает схема с точки зрения безопасности:

- RLS включён на всех таблицах, политик нет — роли `anon` и `authenticated`
  (публичный API Supabase) не могут ни прочитать, ни записать анкеты;
- права `anon`/`authenticated` на таблицы отозваны;
- сайт ходит в базу только с сервера через `DATABASE_URL`; ключи Supabase
  (`anon`, `service_role`) в проекте не используются и в браузер не попадают;
- публичных ссылок на выгрузки нет: CSV формируется на лету и отдаётся только
  при действующей сессии организатора.

### Вариант Б: свой PostgreSQL (например, на VPS — см. «Деплой на VPS»)

Подойдёт Neon, Railway, собственный сервер. Укажи `DATABASE_URL` и выполни
`npm run db:migrate`. Для локального Postgres без TLS добавь `DATABASE_SSL="disable"`.

```bash
docker run --name lena-pg -e POSTGRES_PASSWORD=pass -p 5432:5432 -d postgres:16
# DATABASE_URL="postgresql://postgres:pass@localhost:5432/postgres"
# DATABASE_SSL="disable"
```

---

## Пароль организатора

Пароль не хранится нигде — ни в коде, ни в репозитории, ни в публичных
переменных. На сервере лежит только его хеш (scrypt с солью).

```bash
npm run hash-password
# Пароль организатора: ••••••••••••
# ADMIN_PASSWORD_HASH="scrypt:32768:8:1:…:…"
```

Скопируй строку в переменные окружения сервера (`.env.local` локально,
Environment Variables на хостинге). Чтобы сменить пароль — сгенерируй новый хеш
и замени значение; действующие сессии можно сбросить запросом
`delete from admin_sessions;`.

Как устроен вход:

- скрытая кнопка — маленькое пятно в правом нижнем углу (обычная `<button>`,
  доступна с клавиатуры, `aria-label="Вход для организатора"`);
- пароль проверяется только на сервере (`timingSafeEqual` по хешу);
- после входа ставится cookie `__Host-lena-admin`: `HttpOnly`, `Secure`
  (в production), `SameSite=Strict`, срок жизни — 8 часов
  (`ADMIN_SESSION_TTL_HOURS`); в базе хранится только SHA-256 токена;
- ограничение попыток: 5 за 15 минут с одного адреса и 100 за 15 минут суммарно;
  счётчики общие для всех серверных инстансов (лежат в Postgres), IP хранится
  только как HMAC с `RATE_LIMIT_SALT`;
- защита от CSRF: `SameSite=Strict`, проверка заголовка `Origin` на всех
  изменяющих запросах, для выхода — дополнительно CSRF-токен сессии в заголовке
  `x-csrf-token`;
- `/admin`, `/api/admin/submissions`, `/api/admin/export` без действующей
  сессии не отдают данные (страница перенаправляет на главную, API отвечает 401).

Проверка «прямым запросом» после деплоя:

```bash
curl -i https://твой-домен/api/admin/submissions   # → 401
curl -i https://твой-домен/api/admin/export        # → 401
```

---

## Переменные окружения

| Переменная | Обязательна | Назначение |
|---|---|---|
| `DATABASE_URL` | да | строка подключения PostgreSQL (только сервер) |
| `ADMIN_PASSWORD_HASH` | да | хеш пароля организатора из `npm run hash-password` |
| `RATE_LIMIT_SALT` | да | случайная строка для обезличивания IP |
| `DATABASE_SSL` | нет | `disable` для локального Postgres без TLS |
| `ADMIN_SESSION_TTL_HOURS` | нет | срок сессии, по умолчанию 8 |
| `APP_TIMEZONE` | нет | часовой пояс дат в CSV, по умолчанию `Europe/Moscow` |
| `ALLOWED_ORIGINS` | нет | доп. домены через запятую, если сайт открыт по нескольким адресам |
| `DATABASE_POOL_MAX` | нет | размер пула соединений, по умолчанию 3 |

Ни одна переменная не начинается с `NEXT_PUBLIC_` — в браузер ничего не уходит.

---

## Деплой на VPS (Ubuntu 22.04 / 24.04)

Схема: Node.js-приложение слушает `127.0.0.1:3000`, снаружи — Caddy с
автоматическим HTTPS, база — PostgreSQL на том же сервере. Нужен домен,
A-запись которого указывает на IP сервера (HTTPS обязателен: без него
браузер не сохранит защищённую cookie организатора).

```bash
# 1. Пакеты
sudo apt update && sudo apt install -y curl git postgresql ufw debian-keyring debian-archive-keyring apt-transport-https
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

# 2. База и пользователь (пароль — случайный)
DBPASS=$(openssl rand -hex 24)
sudo -u postgres psql -c "create user lena with password '$DBPASS';"
sudo -u postgres psql -c "create database lena owner lena;"
echo "DATABASE_URL=postgresql://lena:$DBPASS@127.0.0.1:5432/lena"

# 3. Приложение
sudo useradd --system --create-home --home-dir /srv/lena lena
sudo -u lena git clone <твой-репозиторий> /srv/lena/app   # или распакуй архив
cd /srv/lena/app && sudo -u lena npm ci
sudo -u lena npm run hash-password                        # → ADMIN_PASSWORD_HASH
```

Файл `/srv/lena/app/.env.production.local` (права `600`, владелец `lena`):

```
DATABASE_URL="postgresql://lena:…@127.0.0.1:5432/lena"
DATABASE_SSL="disable"
ADMIN_PASSWORD_HASH="scrypt:…"
RATE_LIMIT_SALT="…"            # openssl rand -base64 32
```

```bash
cd /srv/lena/app
sudo -u lena sh -c 'set -a; . ./.env.production.local; npm run db:migrate && npm run build'
```

Служба `/etc/systemd/system/lena.service`:

```ini
[Unit]
Description=Lena giraffe invite
After=network.target postgresql.service

[Service]
User=lena
WorkingDirectory=/srv/lena/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node node_modules/.bin/next start -H 127.0.0.1 -p 3000
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

`/etc/caddy/Caddyfile`:

```
твой-домен.ru {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now lena
sudo systemctl reload caddy
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable
```

Caddy сам выпустит и продлит сертификат. Он же подставляет настоящий IP
клиента в `X-Forwarded-For` (подделанный клиентом заголовок не принимается),
а по нему работает ограничение попыток. Postgres слушает только localhost —
наружу база не открыта.

Обновление: `git pull && npm ci && npm run build && sudo systemctl restart lena`.

Если ставил прошлую версию проекта: новая схема хранит ответы в таблице
`guest_answers`, старая таблица `submissions` больше не используется — её можно
удалить командой `drop table submissions;`, если в ней нет нужных ответов.

### Vercel + Supabase (вместо VPS)

Импортируй репозиторий в Vercel, добавь `DATABASE_URL` (Supabase,
Transaction pooler, порт 6543), `ADMIN_PASSWORD_HASH`, `RATE_LIMIT_SALT`,
примени миграцию к той же базе — и Deploy.

---

## Где что настраивать

| Что | Файл |
|---|---|
| Все тексты (гость и организатор) | `src/config/content.ts` |
| Палитра, анимация, высоты участков, стороны карточек | `src/config/theme.ts` |
| Ссылка на вишлист (необязательно) | `src/config/event.ts` — пока `null`, ссылки нет |
| Геометрия жирафа | `src/components/giraffe/geometry.ts` |

## Структура

```
src/
  app/
    layout.tsx                   шрифты + скрипт стартовой позиции у копыт
    page.tsx                     главная
    admin/page.tsx               панель организатора (серверная проверка сессии)
    api/submissions/route.ts     приём анкеты
    api/admin/login|logout|submissions|export/route.ts
  components/
    GiraffePage.tsx              сценарий и этапы (ExperienceStage), прокрутка, фокус
    GiraffeIllustration.tsx      единая SVG-иллюстрация на всю высоту страницы
    giraffe/geometry.ts          жираф по опорным точкам участков страницы
    giraffe/GiraffeHead.tsx      голова в колпачке
    SkyBackground.tsx            небо и облака
    WelcomeSection.tsx  QuestionSection.tsx  StepProgress.tsx  BirthdayForm.tsx  Fields.tsx
    GiraffeFinalMessage.tsx  EnvelopeConfirmation.tsx  SubmissionSuccess.tsx
    AdminEntry.tsx  AdminLogin.tsx  AdminDashboard.tsx
  hooks/useJourneyScroll.ts      плавная прокрутка, которую можно прервать
  lib/
    validation.ts                общие правила проверки (клиент + сервер)
    server/db.ts                 подключение к Postgres
    server/submissions.ts        модуль сохранения
    server/auth.ts               пароль, сессии, CSRF
    server/rate-limit.ts  server/request.ts  server/csv.ts
db/migrations/001_init.sql       схема базы
scripts/hash-password.mjs  scripts/migrate.mjs
```

## Как устроен подъём

- В DOM участки идут по смыслу: старт → вопросы 1–5 → финал. Визуально они
  стоят снизу вверх (`flex-direction: column-reverse`), поэтому клавиатура и
  скринридер проходят анкету в правильном порядке без `tabindex` больше нуля.
- Позиция у копыт выставляется один раз при загрузке: до этого страница скрыта,
  голова не мелькает. При изменении размера окна или открытии клавиатуры
  страница никуда не прыгает.
- «полетели» и «я не разобрался» плавно прокручивают к соседнему вопросу
  (550–900 мс). Колесо, касание или клавиши прокрутки сразу прерывают
  анимацию; после прокрутки фокус ставится без второго скачка.
- Иллюстрация рисуется по реальным координатам участков: если текст увеличен
  или карточка выросла, жираф подстраивается и остаётся под карточками.
- Этапы: `welcome → questions → final-message → envelope-ready → submitting → success`.
  Запечатывание конверта — только анимация; запись в базу создаёт лишь
  «Отправить Леночку!», а улёт конверта начинается после ответа сервера.

## Данные и приватность

- Ответы живут только в памяти страницы до нажатия «Отправить Леночку!»;
  в `localStorage`/`sessionStorage` ничего не пишется. После перезагрузки
  страница начинает с копыт и не утверждает, что что-то сохранено.
- Напитки и аллергия — свободный текст, поэтому панель не строит по ним
  «статистику»: только число анкет и подтверждений участия плюс поиск по тексту.
- Аналитики в проекте нет. В логи сервера пишутся только тип и код ошибки,
  без содержимого анкет.
- Повтор отправки после сетевого сбоя использует тот же ключ идемпотентности —
  дубликат не создаётся. Разные гости с одинаковым именем сохраняются раздельно.
- CSV: UTF-8 с BOM, разделитель `;` (Excel в русской локали открывает сразу),
  все ячейки в кавычках, значения, начинающиеся с `= + - @`, экранируются
  от formula injection.
