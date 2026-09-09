# Подготовка scaffold

Дата проверки: **2026-09-09**.

Этот документ фиксирует результат этапа 0. Он не является scaffold: в репозитории
по-прежнему нет `package.json`, lockfile, исходного кода приложения или CI workflow.

## Зафиксированная среда

- runtime для локальной разработки и CI: **Node.js 24.21.0 (LTS Krypton)**;
- package manager: **pnpm 12.3.4**;
- поле будущего `package.json`: `"packageManager": "pnpm@12.3.4"`;
- будущие `.node-version` и CI должны содержать одну и ту же версию `24.21.0`;
- целевой runtime приложения: Cloudflare Workers с `compatibility_date =
  "2026-09-09"` и флагом `nodejs_compat`.

Node.js 24 выбран вместо минимально допустимого Node.js 22: это активная LTS-ветка,
она удовлетворяет требованиям React Router 8 (`>=22.22.0`), remix-i18next 8
(`>=22.22.0`), Vite 8 (`^20.19.0 || >=22.12.0`), Wrangler 4 (`>=22`) и
Vitest 4 (`^20 || ^22 || >=24`). Локальная среда и CI не должны использовать
разные major/minor runtime.

## Совместимый набор версий для первого PR

Все версии ниже должны быть записаны в `package.json` точно, без `^` и `~`, а
получившийся pnpm lockfile должен быть закоммичен.

| Назначение | Пакет | Версия |
| --- | --- | ---: |
| Framework Mode и SSR | `react-router` | `8.3.1` |
| build tooling | `@react-router/dev` | `8.3.1` |
| Workers adapter | `@react-router/cloudflare` | `8.3.1` |
| UI runtime | `react`, `react-dom` | `19.2.8` |
| сборка | `vite` | `8.2.2` |
| типизация | `typescript` | `6.0.3` |
| Workers CLI | `wrangler` | `4.130.0` |
| Workers types | `@cloudflare/workers-types` | `5.20260908.1` |
| i18n core | `i18next` | `26.4.2` |
| React binding | `react-i18next` | `17.0.13` |
| SSR middleware | `remix-i18next` | `8.0.0` |
| test runner | `vitest` | `4.1.11` |
| Workers test pool | `@cloudflare/vitest-pool-workers` | `0.22.0` |
| DOM tests | `@testing-library/react` | `16.3.3` |
| DOM queries | `@testing-library/dom` | `10.4.1` |
| DOM assertions | `@testing-library/jest-dom` | `7.0.1` |
| lint | `eslint` | `10.10.0` |
| TS lint rules | `typescript-eslint` | `8.70.0` |

TypeScript 7.0.2 намеренно не выбран: актуальный `typescript-eslint` 8.70.0
объявляет диапазон TypeScript `>=4.8.4 <6.1.0`. Vitest 5.0.0 также намеренно не
выбран: Workers pool 0.22.0 требует Vitest, runner и snapshot версии `^4.1.0`.
Выбранные TypeScript 6.0.3 и Vitest 4.1.11 входят в эти peer-диапазоны.

Для будущих этапов дополнительно проверена совместимость опубликованных stable
версий: Better Auth 1.7.3 принимает React 19 и требует Drizzle ORM `^0.45.2` либо
совместимый 1.x prerelease; Drizzle ORM 0.45.2 удовлетворяет этому диапазону, а
Drizzle Kit 0.31.10 — требованию Better Auth `>=0.31.4`. Эти пакеты **не входят**
в первый PR и не фиксируют способ соединения с PostgreSQL: согласно roadmap он
выбирается отдельно на этапе 2, а интеграция Better Auth повторно проверяется на
этапе 3.

## Проверенные первичные источники

- [Node.js releases](https://nodejs.org/en/about/previous-releases) и
  [официальный индекс дистрибутивов](https://nodejs.org/dist/index.json) — статус
  LTS и точная версия runtime;
- [React Router: installation](https://reactrouter.com/start/framework/installation),
  [middleware](https://reactrouter.com/how-to/middleware) и
  [официальные releases](https://github.com/remix-run/react-router/blob/main/CHANGELOG.md) —
  Framework Mode и middleware API;
- [Cloudflare: React Router](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/),
  [Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
  и [compatibility dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/) —
  Workers adapter, `nodejs_compat` и фиксация даты совместимости;
- [remix-i18next](https://sergiodxa.github.io/remix-i18next/) и его
  [официальный package manifest](https://github.com/sergiodxa/remix-i18next/blob/main/package.json) —
  SSR middleware и peer dependencies React Router 8/i18next;
- официальные package manifests из npm registry для точных `engines` и
  `peerDependencies` всех перечисленных версий;
- [pnpm installation](https://pnpm.io/installation) — установка и фиксация
  package manager;
- [Better Auth React Router integration](https://www.better-auth.com/docs/integrations/react-router)
  и [Drizzle adapter](https://www.better-auth.com/docs/adapters/drizzle) — только
  предварительная проверка будущих этапов.

## Воспроизводимые команды

После появления scaffold и lockfile единым контрактом локальной разработки и CI
будут команды:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Скрипт `dev` должен запускать приложение через Wrangler в локальном Workers
runtime. Скрипты `lint`, `typecheck`, `test` и `build` должны быть самостоятельными:
CI после `pnpm install --frozen-lockfile` запускает каждую из четырёх обязательных
проверок. На этапе 1 также нужно отдельно проверить SSR-ответы `/en`, `/ru` и
`/he` через локальный Workers runtime.

## Минимальные окружения

До отдельного решения о production-инфраструктуре нужны только:

1. **Local development** — Node.js 24.21.0, pnpm 12.3.4 и локальная эмуляция
   Workers через Wrangler; реальные Cloudflare, PostgreSQL, OAuth и translation
   credentials не требуются.
2. **GitHub Actions CI** — Linux runner, явно установленный Node.js 24.21.0 и
   pnpm 12.3.4, установка исключительно из lockfile и четыре проверки. CI не
   выполняет deploy и не использует production secrets.

Preview/staging и production в этап 0 или первый PR не входят.

## Границы первого PR (этап 1)

Первый PR содержит только:

- минимальный React Router 8 Framework Mode SSR scaffold для Cloudflare Workers;
- TypeScript и locale-маршруты `/en`, `/ru`, `/he`;
- UI localization через i18next/react-i18next/remix-i18next middleware, включая
  `lang`, LTR/RTL и зафиксированный fallback;
- тестовую инфраструктуру и тесты locale routing/LTR/RTL;
- скрипты `dev`, `lint`, `typecheck`, `test`, `build` и CI для четырёх проверок;
- документацию локального запуска и только реально необходимые переменные среды.

В первый PR не входят форумная бизнес-логика, схема или подключение PostgreSQL,
Drizzle, Better Auth, Google OAuth, перевод пользовательского контента, поиск,
модерация, deploy или production-инфраструктура. Для scaffold не требуется
принимать решения о схеме форума, поиске либо расширенной модерации.
