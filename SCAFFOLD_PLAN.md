# План scaffold (этап 0)

Проверено: **2026-09-09**. Этот документ фиксирует решения для этапа 1, но не
создаёт приложение и не проектирует production-инфраструктуру.

## Зафиксированный toolchain

| Компонент | Версия | Основание совместимости |
| --- | ---: | --- |
| Node.js | `24.21.0` | Текущая LTS-ветка; удовлетворяет минимуму `>=22.22.0` React Router и remix-i18next. |
| pnpm | `12.3.4` | Текущий стабильный релиз; версия должна быть записана в `packageManager` и совпадать локально и в CI. |
| create-cloudflare (C3) | `2.72.6` | Официальный генератор Cloudflare; его React Router integration вызывает `create-react-router@8.3.1` и добавляет Workers entrypoint, Wrangler и Cloudflare Vite plugin. |
| React Router packages | `8.3.1` | Одна версия для `react-router` и `@react-router/dev`; Framework Mode, SSR и Vite 8 поддерживаются официально. |
| React / React DOM | `19.3.0` | Одинаковая версия обоих пакетов; удовлетворяет peer dependency React Router `>=19.2.7`. |
| Vite | `8.2.2` | В диапазоне React Router `^7 || ^8` и Cloudflare Vite plugin `^6.1 || ^7 || ^8`. |
| TypeScript | `5.9.3` | Версия из актуального default template React Router; входит в диапазоны React Router и i18next, а также в `<6.1` typescript-eslint. |
| Wrangler | `4.130.0` | В диапазоне React Router `^4` и точно соответствует peer dependency Cloudflare Vite plugin. |
| Cloudflare Vite plugin | `1.54.6` | Актуальная официальная интеграция Workers с Vite; peer dependency требует Wrangler `^4.130.0`. |

В `package.json` этапа 1 версии верхнего уровня фиксируются без `^`/`~`, а
`engines.node` — как `24.21.0`. Файлы `.node-version` и `packageManager:
"pnpm@12.3.4"` становятся едиными источниками версий для разработчика и CI.
Lockfile `pnpm-lock.yaml` коммитится.

## Версии зависимостей первого PR

Runtime dependencies:

- `react@19.3.0`, `react-dom@19.3.0`, `react-router@8.3.1`;
- `i18next@26.4.2`, `react-i18next@17.0.13`, `remix-i18next@8.0.0`;
- `i18next-browser-languagedetector@8.2.1` для синхронной клиентской гидратации
  от серверного `<html lang>` по официальному примеру remix-i18next.

Development dependencies:

- `@react-router/dev@8.3.1`, `@cloudflare/vite-plugin@1.54.6`,
  `vite@8.2.2`, `typescript@5.9.3`, `wrangler@4.130.0`;
- `@types/node@22.20.2`, `@types/react@19.3.0`,
  `@types/react-dom@19.3.0`;
- `vitest@5.0.0`, `jsdom@30.0.1`,
  `@testing-library/react@16.3.3`, `@testing-library/jest-dom@7.0.1`,
  `@testing-library/user-event@14.6.7`;
- `eslint@10.10.0`, `@eslint/js@10.0.1`, `typescript-eslint@8.70.0`,
  `globals@17.12.0`.

Проверка метаданных npm и пробная резолюция этого полного набора не выявили
конфликтов peer dependencies. Существенные границы: remix-i18next 8 требует
React Router 8 и Node `>=22.22.0`; Vitest 5 допускает Node `^24`; jsdom 30 —
Node `^24.15.0`; typescript-eslint 8 — TypeScript `<6.1.0`.

pnpm 12 запрещает неразрешённые install scripts. Поэтому после генерации нужно
проверить фактический lockfile и явно разрешить только необходимые скрипты
`esbuild` и `workerd` через `allowBuilds` в `pnpm-workspace.yaml`. Это решение
проверено чистой установкой; не следует использовать интерактивный
`pnpm approve-builds` в CI.

## Проверенные guides, templates и generators

1. [React Router: Installation](https://reactrouter.com/start/framework/installation)
   рекомендует `create-react-router`, а
   [Deploying](https://reactrouter.com/start/framework/deploying) направляет
   Cloudflare-проекты к поддерживаемому Cloudflare template.
2. [Cloudflare: React Router](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/)
   прямо поддерживает React Router v8 с SSR через Cloudflare Vite plugin и
   рекомендует C3. Документация отдельно предупреждает, что SPA mode и
   prerendering с этим plugin не поддерживаются; они проекту не нужны.
3. Исходники официального
   [C3 React Router template](https://github.com/cloudflare/workers-sdk/tree/main/packages/create-cloudflare/templates/react-router)
   были сверены с опубликованным генератором: C3 берёт upstream default
   template, удаляет Node server adapter, добавляет `workers/app.ts`,
   `wrangler.jsonc`, Cloudflare Vite plugin и Workers-aware typecheck.
4. Актуальный
   [React Router default template](https://github.com/remix-run/react-router-templates/tree/main/default)
   подтверждает Framework Mode, SSR, TypeScript, Vite 8 и React 19. C3 template
   включает Tailwind и демонстрационную страницу; в этапе 1 они удаляются как
   не относящиеся к минимальному scaffold зависимости и контент.
5. [remix-i18next v8 README](https://github.com/sergiodxa/remix-i18next)
   явно назначает v8 для React Router v8 и описывает SSR middleware,
   `I18nextProvider`, передачу locale через router context, `lang`/`dir` и
   клиентскую гидратацию. Это именно нужная интеграция, а не вывод только из
   package manifest.
6. Версии и peer/engine ranges дополнительно сверены с опубликованными npm
   manifests соответствующих пакетов. Статус Node сверён с
   [официальным графиком релизов](https://nodejs.org/en/about/previous-releases),
   а установка pnpm — с [официальной документацией pnpm](https://pnpm.io/installation).

## Воспроизводимый порядок создания scaffold

Генератор запускается в пустом временном каталоге, чтобы не перезаписать
документы существующего репозитория. В команду C3 намеренно не передаётся
`--lang`: React Router template уже TypeScript, а фильтр C3 `2.72.6` считает
этот template несовместимым при явном `--lang=ts`.

```sh
pnpm create cloudflare@2.72.6 vico-forum-scaffold \
  --framework=react-router --platform=workers \
  --no-deploy --no-git --no-agents
```

После переноса минимально необходимых файлов в репозиторий этап 1 обязан:

1. заменить диапазоны генератора точными версиями из этого документа;
2. удалить Tailwind, welcome assets и Node-only остатки, если они появились;
3. добавить i18n, тестовую инфраструктуру, ESLint и четыре scripts;
4. создать lockfile установленной версией pnpm и выполнить чистую установку.

Команды разработчика:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

`typecheck` использует Cloudflare-последовательность
`wrangler types && react-router typegen && tsc -b`. `test` запускает Vitest
однократно (`vitest run`), а не watch mode. `preview` собирает приложение и
запускает локальный Workers-compatible preview. Deploy-команда и реальный
deploy не входят в первый PR.

CI использует те же Node `24.21.0` и pnpm `12.3.4`, затем выполняет:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Четыре проверки остаются отдельными обязательными шагами; кэш pnpm может
ускорять job, но не заменяет frozen-lockfile установку.

## Окружения этапа 1

- **Local development:** Node/pnpm указанной версии, Vite + Cloudflare plugin и
  локальный runtime workerd/Wrangler. Несекретные defaults находятся в
  `wrangler.jsonc`, локальные секреты — только в игнорируемом `.dev.vars`.
- **CI:** один Linux job с теми же Node/pnpm; unit/integration tests не требуют
  Cloudflare account, production secrets, PostgreSQL или OAuth credentials.

Preview/production Cloudflare, PostgreSQL, Google OAuth и translation providers
не настраиваются. Их решения принадлежат последующим этапам.

## Границы первого PR (этап 1)

Входит только:

- минимальный React Router v8 SSR scaffold для Workers с TypeScript;
- `/en`, `/ru`, `/he`, fallback `en`, SSR i18n middleware, `lang` и LTR/RTL;
- применимая до авторизации часть приоритета locale: URL → cookie →
  `Accept-Language` → `en`, с сохранением места `user.locale` в контракте;
- тесты locale routing и `lang`/`dir`;
- ESLint, typecheck, Vitest, production build и CI для этих четырёх проверок;
- краткие инструкции локального запуска и только реально нужные переменные.

Не входят бизнес-логика форума, схема/подключение БД, Better Auth, Google OAuth,
поиск, модерация, translation providers, deploy и production-инфраструктура.
Таким образом, scaffold не требует решений о форумной схеме или функциях
последующих этапов.
