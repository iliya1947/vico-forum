# PROJECT_HISTORY.md

Последнее обновление: 2026-09-22

## Назначение

Этот файл хранит значимую историю разработки Vico Forum: этапы, решения, обнаруженные
регрессии, временные меры и последующие исправления.

Он нужен для ответа на вопросы:

- почему текущее решение выглядит именно так;
- какое поведение было введено раньше и затем отменено или сужено;
- где corrective-review само создало ошибочную policy;
- каким PR ошибка была исправлена;
- какие известные исторические проблемы ещё не исправлены.

Это **не source of truth для текущего поведения**. Актуальные contracts находятся в
`PROJECT.md`, `ROADMAP.md`, `TRANSLATION_ARCHITECTURE.md`, `docs/translation/*`,
`docs/auth/AUTHORIZATION.md`, `docs/database/*` и `PROJECT_STATE.md`.

Git history и сами PR остаются первичным историческим источником. Этот файл — индекс,
который позволяет быстро восстановить цепочку без повторного расследования всей истории.

## Ключевые этапы

### 2026-09-09 — 2026-09-10: Stage 0–1

Создан React Router/Cloudflare Workers scaffold и реализован locale/i18n foundation.

Ключевые PR:

- [#4](https://github.com/iliya1947/vico-forum/pull/4) — завершение scaffold preparation;
- [#5](https://github.com/iliya1947/vico-forum/pull/5) — Stage 1A foundation;
- [#16](https://github.com/iliya1947/vico-forum/pull/16) — locale boundary;
- [#17](https://github.com/iliya1947/vico-forum/pull/17) — UI translation runtime;
- [#19](https://github.com/iliya1947/vico-forum/pull/19) — hardening locale/translation contracts.

PR #17 ввёл `sourceFingerprint`, stale classification/exclusion и runtime fallback.
PR #19 отдельно закрепил, что stale local translations являются допустимым состоянием:
full-pack CI не должен автоматически требовать нулевого числа stale keys.

### 2026-09-11: Stage 2–3

Добавлены PostgreSQL/Drizzle foundation, persistent `LocaleRegistry`, persistent UI
translation sources и compiled-bundle primitives.

Ключевые PR:

- [#20](https://github.com/iliya1947/vico-forum/pull/20)–[#26](https://github.com/iliya1947/vico-forum/pull/26) — Stage 2;
- [#30](https://github.com/iliya1947/vico-forum/pull/30)–[#35](https://github.com/iliya1947/vico-forum/pull/35) — Stage 3.

Stage 3C создавал compiler/persistence/cache primitives; active persisted-bundle publication
и SSR/runtime consumption были оставлены Stage 5.

### 2026-09-12 — 2026-09-14: pre-Stage-4 hardening

После Stage 3 был проведён большой hardening infrastructure/runtime boundaries.

Ключевые PR:

- [#37](https://github.com/iliya1947/vico-forum/pull/37) — pre-Stage-4 hardening contracts;
- [#38](https://github.com/iliya1947/vico-forum/pull/38) — canonical locale persistence;
- [#39](https://github.com/iliya1947/vico-forum/pull/39) — persistent translation resilience;
- [#40](https://github.com/iliya1947/vico-forum/pull/40) — stale-pack cleanup, позднее признанный regression;
- [#41](https://github.com/iliya1947/vico-forum/pull/41) — observability hardening;
- [#43](https://github.com/iliya1947/vico-forum/pull/43) — production privilege verifier;
- [#44](https://github.com/iliya1947/vico-forum/pull/44) — migration→runtime evidence;
- [#45](https://github.com/iliya1947/vico-forum/pull/45) — корректировка pre-release lifecycle;
- [#48](https://github.com/iliya1947/vico-forum/pull/48) — role-membership verifier correction;
- [#49](https://github.com/iliya1947/vico-forum/pull/49) — временный owner verification/no-op exception.

Часть решений этого периода позже была сужена или исправлена. Подробности — в corrective
ledger ниже.

**Последующая переоценка аудита от 2026-09-21:** историческая краткая метка PR #40 выше
оказалась шире подтверждённого вывода. Подтверждённой ошибочной коррекцией является введённый
zero-stale repository gate. Само удаление synthetic stale canary отдельно не доказано как
дефект; подробная граница сохранена в H-001.

### 2026-09-14 — 2026-09-15: Stage 4 forum core

Forum core был реализован в local/CI path:

- [#51](https://github.com/iliya1947/vico-forum/pull/51) — forum domain foundation;
- [#52](https://github.com/iliya1947/vico-forum/pull/52) — public SSR reading;
- [#53](https://github.com/iliya1947/vico-forum/pull/53)–[#57](https://github.com/iliya1947/vico-forum/pull/57) — Better Auth runtime, participation, Markdown и anti-spam;
- [#58](https://github.com/iliya1947/vico-forum/pull/58) — solved/best answer;
- [#59](https://github.com/iliya1947/vico-forum/pull/59)–[#61](https://github.com/iliya1947/vico-forum/pull/61) — dynamic authorization foundation/integration.

PR #61 завершил Stage 4, но одновременно ввёл слишком широкую authorization failure
semantics; эта часть позже исправлена PR #76.

### 2026-09-15 — 2026-09-16: Stage 5A

Реализована значительная часть UI translation generation/runtime path:

- [#63](https://github.com/iliya1947/vico-forum/pull/63) — exact-locale generation planning;
- [#66](https://github.com/iliya1947/vico-forum/pull/66) — provider-neutral routing/validation;
- [#67](https://github.com/iliya1947/vico-forum/pull/67) — durable tasks/dispatcher;
- [#68](https://github.com/iliya1947/vico-forum/pull/68) — claim/lease/stale preflight;
- [#69](https://github.com/iliya1947/vico-forum/pull/69) — lifecycle corrections;
- [#70](https://github.com/iliya1947/vico-forum/pull/70) — durable enqueue-failure recovery evidence;
- [#71](https://github.com/iliya1947/vico-forum/pull/71) — conditional publication;
- [#72](https://github.com/iliya1947/vico-forum/pull/72) — durable generation ordering/publication fencing;
- [#73](https://github.com/iliya1947/vico-forum/pull/73) — provider-neutral execution pipeline;
- [#74](https://github.com/iliya1947/vico-forum/pull/74) — atomic persisted bundle publication;
- [#75](https://github.com/iliya1947/vico-forum/pull/75) — persisted bundle runtime reads.

## Corrective ledger

### H-001 — stale local translation policy

**Исходный contract**

PR [#17](https://github.com/iliya1947/vico-forum/pull/17) реализовал stale classification:
fingerprint mismatch исключает local value из current bundle, после чего fallback продолжается.

PR [#19](https://github.com/iliya1947/vico-forum/pull/19) явно закрепил, что stale packs
допустимы и full-pack CI не должен фиксировать точный/нулевой список stale keys.

**Регрессия**

PR [#40](https://github.com/iliya1947/vico-forum/pull/40) удалил intentional stale entry из
runtime-owned `manualTranslationPacks` и добавил test, требующий
`validateTranslationPacks(manualTranslationPacks) === { staleKeys: {} }`.

Это фактически ввело zero-stale repository gate без отдельного решения о strict stale-CI и
убрало runtime-owned intentional stale canary, который проходил реальный stale/fallback path.

Тот же PR обновил `PROJECT_STATE.md` как будто stale-pack cleanup и отсутствие stale keys
были запланированным итоговым состоянием. Это исторически исказило provenance решения:
исходный contract #17/#19, наоборот, намеренно разрешал stale real-pack entries.

**Статус**

На 2026-09-18 regression остаётся в коде и отмечена в `PROJECT_STATE.md`.

Текущий source of truth:
`docs/translation/UI_TRANSLATION.md` и `docs/translation/STORAGE_AND_VERSIONING.md`.

**Последующая переоценка аудита от 2026-09-21**

Приведённая выше запись сохраняет формулировки и выводы, зафиксированные при создании
`PROJECT_HISTORY.md`. Последующий полный аудит сузил подтверждённый regression до zero-stale
repository gate: отдельного решения о strict stale-CI найдено не было. Удаление synthetic stale
canary остаётся историческим фактом, но отдельно не доказано как дефект; test-local fixtures
продолжили проверять stale exclusion/fallback path. Строгое documentation laundering или
backdating также не подтверждено. Эта переоценка не переписывает то, что было записано раньше,
а явно отделяет более поздний вывод аудита.

**Последующее состояние от 2026-09-22:** PR [#81](https://github.com/iliya1947/vico-forum/pull/81)
исправил подтверждённую regression: exact zero-stale equality gate удалён, а full-pack validation
снова допускает stale entries. Stale runtime classification/exclusion/fallback сохранены.
Удаление synthetic stale canary не отменялось и по-прежнему не классифицируется как отдельный
доказанный дефект.

---

### H-002 — pre-Stage-4 staging blocker: superseded process policy

PR [#37](https://github.com/iliya1947/vico-forum/pull/37) после audit превратил отдельную
staging topology и ряд infrastructure hardening items в обязательные pre-Stage-4 blockers.

Это не implementation defect уровня H-001/H-003/H-005/H-006. Это process/architecture
решение, которое последующий review признал избыточным для solo pre-release product-first
маршрута: часть hardening была полезной, но отдельный staging и real-infrastructure acceptance
не должны были безусловно блокировать local/CI feature development до появления соответствующей
external/private-data границы.

PR [#45](https://github.com/iliya1947/vico-forum/pull/45) пересмотрел lifecycle:
отдельный staging перестал быть pre-Stage-4 blocker, а текущая deployed среда могла временно
использоваться как pre-release production candidate с test/pre-release data. Preview/private
write boundary при этом осталась обязательной отдельной защитой.

Статус: исходная process policy superseded, а не runtime regression.

Текущий source of truth: `PROJECT.md`, `ROADMAP.md`, `docs/database/HYPERDRIVE.md`.

---

### H-003 — Workers observability query redaction

PR [#41](https://github.com/iliya1947/vico-forum/pull/41) пытался включить query-string
redaction, но configuration path был записан неверно для pinned Wrangler `4.130.0`.

Проблема была обнаружена позже по Wrangler warning и exact-version config contract.

PR [#64](https://github.com/iliya1947/vico-forum/pull/64) перенёс
`redact_query_string` на поддерживаемый уровень `observability.redact_query_string`.

PR #41 также преждевременно записал в `PROJECT_STATE.md`, что query-string redaction уже
работает, хотя pinned Wrangler фактически игнорировал неподдерживаемую вложенность. После
PR #64 runtime догнал ранее записанное documentation assertion.

Статус: runtime/config исправлены; историческое преждевременное утверждение сохранено здесь.

---

### H-004 — production privilege verifier assumptions

PR [#43](https://github.com/iliya1947/vico-forum/pull/43) добавил production privilege
verifier. Последующая проверка показала, что часть membership assumptions не соответствовала
фактической PostgreSQL 17 creator-role semantics и текущей pre-release topology.

PR [#48](https://github.com/iliya1947/vico-forum/pull/48) выровнял membership verification:
разрешил только узко определённые owner inbound memberships и сохранил запрет inheritance/
`SET ROLE`.

Отдельно оказалось, что текущая pre-release migration connection фактически использовала
database owner. PR [#49](https://github.com/iliya1947/vico-forum/pull/49) ввёл временное
исключение только для owner verification/no-op evidence и preflight, запрещающий применять
pending migrations в этом режиме.

Статус: verifier corrections исправлены; owner exception остаётся временным и должен быть
удалён до следующего настоящего external schema rollout.

Текущий source of truth: `docs/database/MIGRATIONS.md`.

---

### H-005 — live migration-evidence verification в обычном PR CI

PR [#44](https://github.com/iliya1947/vico-forum/pull/44) правильно создал repository-owned
migration evidence contract и live verifier, но одновременно подключил live GitHub Actions API
verification к каждому обычному `pull_request` CI.

Это смешало local/repository correctness checks с external schema-dependent rollout evidence:
обычный feature PR стал зависеть от актуального production migration workflow run даже когда
никакого external runtime rollout не выполнялось.

PR [#76](https://github.com/iliya1947/vico-forum/pull/76) убрал live remote verifier из
обычного PR CI, сохранив:

- repository-local migration history checks;
- static/unit evidence contract;
- evidence manifest;
- live verifier для будущей фактической rollout boundary.

Статус: исправлено.

Текущий source of truth: `docs/database/MIGRATIONS.md`.

---

### H-006 — catch-all authorization failure semantics

PR [#61](https://github.com/iliya1947/vico-forum/pull/61) завершил Stage 4 authorization
integration, но одновременно ввёл broad catch-all failure semantics.

Часть поведения существовала уже в первом commit PR #61 (`08572ef`):
`requireForumPermission()` и `solutionScope()` превращали любую resolver exception в
controlled `503`, а generic fallback management mutation также трактовал неизвестную ошибку
как infrastructure `503`.

Дальнейшие commits внутри того же PR расширили эту модель:

- `0651435` добавил generic `503` mapping для authorization resolver failure в management
  permission check;
- после independent Codex review `20642f7` стал подавлять любую ошибку optional header
  permission lookup и скрывать management link;
- после следующего Codex review `0d38633` распространил такую presentation degradation на
  section/topic loaders, сохраняя public read и скрывая write/solution controls.

Таким образом broad policy не была целиком создана review: она появилась в исходной
реализации #61 и затем была расширена corrective-review внутри того же PR.

До PR #61 отдельного architecture contract, требующего интерпретировать произвольную
authorization resolver error как availability failure, не было. Затем это поведение было
записано как текущее состояние проекта.

PR [#76](https://github.com/iliya1947/vico-forum/pull/76) заменил это на typed
`AuthorizationUnavailableError` boundary:

- только классифицированные PostgreSQL/Hyperdrive availability/connection/query-timeout failures
  считаются authorization-unavailable;
- protected operations могут вернуть controlled `503` только для этой категории;
- optional controls деградируют только для этой категории;
- unexpected errors проходят обычный application error handling/observability.

Статус: исправлено.

Текущий source of truth: `docs/auth/AUTHORIZATION.md`.

---

### H-007 — translation task lifecycle semantics

PR [#68](https://github.com/iliya1947/vico-forum/pull/68) ввёл claim/lease/stale foundation
для `JOB-03`.

Последующий review выявил проблемы lifecycle semantics. PR
[#69](https://github.com/iliya1947/vico-forum/pull/69) исправил их:

- lease/stale lifecycle переведён на PostgreSQL-owned `statement_timestamp()`;
- duplicate planning перестал сбрасывать/продлевать live processing claim;
- stale identity может быть reactivated только новым eligible generation plan;
- duplicate Queue delivery stale task остаётся terminal;
- planner и consumer используют единое locale eligibility rule.

Внутри того же corrective PR #69 был ещё один implementation regression: helper временно
потерял обязательный `return row`. Он был восстановлен до merge commit
`f6522c4750f9` (`fix(stage-5a): restore translation task row return`).

Статус: lifecycle semantics и missing-return regression исправлены до продолжения Stage 5A.

Текущий source of truth: `docs/translation/PROVIDERS_AND_JOBS.md`.

---

### H-008 — ordering разных generation identities

Во время работы над PR [#71](https://github.com/iliya1947/vico-forum/pull/71) был обнаружен
дефект generation supersession: разные stable identities одного logical UI unit нельзя
надёжно упорядочивать через fingerprints/timestamps/лексическое сравнение.

Опасный вариант был удалён до merge PR #71. Сам PR #71 явно оставил authoritative ordering
между разными identities вне scope.

PR [#72](https://github.com/iliya1947/vico-forum/pull/72) затем добавил durable monotonic
generation numbers и отдельный generation head с PostgreSQL row-lock serialization; publication
fenced по current generation.

Внутри PR #71 также повторился отдельный missing-return regression в task-store helper.
Он был исправлен до merge commit `dcf70d8d18bb`
(`fix(stage-5a): restore translation task row return`).

Статус: unsafe supersession и missing-return regression не попали в `main`; durable
replacement ordering реализован PR #72.

**Последующая переоценка аудита от 2026-09-21:** ordering/fencing из PR #72 остаётся
обоснованным исправлением race condition. Одновременно review PR #72 обнаружил остаточный
fresh-plan gap: последовательность identities `A → B → A` не может снова сделать прежнюю stale A
актуальной. В проверенной цепочке PR #72–#77 этот gap не был исправлен. Текущее состояние и
целевой contract описаны в `PROJECT_STATE.md` и `docs/translation/PROVIDERS_AND_JOBS.md`.

---

### H-009 — accidental unrelated PROJECT_STATE rewrites during PR work

В PR [#73](https://github.com/iliya1947/vico-forum/pull/73) full-file API replacement при
синхронизации `PROJECT_STATE.md` случайно изменил несвязанный Stage 4 текст. Diff review
обнаружил изменение до merge, и исходная формулировка была восстановлена.

В PR [#74](https://github.com/iliya1947/vico-forum/pull/74) проблема повторилась и потребовала
нескольких последовательных corrections, чтобы точно восстановить unrelated wording:

- `44b106a98f9b` — `docs: restore unrelated project state wording`;
- `7351b4ab8fde` — `docs: restore exact project state wording`;
- `dc231a79545f` — `docs: restore exact original project state wording`.

Runtime behavior в этих эпизодах не менялся, но история показывает, что full-file
documentation replacement нельзя считать безопасным только потому, что intended изменение
маленькое: diff должен проверяться целиком, включая unrelated sections.

Статус: оба случая исправлены до merge соответствующих PR.

---

### H-010 — PROJECT_STATE смешивал state, history и policy

К 2026-09-18 `PROJECT_STATE.md` накопил:

- текущее состояние;
- историю PR/commit/CI;
- architecture/rollout rules из других source-of-truth документов;
- старые corrective decisions;
- будущий roadmap.

Из-за этого historical corrective behavior могло выглядеть как заранее принятая architecture
policy. Это особенно мешало анализу H-001, H-005 и H-006.

Первый rebuild внутри PR [#77](https://github.com/iliya1947/vico-forum/pull/77)
(commit `bec8226573ba`) сократил `PROJECT_STATE.md`, удалив накопленную историческую часть,
но ещё не создал отдельного места для её сохранения. Это сделало provenance старых ошибок
существенно менее доступным и было обнаружено пользовательским review до merge.

После этого тот же PR был исправлен:

- `af7825bf7c51` добавил `PROJECT_HISTORY.md`;
- `95adc2fa2a12` связал history из `PROJECT_STATE.md`;
- `7b9c6721f139` добавил history в README documentation index;
- последующие review commits уточнили provenance и вернули пропущенные corrective episodes.

Итоговая ответственность PR #77:

- `PROJECT_STATE.md` — только актуальное состояние, текущие ограничения и ближайший маршрут;
- `PROJECT_HISTORY.md` — значимая история решений, регрессий и corrections;
- постоянные contracts остаются в своих source-of-truth документах.

Статус: первоначальная потеря доступной history внутри PR исправлена до merge; сам PR ещё не
является merged history на момент этой записи.

---

### H-011 — persisted-bundle runtime reads и durable convergence

PR [#75](https://github.com/iliya1947/vico-forum/pull/75) добавил runtime-чтение проверенных
persisted UI bundles. Review того же PR выявил, что безопасный miss/fallback при obsolete
format/deploy identity не сопровождается durable refresh/convergence path. Последующий аудит от
2026-09-21 подтвердил эту историческую связь; в проверенной цепочке PR #75–#77 gap не был
исправлен.

Подробное текущее поведение и статус ограничения находятся в `PROJECT_STATE.md`, а действующий
contract — в `docs/translation/STORAGE_AND_VERSIONING.md`. Эта запись не выбирает механизм
исправления.

## Важное свойство исторических записей

Зелёный CI подтверждает проверяемые code/test/build contracts, но не доказывает, что
архитектурная policy была выбрана правильно.

PR #40, #44 и #61 прошли CI, однако их проблемы были semantic/policy errors и обнаружились
только при последующем сравнении реализации с исходными архитектурными границами и историей
решений.

Поэтому при расследовании похожих случаев нужно смотреть не только на финальный
`PROJECT_STATE.md` и CI, но и на:

1. source-of-truth contract до изменения;
2. PR description и commits, где поведение впервые появилось;
3. последующие corrective PR;
4. текущий source-of-truth после correction.
