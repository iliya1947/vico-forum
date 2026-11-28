Этот файл фиксирует coordinator review технического плана самостоятельной задачи User AI / Vico Consultant.

# User AI technical plan — coordinator review

Дата: 28.11.2026.

## Итог

**PASS.**

Проверен полный `stages/user-ai/PLAN.md` на service head `684de7856db99123088e0edcd55a3327ecd92356` против:

- `main` `99b40480cb4d777298aafb1ffae7f28cf0c6085d`;
- `research/user-ai-product-concept.md`;
- D-25–D-32;
- `PROJECT.md`, `PROJECT_STATE.md` и профильных authorization, translation, UI/UX, Editor, Settings и database boundaries;
- актуальной официальной документации Cloudflare Workers AI и Neon pgvector.

Подтверждённых блокирующих дефектов технического плана не найдено.

## Product contract

План покрывает:

1. Vico Consultant как forum navigator/topic finder, а не универсальный технический советчик.
2. Authenticated-only inference с guest-visible auth-gate.
3. Один launcher/panel и контекстные входы Search/topic/Help/Editor.
4. До трёх релевантных тем, честный no-hit и обычный Search для широкой выдачи.
5. Помощь с section/category/Help/tags/title без autonomous publication.
6. Session-only consultation state без persistent personal memory.
7. Server-selected User → Moderator → Administrator disclosure layers с отдельными canonical permission checks.
8. Summary как естественную grounded capability, а не отдельный background product.
9. Graceful degradation до lexical Search, Help, Editor и обычной навигации.
10. Явный out-of-scope для Admin/Moderation AI, owner ChatGPT-control и autonomous writes.

## Техническая сверка

1. Canonical Search/Help/Forum readers и immutable revision/visibility boundaries переиспользуются; второй Forum/Search backend не создаётся.
2. Derived semantic index имеет generation/model/projection identity, invalidation для edit/hide/restore и повторную гидратацию current public state перед выдачей.
3. Disclosure не опирается на role name/model input и не заменяет нативную authorization.
4. Client consultation state очищается при finish/logout/account switch и не сохраняется между reload/new tab.
5. Provider не получает tools, arbitrary URL, hidden/private content, raw Editor body, credentials или authority.
6. Provider I/O не выполняется внутри DB transaction; publication/edit/hide не зависят от доступности AI.
7. Translation priority, account-wide admission, hard stop, no paid fallback и отключённые по умолчанию external bindings сохранены.
8. Repository/local-CI проверяет реальные auth/DB/revision boundaries с mock inference; реальные provider quality/account limits остаются Stage 6.

## Официальные данные

Проверено на 28.11.2026:

- Cloudflare model ID `@cf/google/embeddinggemma-2` существует, поддерживает retrieval prefixes и Matryoshka dimensions 128/256/512/768; выбранные 256 допустимы при одинаковой размерности query/document.
- `@cf/google/gemma-4-26b-a4b-it` существует и доступен через Workers AI.
- Тарифы плана совпадают с официальной таблицей: 154 neurons/M input для embedding, 9 091 input и 27 273 output neurons/M для generation.
- Free allocation — 10 000 neurons/day, reset 00:00 UTC; на Paid usage сверх allocation тарифицируется.
- Standard stateless Workers AI inference заявлен как zero-data-retention с документированными исключениями для stateful/logging/storage features.
- Neon поддерживает pgvector; реальная extension/ACL/account availability проверяется только в разрешённом Stage 6.

Источники:

- https://developers.cloudflare.com/workers-ai/models/embeddinggemma-2/
- https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/platform/data-usage/
- https://neon.com/docs/extensions/pgvector

## Непроверенное внешнее состояние

**Информация не проверена:** фактический Free/Paid режим аккаунта, общий остаток Workers AI/Neon, доступность безопасного account-wide cutoff, реальная языковая релевантность RU/HE/EN/code, deployed pgvector/ACL и provider latency. План корректно оставляет это Stage-6 gate и запрещает включение внешнего пути без доказательства $0 и quality acceptance.

## Режим поставки

Выбран **stacked delivery U1 → U6**.

Причина: этапы образуют одну зависимую вертикаль; промежуточные U1–U5 не дают законченного User AI v1 и не должны отдельно merge в `main`. Первый implementation PR строится от актуального `main`; каждый следующий — поверх принятого head предыдущего этапа. После каждого author self-check Business-Мира запускает применимые CI/checks и проводит coordinator checkpoint. После U6 итоговый head собирается в первый PR, затем whole-feature review Business-Миры, независимая техническая проверка Лёвы на том же stable head и merge владельцем.

## Следующий этап

Активировать **U1 — защищённый API и navigation без LLM** для Ады:

- live session/AccountState guards;
- current permission/disclosure snapshot;
- capability-filtered knowledge catalog;
- server-built canonical links;
- детерминированные navigation ответы;
- без launcher/dialog UI, semantic index, provider, migrations и U2+.

Ада выполняет source self-check и передаёт stable exact head Business-Мире, не запуская CI. CI/checks и coordinator checkpoint выполняет Business-Мира.
