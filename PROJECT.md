# PROJECT.md

## Проект

**«Форум для вайб кодеров»** — классический веб-форум для людей, которые создают программы и сайты с помощью ChatGPT, Codex, Cursor, Claude и других AI-инструментов.

Цель проекта — сохранять технические вопросы, обсуждения и проверенные решения в структурированном и пригодном для поиска виде.

## Для кого

Основная аудитория:

- новички в программировании и вайб-кодинге;
- практикующие разработчики;
- авторы технических вопросов и ответов;
- читатели, которые ищут готовое решение проблемы.

## Продуктовые принципы

- Форум остаётся классическим форумом, а не социальной лентой.
- Основная структура: **категория → раздел → тема → сообщения**.
- Публичный контент доступен без регистрации.
- Зарегистрированный пользователь может участвовать в обсуждениях.
- Автор темы может отметить проблему как решённую и выбрать лучший ответ.
- Технический контент должен удобно поддерживать текст, Markdown и код.
- AI-функции могут расширять форум, но не должны заменять его базовую механику.

## Базовые роли

- гость;
- пользователь;
- модератор;
- администратор.

Пользовательская авторизация планируется через Google OAuth.

## Техническая основа

Принятый baseline проекта:

- модульный монолит;
- React Router v8 Framework Mode + SSR + TypeScript;
- Cloudflare Workers;
- PostgreSQL + Drizzle ORM;
- Better Auth + Google OAuth.

## Мультиязычность и переводы

Этот раздел фиксирует только верхнеуровневый контракт. Полный source of truth для
мультиязычности, UI-переводов и перевода пользовательского контента —
[`TRANSLATION_ARCHITECTURE.md`](./TRANSLATION_ARCHITECTURE.md) и указанные в нём
detail documents.

1. Публичный UI использует generic `/:locale/*`. Locale — зарегистрированный canonical
   BCP-47 tag из runtime `LocaleRegistry`; hard-coded списка поддерживаемых языков в
   маршрутах, типах или i18n resources быть не должно.
2. English (`en`) — единственный canonical UI source. Runtime-локализация и SSR используют
   `i18next` + `react-i18next`; non-English UI resources могут поступать из local
   translation packs, persistent manual translations и machine translations с явным
   source/fallback/freshness contract.
3. Явный locale в URL authoritative. Когда locale segment отсутствует, приоритет
   negotiation: authenticated `user.locale` → cookie → `Accept-Language` → `en`.
   `lang`, `dir`, Unicode, разные scripts и locale-sensitive formatting должны работать
   без специальных условий для отдельных языков.
4. UI translation и перевод пользовательского контента — отдельные domain services.
   Ограничения конкретного translation provider не определяют locale universe Vico.
   Пользовательский перевод привязан к immutable revision исходника; при отсутствии или
   ошибке перевода показывается original current revision.
5. Translation providers, persistent storage, local packs, background jobs, plural/select
   rules, provider provenance, безопасность, fallback и caching реализуются только по
   контрактам из `TRANSLATION_ARCHITECTURE.md`.

## Разработка

Проект разрабатывает один человек с использованием ChatGPT и Codex.
