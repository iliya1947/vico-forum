# План scaffold (этап 0 → этап 1)

Проверено/синхронизировано: **2026-09-10**.

Этот документ фиксирует executable plan для Stage 1 из `ROADMAP.md`. Source of truth
мультиязычности — `TRANSLATION_ARCHITECTURE.md`; этот файл не повторяет всю архитектуру,
а переводит Stage 1 contracts в конкретные scaffold-задачи.

## Зафиксированный toolchain

| Компонент | Версия | Основание совместимости |
| --- | ---: | --- |
| Node.js | `24.21.0` | Зафиксирован Stage 0; удовлетворяет требованиям React Router 8.3.1 и test toolchain. |
| pnpm | `12.3.4` | Зафиксирован Stage 0; версия записывается в `packageManager` и совпадает локально/CI. |
| create-cloudflare (C3) | `2.72.6` | Официальный генератор Cloudflare для React Router/Workers scaffold. |
| React Router packages | `8.3.1` | Framework Mode + SSR; locale boundary использует server loader по exact-version middleware contract. |
| React / React DOM | `19.3.0` | Одинаковая версия обоих пакетов; зафиксировано Stage 0. |
| Vite | `8.2.2` | Совместимый диапазон React Router/Cloudflare Vite plugin, проверенный Stage 0. |
| TypeScript | `5.9.3` | Зафиксирован Stage 0; используется для app + generated route/Workers types. |
| Wrangler | `4.130.0` | Зафиксирован Stage 0 и согласован с Cloudflare Vite plugin. |
| Cloudflare Vite plugin | `1.54.6` | Зафиксирован Stage 0 для Workers SSR/Vite integration. |

В `package.json` Stage 1 верхнеуровневые версии фиксируются без `^`/`~`.
`engines.node = "24.21.0"`, `.node-version` и `packageManager: "pnpm@12.3.4"`
используются локально и в CI. `pnpm-lock.yaml` коммитится.

## Зависимости Stage 1

Runtime dependencies:

- `react@19.3.0`;
- `react-dom@19.3.0`;
- `react-router@8.3.1`;
- `i18next@26.4.2`;
- `react-i18next@17.0.13`.

`remix-i18next` и `i18next-browser-languagedetector` **не входят** в Stage 1 baseline.
Locale resolution принадлежит Vico `LocaleResolver`/`LocaleRegistry`, а client hydration
получает уже разрешённый server snapshot и не выполняет повторную browser detection.

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

Exact-version i18n/RR facts и официальные source links зафиксированы в
`docs/translation/RESEARCH.md`. Архитектурная коррекция меняет i18n dependencies, но не
отменяет Stage 0 toolchain compatibility work.

pnpm 12 запрещает неразрешённые install scripts. После генерации нужно проверить
фактический lockfile и явно разрешить только необходимые scripts `esbuild` и `workerd`
через `allowBuilds` в `pnpm-workspace.yaml`; интерактивный `pnpm approve-builds` в CI не
используется.

## Проверенные guides/generators

1. React Router Framework Mode и Cloudflare deployment используют официальный
   Cloudflare React Router template/integration.
2. Cloudflare C3 `2.72.6` генерирует React Router Workers scaffold; приложение создаётся
   во временном каталоге, чтобы не перезаписать документы репозитория.
3. React Router `8.3.1` server middleware на hydrated client navigation выполняется только
   при server data request; route с locale boundary должен иметь server `loader`.
4. `i18next@26.4.2`: defaults `fallbackLng=["dev"]`, `supportedLngs=false`, `load="all"`.
   Vico переопределяет `load: "currentOnly"` и передаёт explicit registry fallback chain,
   поэтому default `dev`/implicit locale reduction не используются.
5. `react-i18next@17.0.13` используется с request-specific i18next instance и одинаковым
   server/client initial resource snapshot.
6. Причины отказа от `remix-i18next` как locale source of truth и все exact-version refs
   находятся в `docs/translation/RESEARCH.md`.

## Воспроизводимое создание scaffold

Генератор запускается в пустом временном каталоге:

```sh
pnpm create cloudflare@2.72.6 vico-forum-scaffold \
  --framework=react-router --platform=workers \
  --no-deploy --no-git --no-agents
```

После переноса минимально необходимых файлов Stage 1 обязан:

1. заменить диапазоны generator dependencies точными версиями этого документа;
2. удалить Tailwind/welcome assets/Node-only остатки, если они появились и не нужны;
3. добавить locale/i18n foundation по разделу ниже;
4. добавить tests, ESLint и scripts;
5. создать lockfile нужной pnpm version и выполнить frozen clean install.

## Locale/i18n foundation Stage 1

### 1. Routing и LocaleRegistry

- public UI route — generic `/:locale/*`;
- technical routes (`/api/*`, `/api/auth/*`, `/api/i18n/*`) не помещаются под `/:locale`;
- route, владеющий locale boundary, экспортирует server `loader`;
- `LocaleRegistry` — abstraction с config/in-memory adapter Stage 1;
- canonical `en` — bootstrap active locale;
- Stage 1 может иметь seed/test registry data (`ru`, `he` и другие), но это данные, не
  `type Locale = ...`, не `supportedLocales = [...] as const` и не resource-map ceiling;
- test должен доказать, что дополнительный locale fixture добавляется через registry data
  без изменения app routes/core i18n code.

Минимальная registry metadata Stage 1:

```text
tag
translationStatus
publicationStatus
direction
fallbackChain
aliases / matchTags
presentation metadata
```

Cycle/self-reference/duplicate fallback и ambiguous alias должны валидироваться.

### 2. LocaleResolver

Explicit `/:locale` authoritative:

```text
URL candidate
→ BCP-47 canonicalization
→ registry lookup
→ active/direct-publication policy
→ locale context
```

Unknown/inactive explicit locale в Stage 1 возвращает `404` и **не** проваливается к
cookie/header negotiation. Canonicalizable case/alias representation активного locale
redirect-ится на canonical URL.

Без locale segment (`/`) negotiation:

```text
authenticated user.locale (hook reserved; фактическая auth в Stage 4)
→ cookie
→ Accept-Language
→ en
```

До Stage 4 authenticated source отсутствует, но public contract/typed boundary не меняется.
`Accept-Language` учитывает q-values; `q=0` не выбирается. Wildcard не выбирает случайный
locale: если конкретного match нет, default — `en`.

### 3. Formatting/direction/Unicode

Locale context содержит translation locale, direction и явный formatting context boundary.
Timezone не выводится из языка. Initial SSR и hydration используют одинаковые
locale-sensitive formatting inputs.

Document root:

```html
<html lang="..." dir="ltr|rtl">
```

CSS scaffold использует logical properties там, где направление имеет значение.
Никаких `if (locale === "he")`; Unicode strings не ограничиваются Latin-only validation.

### 4. Canonical English catalog

Создать canonical English catalog, разбитый по минимальным namespaces/features.
English catalog — source of truth для UI keys и TypeScript typing.

Минимальный message descriptor поддерживает:

```text
namespace
key
source
description/context
placeholders
messageKind
protectedTerms
```

Stage 1 не обязан реализовывать machine plural generation, но catalog contract не должен
закрывать эту возможность.

### 5. Local translation packs

Реализовать `LocalTranslationSource` как partial manual source за adapter boundary.

Требования:

- local directory не активирует locale;
- missing key допустим для partial pack;
- unknown canonical key/namespace — validation error;
- placeholders/structure валидируются;
- local value связан с canonical `sourceFingerprint`;
- fingerprint mismatch = stale: value исключается из current bundle, fallback продолжается;
- tooling не обновляет fingerprint старого translation автоматически только из-за нового
  English source.

Конкретный file format остаётся implementation detail `LocalTranslationSource`. Если для
Stage 1 выбирается JSON + sidecar manifest или эквивалентный формат, остальной app code не
должен зависеть от него.

### 6. TranslationResourceLoader

Stage 1 source set:

```text
LocalTranslationSource
CanonicalEnglishSource
```

Persistent manual/machine sources подключаются в Stage 3 без изменения loader contract.

Логический результат:

```text
load(locale, namespaces)
→ resourcesByLocale
→ fallbackLocales
→ bundleVersions/metadata
```

Vico формирует locale chain:

```text
target → explicit registry fallbacks → en
```

Resources разных locale **не flatten-ятся** друг в друга.

### 7. i18next + SSR/hydration

На каждый SSR request создаётся отдельный i18next instance.

Baseline:

```text
lng: targetLocale
supportedLngs: false
load: "currentOnly"
fallbackLng: explicit registry fallback locales ending in en
```

Для canonical `en` fallback отключается, чтобы default `dev` не участвовал.

Client получает тот же:

```text
resolved locale
fallback locales
initial resources by locale
resource/bundle metadata
formatting inputs
```

и не запускает повторный browser language detection.

### 8. TranslationValidator Stage 1

Stage 1 validator покрывает canonical/local inputs:

```text
known key/namespace
placeholder set
plural/select structure when present
forbidden markup
maximum value constraints
stale fingerprint classification
```

Provider-output validation расширяется в Stage 5.

## Testing Stage 1

Автоматически проверить минимум:

1. generic locale route с locale fixture, не зашитым в app core;
2. bootstrap `en`;
3. root negotiation: cookie, `Accept-Language`, q-values, wildcard default;
4. explicit unknown/inactive locale → 404 без cookie/header fallback;
5. alias/case canonical redirect;
6. LTR и RTL через registry metadata;
7. explicit fallback chain без implicit locale reduction;
8. partial local pack priority;
9. stale local translation исключается и English/registry fallback продолжает работать;
10. invalid local placeholders/unknown key отклоняются validation;
11. SSR HTML `lang`/`dir` и одинаковый hydration resource snapshot;
12. locale-sensitive formatting inputs не зависят от разных server/browser defaults.

Тестовые locale (`ru`, `he`, `ka` или другие) являются fixtures/registry data, а не
закрытым списком поддерживаемых языков.

## Команды разработчика

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

`typecheck`:

```sh
wrangler types && react-router typegen && tsc -b
```

`test` запускает `vitest run`. `preview` собирает приложение и запускает локальный
Workers-compatible preview. Deploy не входит в Stage 1.

CI использует Node `24.21.0` и pnpm `12.3.4`:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Окружения Stage 1

- **Local:** Node/pnpm exact versions, Vite + Cloudflare plugin, local workerd/Wrangler.
  Несекретные defaults — `wrangler.jsonc`, local secrets — только ignored `.dev.vars`.
- **CI:** Linux job с теми же Node/pnpm; tests не требуют Cloudflare account, PostgreSQL,
  OAuth или translation-provider credentials.

Preview/production Cloudflare, PostgreSQL, Google OAuth, Queues и translation providers
не настраиваются в Stage 1.

## Границы первого implementation PR

Входит:

- минимальный React Router v8 SSR Workers scaffold;
- generic locale routing, `LocaleRegistry`, `LocaleResolver`, server locale loader;
- canonical English catalog + typed keys;
- partial local translation source + fingerprint/validation;
- `TranslationResourceLoader`;
- request-scoped i18next + identical hydration snapshot;
- `lang`/`dir`, LTR/RTL, formatting context, Unicode-safe foundation;
- locale/i18n tests;
- ESLint, typecheck, Vitest, production build и CI;
- локальные инструкции и реально необходимые variables.

Не входит:

- PostgreSQL/Drizzle persistence;
- Better Auth/Google OAuth;
- persistent manual/machine UI translation store;
- Cloudflare/Google translation providers;
- Cloudflare Queues/translation jobs;
- forum business logic;
- user-content translation;
- deploy/production infrastructure.

Stage 1 реализует только translation component boundaries, назначенные Stage 1 в
`ROADMAP.md`; остальные component IDs сохраняются для последующих этапов через
`TRANSLATION_ARCHITECTURE.md` traceability.
