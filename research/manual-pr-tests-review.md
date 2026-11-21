# #362 — независимая проверка Лёвы

## Вердикт

**HOLD — два подтверждённых current-scope finding [P2].**

- Проверенный implementation head: `3387132aeed815fb93cf3094c3d70f5e343ce998`.
- Base main: `6f50d6ad549f816e091282012d6201fa03291b82`.
- Scope: весь diff #362 — 19 workflow-файлов; управление событиями, все jobs, labels/permissions, сохранение path-фильтров и резервный dispatch.
- #363 `b58423df68f05707142fe5c5335fec0db0e1f319` проверен только как зависимая docs-ступень: base совпадает с #362, diff ограничен AGENTS/AGENT_LOGIC_ERRORS/PROJECT_STATE. Отдельный docs PASS не выдан.

## MANUAL-CI-LEVA-01 [P2] — три AP-10 job обходят команду run:acceptance

В [ap10-browser.yml:54](https://github.com/iliya1947/vico-forum/blob/3387132aeed815fb93cf3094c3d70f5e343ce998/.github/workflows/ap10-browser.yml#L54) условие добавлено только в `browser`. Остальные sibling jobs — `history_browser`, `settings_browser`, `settings_administrator_browser` — не имеют ни job-level условия, ни `needs` на gated job; их шаги выполняют полноценные PG/Worker/Chromium acceptance.

Воспроизводимый путь: PR меняет `db/forum-repository.ts` (входит в сохранённый AP-10 paths) → агент добавляет `run:ci`, либо кто-либо добавляет обычную `needs-review` → событие `pull_request:labeled` запускает workflow → `browser` пропускается, три остальных job запускаются. Снятие метки управляющим workflow не меняет уже полученное событие. До #362 `labeled` вообще не входил в default PR event types, поэтому это новый путь незапрошенного запуска acceptance.

Диагностика разобрала YAML всех изменённых workflow и каждый job. AP-10 — единственный acceptance workflow с пропущенными gates. Локальная матрица при совпадающем PR diff:

| Метка | Допущенные AP-10 jobs |
| --- | --- |
| `run:ci` | history_browser, settings_browser, settings_administrator_browser |
| `needs-review` | те же три |
| `run:acceptance` | все четыре |

Это вывод из реальной конфигурации и [документированной семантики независимых jobs и job-level if](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idif), не заявленный GitHub execution.

Исправление должно применить тот же acceptance admission ко всем четырём job, сохраняя разрешённый dispatch. При повторной проверке: `run:ci`/посторонняя метка → ноль acceptance jobs; `run:acceptance` → четыре AP-10 job при совпадении paths; open/synchronize → отсутствие PR test runs.

## MANUAL-CI-LEVA-02 [P2] — основной CI не поддерживает объявленный dispatch fallback

[ci.yml:7](https://github.com/iliya1947/vico-forum/blob/3387132aeed815fb93cf3094c3d70f5e343ce998/.github/workflows/ci.yml#L7) добавляет `workflow_dispatch`, а условие `checks` допускает это событие. Но [обязательный шаг migration guard:49](https://github.com/iliya1947/vico-forum/blob/3387132aeed815fb93cf3094c3d70f5e343ce998/.github/workflows/ci.yml#L49) безусловно вызывает `verify-migration-history.mjs`. Скрипт на строках 12–13 требует `GITHUB_BASE_REF`; workflow его для dispatch не вычисляет и не передаёт.

По [GitHub Variables reference](https://docs.github.com/en/actions/reference/workflows-and-actions/variables) `GITHUB_BASE_REF` задан только для `pull_request`/`pull_request_target`. Поэтому dispatch, даже после появления workflow на default branch, падает в guard до lint/typecheck/unit/build. Наличие независимого `database` job не делает основной CI успешным.

Выполнено локальное воспроизведение на Node `v24.22.1`: скопированы неизменённые `verify-migration-history.mjs` и его module из exact head, удалён `GITHUB_BASE_REF` из process environment, выполнен сам скрипт. Результат: exit 1, `AssertionError: GITHUB_BASE_REF is required; this guard is intended for pull_request CI`. Guard останавливается до Git/DB обращений. Это execution самого отказавшего звена, не полный GitHub dispatch run.

Исправление должно обеспечить достоверный PR/base context для fallback, включая stacked PR с base не `main`, и сохранить accepted-migration protection. Нельзя просто убрать guard либо молча подставить `main` для любого PR. При повторной проверке: обычный label-triggered PR путь и dispatch для обычного/stacked PR проходят history guard; попытка изменить принятую migration всё ещё отклоняется. Dispatch/browser evidence также должно идентифицировать реально проверенный SHA: сейчас acceptance `IMPLEMENTATION_SHA` берётся только из отсутствующего в dispatch `github.event.pull_request.head.sha`.

## Проверенный остальной scope и ограничения

- Все YAML успешно разобраны. В 18 изменённых существующих workflow default open/synchronize заменены на единственный `labeled`; везде добавлен dispatch.
- Все 17 исходных acceptance path-наборов совпадают с base без изменений. Все существующие job bodies после исключения нового `if` совпадают с base; unit/PG/browser команды не заменены.
- Остальные 13 workflow byte-equal base: production/deploy, UI preview Pages и Codex bridge не изменены. Новый bootstrap ограничен push main по собственному path либо dispatch; checkout/выполнение PR source в управляющем job отсутствуют.
- Исправление старого permission finding проверено: `gh api --method DELETE repos/$GH_REPO/issues/$PR_NUMBER/labels/$TEST_LABEL` использует документированный [Issues label endpoint](https://docs.github.com/en/rest/issues/labels#remove-a-label-from-an-issue), который принимает `issues: write` и применим к PR. Обе контрольные метки имеют допустимые имена, передаются через quoted env; conditions bootstrap/consume разделены по событиям. Старый finding о выборе API на этом head закрыт по контракту; реальный token/API execution не заявлен.
- GitHub exact-head check-runs endpoint вернул `total_count: 0`. Это ожидаемо для новой политики отсутствия автоматического запуска; не PASS тестов и не отдельный finding. В review не добавлялись метки, не запускались Actions/production и не менялась реализация.
- Локальная диагностическая сводка: `/workspace/work/manual-pr-tests-review-diagnostics/results.json`; фактический stderr guard — `dispatch-no-base.stderr.txt` там же. Существенные выводы полностью изложены выше и не требуют доступа следующего агента к локальному scratch.
- Новых подтверждённых findings вне перечисленных двух в заданном scope не выявлено. Fork-token policy и repository rulesets не изменялись и не сертифицировались этим review.

## Передача

Мира возвращает исполнителю #362 два finding одним пакетом. После исправлений обновить зависимый #363, выполнить targeted event/job/context проверки и применимые exact-head checks, записать author self-check и вернуть стабильный head на повторную независимую проверку. До этого #362/#363 не готовы к merge. #342 остаётся единственным служебным каналом; B3 moderation visibility всё ещё отдельно ожидает coordinator checkpoint Миры, B4 не активирован.
