# Независимая рецензия GPT-6 на аудит GPT-5.6 Sol (15.10.2026)

> Архивная рецензия для [PR #226](https://github.com/iliya1947/vico-forum/pull/226) (**DO NOT MERGE**). Только сопоставление доказательств; **не** инструкция Codex, Sol или GPT-6 выполнять исправления и не замена двух исходных аудитов. PR #147, PR #215, `main` и CI/settings не менялись.

## 1. Источники, границы

- Независимый аудит Sol: [`GPT-5.6-Sol-test-suite-2026-10-15.md`](./GPT-5.6-Sol-test-suite-2026-10-15.md), в частности §3–§11.
- Независимый аудит GPT-6: [`GPT-6-test-suite-2026-10-15.md`](./GPT-6-test-suite-2026-10-15.md).
- Общее проверенное основание: `main` `99e69c0d651d7283d90141a0badc54fa1f6dd143`, PR #215 `fdf81607536758f308305fceaa1c98ca8650ee3b`. CI: [#38725094807](https://github.com/iliya1947/vico-forum/actions/runs/38725094807). В текущем PR #215 были последующие commits; утверждения об ошибках старого SHA **не равнозначны** проверке нового head.
- Дополнительно сверены исходники `vitest.config.ts`, `app/forum/profile-view.test.tsx`, `app/ui-preview/preview-app.test.tsx`, `app/forum/public-read.test.tsx`, `tests/database/forum-email-registration.test.ts`, `app/forum/markdown-editor.{tsx,test.tsx}`, `app/forum/markdown.{tsx,test.tsx}`, Node CI workflow tests, `.github/workflows/ci.yml` и нормы `docs/UI_UX_PASS.md`.
- Рецензия **статическая**: не выполнялись mutation testing, новый полный тестовый прогон, живой Cloudflare/production или реальная браузерная приёмка.

## 2. Подтверждено в аудите Sol

| Finding Sol | Проверенный факт / граница |
| --- | --- |
| Карта 139 файлов | На аудируемом PR: 95 обычных Vitest, 27 PostgreSQL, 17 Node tests. Все группы перечислены в путях CI; существенных «осиротевших» файлов не найдено. |
| DB-01 | Был intermittent PostgreSQL `40001` при конкурентном locale write, повтор на том же коде прошёл. **Причина не доказана**; это симптом ненадёжности, не доказательство production race. |
| ARCH-01 | `profile-view.test.tsx` содержит несколько `render` без `cleanup`/unmount; только первый case освобождает DOM вручную. `preview-app.test.tsx` выполняет два `render` без `afterEach(cleanup)`. Vitest `globals:false`, общего setupFile cleanup нет. Реальный риск накопления DOM между tests внутри файлов. |
| REQ-01/02 | Есть функциональность Fullscreen (`is-fullscreen`, `aria-pressed`, Escape) и ratio-based Split scroll, но в `markdown-editor.test.tsx` нет dedicated asserts на полное переключение fullscreen и синхронизацию `scrollTop / scrollHeight / clientHeight`. |
| REQ-03 | `ForumCodeBlock` сохраняет account-specific wrap/line numbers через localStorage, слушает `storage`/`vico:code-preferences`; тесты проверяют базовые toggles/gutter/source, но не всю матрицу persistence/propagation между блоками/вкладками. |
| CI-01/02 | Ruleset `Protect main` содержит required `checks` и `database`, но API сообщает `enforcement: disabled`; workflow `ci.yml` запускается только на `pull_request`. Classic branch protection недоступна (403), поэтому **нельзя** утверждать отсутствие всех других защит. |
| CI-03 | CI #38725094807 checkout'ил `refs/remotes/pull/215/merge`: SHA `60ca1806a788207473bc2d1fc8020f4ce2df2793` = synthetic merge PR head `fdf8160` в `main@99e69c0`. Это корректная проверка merge-result, но не непосредственный checkout standalone `fdf8160`; evidence надо подписывать точно. |
| CI-04/05/06 | `checks` остаётся red после падения Vitest; последующие build/parity skipped; параллельный `database` при этом прошёл. Нет признаков ложного green из-за явного error-swallowing в workflow. |
| INF-01/02/03 | Есть text/regex проверки workflow выражений, расположения guard и `/\\bCOMMIT\\b/` в diagnostic script. Эти checks по природе слабее реального semantic parse/execution; lowercase `commit` не матчится case-sensitive regex. **Эксплуатационный дефект current workflow не доказан**. |

## 3. Выводы Sol, требующие переклассификации

### V-01 — общий jsdom для server/domain tests

Верно, что `vitest.config.ts` задаёт `environment: "jsdom"` всем 95 обычным тестовым файлам, включая server-oriented modules. Но сами по себе browser globals в test runner **не подтверждают** ложный green или конкретный дефект. Считать это **потенциальным fidelity gap**, приоритет уточнять на примерах действительно browser-dependent server code. Изменение test environments только ради формального разделения сейчас не обосновано.

### INT-01/02/04 и UI-01/02/03

Тест `stage4-core-e2e.test.ts` действительно вызывает часть action stack напрямую с внедрёнными context/auth вместо полного HTTP/cookie/Worker journey; Better Auth DB roundtrip не равен полноценно собранному user flow. Локальный Worker smoke реален (`workerd`), но проверяет в основном HTTP status/redirects/HTML markers.

**Это ограничения покрытия**, не доказательство, что текущий Stage обязан завести новый Playwright/WebDriver/CI job. [`docs/UI_UX_PASS.md`](../../docs/UI_UX_PASS.md) уже требует **реальную браузерную функциональную/визуальную приёмку** по матрице desktop/mobile, LTR/RTL, identity и state. Невыполненная приёмка — blocker **на соответствующей границе завершения UI/UX**, а отсутствие именно *автоматизированного* браузерного E2E — не самостоятельный подтверждённый bug. Для реального production OAuth/Queues/R2/Worker rollout отдельные gates Stage 6 остаются отложенными.

### INT-03 — одинаковый PostgreSQL superuser URL у локальных Hyperdrive bindings

Факт верен: в `database` CI `HYPERDRIVE` и `WEB_HYPERDRIVE` указывают на один disposable test URL. Такой smoke не проверяет реальные разделённые credentials/ACL внутри Worker; однако тот же CI выполняет отдельные **positive/negative PostgreSQL 17 permission probes**. Следовательно, это **не полное отсутствие проверок least privilege**. Нужна точная привязка дополнительного Worker role smoke к текущему Stage/приёмке прежде, чем называть его high-priority defect.

### INF-04 — GET-only smoke

Формулировка Sol «test-description/guarantee mismatch» в изложенном виде **не подтверждается**: `.github/scripts/production-worker-rollout.test.mjs` называет case **`production smoke is GET-only for auth and covers the repository public smoke`**. Запрет `--request POST` применяется непосредственно к `scripts/smoke-production-worker.sh` и относится к **auth route**, тогда как вложенный `smoke-workers.sh` намеренно проверяет `POST /IW/` → `404`. Глобальную гарантию «все запросы GET-only» этот test **не заявляет**. Классифицировать как найденный дефект теста неправильно.

### INF/CI и приоритет

`CI-03` — недостаточно точная атрибуция CI evidence, а не ошибка checkout. `CI-04` — ожидаемое прекращение дальнейших шагов после отказа; нет false-green. `ARCH-04` — один длинный integration scenario снижает fault localization, но разделение может разрушить смысл end-to-end transaction; не менять без доказанной пользы.

## 4. Обоснованные пропуски в findings Sol

Независимый аудит GPT-6 дополнительно отметил два конкретных дефекта тестовой изоляции/независимости на том же PR SHA:

1. [`app/forum/public-read.test.tsx`](https://github.com/iliya1947/vico-forum/blob/fdf81607536758f308305fceaa1c98ca8650ee3b/app/forum/public-read.test.tsx): два `vi.spyOn(window, "getSelection")` без `mockRestore` / `vi.restoreAllMocks()` в `afterEach`; `vi.unstubAllGlobals()` не заменяет восстановление spy. Это опровергает сильное утверждение «за пределами ARCH-01 не обнаружено проблем browser-state leakage». Отдельного воспроизведения влияния на другой тест нет.
2. [`tests/database/forum-email-registration.test.ts`](https://github.com/iliya1947/vico-forum/blob/fdf81607536758f308305fceaa1c98ca8650ee3b/tests/database/forum-email-registration.test.ts): `rejects an incorrect password and accepts...` использует `new-forum-member@example.org`, созданный только предыдущим `it`. Это зависимость от порядка исполнения; дефекта Better Auth production flow сама по себе не доказывает.

В отдельном аудите GPT-6 также описаны локальные gaps negative cases для translations/revision consistency, search ranking, profile validation и notifications action. Их отсутствие в high-level списке Sol не превращает их автоматически в задачи: нужна привязка к текущему Stage, а наличие overlapping DB/shared-guard tests учитывать при оценке.

## 5. Согласованная картина и статус

- **Подтверждено:** suite полезен и обнаруживает реальные регрессии; локальная БД/transactions/ACL покрыта содержательно; конкретные defects test hygiene/order и intermittent `40001` требуют диагностики; CI governance выключенного ruleset — отдельный организационный риск.
- **Не подтверждено:** что все указанные Sol «high» являются дефектами текущего Stage; что absence automated browser test/HTTP E2E означает сломанное приложение; что local Worker smoke заменяет production-role or browser acceptance; что FAIL старого quote head сохранился на более новых commits.
- **Не изменять по одной лишь гипотезе:** Stage 6 integration, широкую архитектуру тестов, зависимости и CI/governance без owner/Codex decision.

**Рецензия не утверждает окончательный приоритет исправлений.** Это сопоставление для владельца. Обе независимые работы остаются нетронутыми, исходные файлы сохраняются, по PR #226 не требуется merge. Следующее техническое действие — только по отдельной команде владельца и в пределах соответствующей роли/Stage.
