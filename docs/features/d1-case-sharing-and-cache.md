# D1 cache та публічні посилання `?case=<id>`

**Статус:** In progress

**Дата:** 13 червня 2026

## Коротко

Використати Cloudflare D1 для двох пов'язаних, але різних сценаріїв:

1. Кешувати повторювані кумедні запити, щоб не викликати LLM для однакового
   вводу щоразу.
2. Створювати незмінні публічні snapshots за адресою:

   ```text
   https://zgidno-vidpovidno.web.app/?case=<id>
   ```

`case` має відтворювати саме той текст і результат, які бачив користувач, а не
запускати генерацію повторно.

## Чому D1

D1 краще підходить за KV, якщо крім простого cache потрібні:

- пошук за публічним ID;
- унікальність за hash запиту;
- метадані режиму й документа;
- дата створення та строк зберігання;
- лічильник відкриттів;
- майбутня модерація або видалення.

На Workers Free D1 має достатній запас для цього pet project: до 5 млн
прочитаних рядків на день, 100 тис. записаних рядків на день і 5 GB сумарного
сховища. Окрема база на Free має ліміт 500 MB.

## Важливе розділення

### Cache entry

Внутрішній запис для повторного використання відповіді. Користувач не
обов'язково знає його ID.

### Shared case

Публічний незмінний snapshot, створений явною кнопкою `Створити посилання`.
Після створення його payload не змінюється.

Не слід автоматично робити кожен cache entry публічним.

## Приватність

Режим `На людську` може містити реальні рапорти, імена, позивні, місця та інші
чутливі дані.

Рекомендована політика:

- `to_bureaucratic`: можна автоматично кешувати після успішної генерації;
- `to_plain`: не кешувати повний input автоматично;
- shared case для будь-якого режиму створювати лише після натискання
  `Створити публічне посилання`;
- перед створенням case у режимі `to_plain` показувати підтвердження:
  `Посилання буде доступне кожному, хто його отримає`;
- не індексувати case-сторінки пошуковиками;
- не записувати source/result JSON у звичайні Worker logs.

## Публічний ID

ID не повинен бути послідовним числом. Інакше записи можна легко перебрати.

Рекомендація:

```js
const id = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
```

Це дає URL на кшталт:

```text
/?case=4a7c2f0918ab43d693e1
```

ID є unlisted, але не є механізмом авторизації: кожен, хто знає URL, може
прочитати case.

## Модель даних

Для MVP достатньо однієї таблиці:

```sql
CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  request_hash TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('to_bureaucratic', 'to_plain')),
  source_text TEXT NOT NULL,
  result_json TEXT NOT NULL,
  ui_json TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX cases_cache_hash_idx
ON cases(request_hash)
WHERE request_hash IS NOT NULL;

CREATE INDEX cases_expiry_idx ON cases(expires_at);
```

`result_json` зберігає точну валідовану відповідь моделі.

`ui_json` зберігає дані, потрібні для точного відтворення:

```json
{
  "branch": "СБС",
  "generationLength": "s",
  "docNumber": "ЗВ-2026/06/13-1234",
  "docDate": "13.06.2026 о 14:57"
}
```

Для `to_plain` цей об'єкт може бути порожнім.

## Cache key

Hash має залежати від семантики генерації:

```json
{
  "mode": "to_bureaucratic",
  "input": "старлінк обісцяли собаки",
  "branch": "СБС",
  "length": "s",
  "promptVersion": "bureaucratic-v3",
  "schemaVersion": 1
}
```

Input перед hash:

- `trim`;
- Unicode normalization `NFKC`;
- lower case;
- заміна кількох пробілів одним.

Не можна включати поточну дату, номер документа або випадкові prompt seeds у
hash, якщо мета — cache hit для однакового запиту.

## Детермінізм прямого режиму

Поточний режим `to_bureaucratic` додає випадковий контекст і дату. Якщо
повертати весь старий snapshot із cache, користувач отримає стару дату й номер.

Рекомендований MVP:

- кешувати лише `result_json`;
- на cache hit створювати нові `docNumber` і `docDate` у клієнті;
- не вважати cache hit shared case;
- shared case окремо зберігає точні старі реквізити в `ui_json`.

Так cache економить LLM-виклики, а публічне посилання відтворює точний
оригінал.

## Worker API

Зберегти поточний `POST /` для сумісності або перейти на явні routes:

### `POST /generate`

```json
{
  "providerPayload": {},
  "context": {
    "mode": "to_bureaucratic",
    "sourceText": "Старлінк обісцяли собаки",
    "branch": "СБС",
    "generationLength": "s",
    "promptVersion": "bureaucratic-v3"
  }
}
```

Алгоритм:

1. Валідувати розмір і shape.
2. Обчислити `request_hash`.
3. Для дозволеного режиму перевірити D1 cache.
4. На hit повернути збережений `result_json` із `cacheStatus: "hit"`.
5. На miss викликати Gemini, потім Workers AI fallback.
6. Після успіху записати cache entry.
7. Повернути `cacheStatus: "miss"`.

### `POST /cases`

Створює публічний snapshot лише за явною дією:

```json
{
  "mode": "to_bureaucratic",
  "sourceText": "Старлінк обісцяли собаки",
  "result": {},
  "ui": {
    "branch": "СБС",
    "generationLength": "s",
    "docNumber": "ЗВ-2026/06/13-1234",
    "docDate": "13.06.2026 о 14:57"
  }
}
```

Відповідь:

```json
{
  "id": "4a7c2f0918ab43d693e1",
  "url": "https://zgidno-vidpovidno.web.app/?case=4a7c2f0918ab43d693e1"
}
```

### `GET /cases/:id`

Повертає лише публічний case:

```json
{
  "id": "4a7c2f0918ab43d693e1",
  "mode": "to_bureaucratic",
  "sourceText": "Старлінк обісцяли собаки",
  "result": {},
  "ui": {},
  "createdAt": "2026-06-13T05:00:00.000Z"
}
```

Для відсутнього, приватного або простроченого case повертати `404`, не
пояснюючи різницю.

## Frontend flow

### Створення

1. Користувач генерує результат.
2. Кнопка `Поділитися` спочатку викликає `POST /cases`.
3. Після успіху Web Share API отримує canonical URL.
4. Якщо Web Share API недоступний, URL копіюється в clipboard.
5. Повторне натискання для того самого результату повторно використовує
   отриманий ID у стані вкладки.

### Відкриття

1. На старті прочитати `new URLSearchParams(location.search).get("case")`.
2. Перевірити ID регулярним виразом, наприклад `/^[a-f0-9]{20}$/`.
3. Викликати `GET /cases/:id`.
4. Відновити mode, input, result і UI metadata.
5. Показати позначку `Збережений результат`.
6. Не запускати LLM і не застосовувати клієнтський generation rate limit.
7. Якщо case не знайдено, показати локальну помилку без gateway-error report.

## Безпека й abuse controls

- Максимальний `sourceText`: 12 000 символів.
- Максимальний `result_json + ui_json`: 64 KB.
- Валідувати обидві response schemas у Worker перед записом.
- Використовувати D1 prepared statements і `.bind()`.
- Rate limit для `POST /cases`, окремий від generation limit.
- Дозволити CORS лише production origin і localhost під час розробки замість
  `*`, якщо API стає сховищем публічних даних.
- Додати `Cache-Control: public, max-age=300` для `GET /cases/:id`, бо snapshot
  незмінний.
- У frontend додати `robots` meta `noindex` при активному `case`.

## Retention

- cache entries у майбутньому можна зберігати 30 днів;
- public shared cases є постійними, `expires_at` для них залишається `NULL`;
- для sensitive content у майбутньому потрібен окремий механізм видалення.

## Observability

В analytics передавати лише:

- `cache_hit` / `cache_miss`;
- `case_created`;
- `case_opened`;
- mode;
- розмір payload;
- вік case.

Не передавати source text, result JSON або case ID у Firebase Analytics.

## Етапи

1. Винести Worker source у цей open-source repository або окремий публічний
   repository з `wrangler.jsonc`.
2. Створити D1 database і migration.
3. Додати D1 binding `DB`.
4. Реалізувати `/generate`, `/cases`, `/cases/:id`.
5. Оновити frontend share/open flows.
6. Додати Worker tests для cache hit, public case, malformed ID, expiry та
   sensitive-mode policy.
7. Додати cleanup cron і метрики.

## Критерії приймання

1. Однаковий дозволений запит може отримати cached response без LLM.
2. `?case=<id>` відтворює точний збережений результат і реквізити.
3. Відкриття case не витрачає LLM quota.
4. Неіснуючий або прострочений ID повертає зрозумілий `404` state.
5. `to_plain` не зберігається автоматично.
6. Створення публічного `to_plain` case вимагає явного підтвердження.
7. Послідовні IDs неможливо перебирати.
8. D1 queries використовують index і prepared statements.
