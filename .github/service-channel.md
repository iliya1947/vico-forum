# Service channel — edit own topic title

## 2026-11-18 — задача принята из #300

Источник назначения: служебный PR #300, передача Мире от владельца.

Подтверждённый scope: отдельный pre-release блок — редактирование заголовка собственной темы обычным автором.

Границы:
- новый отдельный служебный PR;
- #320 не изменять и не смешивать с этой задачей;
- #331 завершён и не используется как канал новой задачи;
- это не admin edit и не source-locale correction;
- реализацию до готовности канала и технического планирования не начинать.

Мира сверила актуальный main, полностью перечитала AGENTS.md, PROJECT.md, PROJECT_STATE.md, ROADMAP.md, TRANSLATION_ARCHITECTURE.md, docs/translation/CONTENT_TRANSLATION.md и docs/auth/AUTHORIZATION.md.

Начальный scope зафиксирован в TOPIC_TITLE_EDIT_SERVICE_PLAN.md.

Следующий участник: Лёва / Codex-6.1 Sol. Его задача — подготовить полный технический план реализации по актуальному main без начала implementation.

## 2026-11-18 — технический план Лёвы подготовлен; возврат Мире

Проверенный main: `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.
В TOPIC_TITLE_EDIT_SERVICE_PLAN.md добавлены полное исследование текущего title path,
предлагаемые permission/write/UI/failure/concurrency/translation контракты,
последовательность implementation и acceptance matrix.

Подтверждено: immutable title revisions/CAS/current translation guards существуют;
готового own-title editor/route capability нет. Existing `forum.post.editOwn` и
source-locale correction не разрешают переименование темы.
Новая content architecture и dependencies не требуются.

Технические эскалации Мире:
- E1: новый `forum.topic.title.editOwn` требует catalog/default-grant согласования и
  forward migration для закрытого `authz_permissions_catalog_check`;
- E2: применение существующего `posts.edit` к заголовкам требует явного согласования
  расширения действующего restriction contract; рекомендация и границы — в плане.

Это предложения, не утверждённые изменения. Реализация, миграции и внешние действия
не выполнялись. Future implementation tests/CI/browser не запускались и не заявлены PASS.
Следующее назначение: Мира проводит scope/fit review и фиксирует решения по E1/E2;
до этого Лира не активируется. После принятия — отдельный implementation PR.
#320 и #331 не изменялись.


## 2026-11-18 — Мира: scope/fit review технического плана

- E1 ACCEPT: новый `forum.topic.title.editOwn` + forward migration для catalog CHECK/default grants — необходимая текущая часть функции, не future groundwork.
- Отдельный 5s title-edit cooldown REJECT: существующий published-post edit не имеет такого edit cooldown; новая политика не обоснована текущей задачей.
- Recovery/test scope сокращён до необходимых инвариантов: permission/ownership, immutable revision + CAS, translation currentness, relevant changed-path races и реальный browser flow; отдельная title recovery/idempotency subsystem не нужна.
- E2 остаётся единственным owner decision: применять ли существующий user-measure restriction `posts.edit` к редактированию заголовка своей темы. Рекомендация Миры — да, как часть Own content, без нового restriction key.
- Лира не активирована до решения E2.


## 2026-11-18 — решение владельца E2 и передача Лире

Владелец выбрал вариант E2 = да: existing `posts.edit` restriction распространяется на редактирование заголовка собственной темы как на Own content. Новый restriction key не создаётся.

Технический план принят с overrides Миры: E1 включён; отдельный title-edit cooldown исключён; отдельная recovery/idempotency subsystem не создаётся.

Следующий участник: Лира / ChatGPT-6. Реализовать bounded scope в отдельном implementation PR от актуального `main`, выполнить применимые проверки и зафиксировать stable implementation head. После этого STOP и возврат Мире на coordinator whole-PR review.
