# Zgidno-Vidpovidno (Згідно-Відповідно) 🪖

## Ukrainian / English

**UA:** Короткий pet project для перетворення буденних фраз на абсурдно-бюрократичні військові рапорти.

**EN:** A small pet project that turns everyday phrases into absurdly bureaucratic military reports.

> **UA:** Автоматизований Перекладач Військової Бюрократії v2.4.0
>
> **EN:** Automated Military Bureaucracy Translator v2.4.0

**UA:** Додаток бере звичайні українські фрази, наприклад «Старлінк обісцяли собаки» або «Забув пароль від пошти», і перетворює їх на формальні, гротескно-офіційні рапорти у стилі службового документообігу ЗСУ.

**EN:** The app takes ordinary Ukrainian phrases, such as “The dog peed on the router” or “I forgot my email password,” and turns them into formal, over-engineered reports in the style of Ukrainian military paperwork.

**UA:** Побудовано на **Astro**, **React**, **Tailwind CSS** та будь-якій LLM, що нормально працює з українською. У цьому репозиторії зараз використовується Cloudflare-proxied backend з повагою до безкоштовної квоти.

**EN:** Built with **Astro**, **React**, **Tailwind CSS**, and any LLM that handles Ukrainian well. This repo currently uses a Cloudflare-proxied backend and keeps free-tier usage in mind.

![Preview / Прев’ю](public/sample.png)

---

## Features / Можливості

* **UA:** Підтримка 5 напрямків служби з адаптацією термінології, резолюцій та погоджень.
* **EN:** Support for 5 military branches with adaptive terminology, resolutions, and approvals.
* **UA:** Структурований JSON-вихід для чистої інтеграції в UI.
* **EN:** Structured JSON output for clean UI integration.
* **UA:** Темний технічний стиль із термінальним характером та акцентами в стилі військового документообігу.
* **EN:** Dark technical styling with a terminal-like look and military-document aesthetics.
* **UA:** Few-shot приклади для стабільнішого й точнішого тексту.
* **EN:** Few-shot examples for more stable and accurate text generation.

---

## Project plans / Плани проєкту

* **UA:** [Двостороння конвертація: «З бюрократичної на людську»](docs/features/bidirectional-translation.md) — продуктова рефлексія, межі MVP, архітектурний план, ризики та критерії приймання.
* **EN:** [Bidirectional conversion: “From bureaucratic to plain language”](docs/features/bidirectional-translation.md) — product reflection, MVP scope, architecture plan, risks, and acceptance criteria (documented in Ukrainian).

---

## Tech Stack / Стек

* **Framework / Фреймворк:** [Astro](https://astro.build/) (Static site)
* **UI Library / Бібліотека UI:** [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Styling / Стилі:** [Tailwind CSS](https://tailwindcss.com/)
* **AI Engine / ШІ-движок:** Any Ukrainian-capable LLM / Будь-яка LLM, що працює з українською
* **Deployment / Деплой:** [Firebase Hosting & Cloud Functions](https://firebase.google.com/)

---

## Quick Start / Швидкий старт

### 1. Clone the repository / Клонувати репозиторій

```bash
git clone https://github.com/your-username/zgidno-vidpovidno.git
cd zgidno-vidpovidno
```

### 2. Install dependencies / Встановити залежності

```bash
npm install
```

### 3. Environment setup / Налаштувати середовище

For local frontend work, no browser-side LLM key is required. The current app calls a Cloudflare Worker proxy configured in `src/components/translator/constants.ts`.

Для локальної роботи з фронтендом браузерний LLM-ключ не потрібен. Поточний додаток викликає Cloudflare Worker proxy, налаштований у `src/components/translator/constants.ts`.

```bash
# src/components/translator/constants.ts
WORKER_URL = "https://your-worker.example.workers.dev/"
```

### 4. Run locally / Запустити локально

```bash
npm run dev
```

Open http://localhost:4321 in your browser.

Відкрийте http://localhost:4321 у браузері.

---

## How it works / Як це працює

**UA:** Фронтенд надсилає фразу на Cloudflare Worker proxy, після чого LLM отримує промпт, вибірку прикладів та повертає валідний JSON для UI.

**EN:** The frontend sends the phrase to a Cloudflare Worker proxy, then the LLM receives the prompt, example data, and returns valid JSON for the UI.

**UA:** Поля `report`, `resolution`, `order`, `approvers`, `regulation`, `authorized_by` та `operation_code` імітують структуру реального службового документа.

**EN:** The `report`, `resolution`, `order`, `approvers`, `regulation`, `authorized_by`, and `operation_code` fields simulate a real service document structure.

**UA:** Якщо фраза містить згадку про тварин, у список погоджувачів автоматично додається Начальник кінологічної служби.

**EN:** If the phrase mentions animals, the approvals list automatically includes the Head of the K9 Service.

**UA:** Уся бізнес-логіка зараз живе у фронтенді, тому розширювати роди військ і лексикон можна без складної серверної роботи.

**EN:** The business logic currently lives in the frontend, so adding more branches or expanding the lexicon is straightforward.

---

## Logic and implementation approach / Логіка та підхід до реалізації

**UA:** Додаток працює як легкий конвеєр із чіткими етапами: введення фрази, підготовка контексту (рід військ + few-shot приклади), генерація структурованої відповіді LLM, валідація JSON-структури та відображення в UI.

**EN:** The app follows a lightweight pipeline: phrase input, context preparation (branch selection + few-shot examples), LLM generation of structured output, JSON-shape validation, and UI rendering.

**UA:** Основна ідея реалізації — тримати формат виходу стабільним (`report`, `resolution`, `order`, `approvers`, `regulation`, `authorized_by`, `operation_code`), а стиль тексту адаптувати через промпт та приклади. Це дозволяє міняти модель або тональність без переробки інтерфейсу.

**EN:** The implementation keeps output format stable (`report`, `resolution`, `order`, `approvers`, `regulation`, `authorized_by`, `operation_code`) while adapting tone through prompt design and examples. This makes it easy to swap models or tune style without rewriting the UI.

**UA:** З практичної точки зору це дає просте масштабування: нові роди військ або словник додаються як дані/правила, а не як складна серверна логіка.

**EN:** Practically, this enables simple scaling: new branches or vocabulary are added as data/rules rather than complex backend logic.

---

## Prompt and API structure / Структура промпту та API

```json
{
  "report": "ДІЙСНИМ ДОПОВІДАЮ: ...",
  "resolution": "...",
  "order": "...",
  "approvers": [
    { "role": "...", "status": "..." }
  ],
  "regulation": "...",
  "authorized_by": "...",
  "operation_code": "..."
}
```

**UA:** `report` завжди починається зі слів «ДІЙСНИМ ДОПОВІДАЮ».

**EN:** `report` always starts with “ДІЙСНИМ ДОПОВІДАЮ”.

**UA:** `resolution`, `order` і `approvers` стилізовані під внутрішні погодження та службові коментарі.

**EN:** `resolution`, `order`, and `approvers` are styled like internal approvals and service comments.

---

## Deployment / Деплой

**UA:** Проєкт можна розгортати на Firebase Hosting як статичний сайт.

**EN:** The project can be deployed on Firebase Hosting as a static site.

**UA:** Не зберігайте клієнтські ключі в браузері. Якщо ви міняєте LLM, замініть проксі на прямі виклики до API провайдера на рівні бекенда або серверного ендпоінта.

**EN:** Do not expose client-side keys in the browser. If you switch LLMs, replace the proxy with direct calls to the provider API endpoint from the backend or server endpoint.

```bash
firebase login
firebase init
firebase functions:secrets:set GEMINI_API_KEY="your_real_key"
firebase deploy
```

---

## License / Ліцензія

**UA:** Проєкт розповсюджується під ліцензією MIT — однією з найвільніших і найпоширеніших open source ліцензій.

**EN:** This project is available under the MIT License, one of the most permissive and widely used open-source licenses.

**UA/EN:** Повний текст ліцензії доступний у файлі [`LICENSE`](LICENSE).

---

## Contributing / Внесок

**UA:** Contrib welcome. Можна додати більше родів військ, розширити лексикон або підсилити генерацію новими прикладами. Оскільки основна логіка зараз у фронтенді, такі зміни мають бути відносно простими.

**EN:** Contributions are welcome. You can add more branches, expand the lexicon, or improve generation with new examples. Since most of the logic currently lives in the frontend, these changes should be relatively easy.
