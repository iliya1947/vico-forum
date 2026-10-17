# Финальная согласованная карта аудита тестовой системы (2026-10-16)

> **Архив PR #226. НЕ MERGE.**
>
> Этот файл сводит два независимых аудита, их взаимные review и reconciliation.
> Он не заменяет исходные документы, не является implementation plan и не даёт разрешения
> менять product code, tests, CI, repository settings или Stage 6 infrastructure.

## 1. Основание и границы

Согласование использует:

- `GPT-6-test-suite-2026-10-15.md`;
- `GPT-5.6-Sol-test-suite-2026-10-15.md`;
- `GPT-6-review-of-GPT-5.6-Sol-2026-10-15.md`;
- `GPT-5.6-Sol-review-of-GPT-6-test-suite-2026-10-15.md`;
- `GPT-5.6-Sol-reconciliation-response-2026-10-16.md`;
- `GPT-6-A05-reconciliation-response-2026-10-16.md`.

Основной deep-audit snapshot PR #215 был `fdf81607536758f308305fceaa1c98ca8650ee3b`,
с последующей проверкой части системных findings на `4122e089...`.

Перед этой финальной сводкой дополнительно проверен latest PR #215 head:

`72ab42d1c10108d412cb9147121104ea33b83afe`.

Это не новый полный аудит latest head. Проверены только затронутые ранее findings, чтобы не
называть уже исправленные пункты текущими.

Source-of-truth подтверждает:

- проект находится в раннем pre-release;
- активный product priority — UI/UX pass;
- Stage 6 external integration остаётся paused;
- real-runtime browser acceptance matrix обязательна для завершения UI/UX pass;
- конкретный automated browser framework не является обязательным contract.

После взаимного review **технических разногласий между GPT-5.6 Sol и GPT-6 не осталось**.

---

# 2. Подтверждённые актуальные test-quality / reliability defects

Эти пункты имеют конкретный наблюдаемый defect в самих tests/harness/reliability, а не только
теоретическое отсутствие дополнительного покрытия.

## TQ-01 — DOM cleanup отсутствует в двух React test files

Подтверждено и остаётся на latest inspected #215 head:

- `app/forum/profile-view.test.tsx`;
- `app/ui-preview/preview-app.test.tsx`.

Оба файла выполняют несколько `render()`, но не имеют `afterEach(cleanup)`/equivalent global
cleanup. Vitest использует `globals: false`, общего cleanup setup для них нет.

**Статус:** confirmed current test-isolation defect.

## TQ-02 — `public-read.test.tsx` не восстанавливает `getSelection` spy

На latest inspected #215 head:

- `afterEach` вызывает `cleanup()`;
- вызывает `vi.unstubAllGlobals()`;
- `vi.restoreAllMocks()` отсутствует;
- test Reply/Quote использует `vi.spyOn(window, "getSelection")`.

Оба spy создаются внутри одного test case, поэтому прежняя формулировка не должна подразумевать
cross-test setup между двумя отдельными cases. Но после завершения case spy штатно не
восстанавливается.

False-pass другого test отдельно не воспроизведён.

**Статус:** confirmed current test-isolation/hygiene defect.

## TQ-03 — email-registration test зависит от предыдущего test case

`tests/database/forum-email-registration.test.ts` по-прежнему:

1. создаёт `new-forum-member@example.org` в первом `it`;
2. использует этот account для sign-in во втором `it`;
3. второй case не создаёт собственный fixture.

Файл не изменялся между audited snapshot и latest inspected #215 head.

**Статус:** confirmed current order-dependency defect.

## TQ-04 — intermittent locale-concurrency `40001`

Подтверждены как минимум два независимых historical CI occurrence на разных SHA с успешным
rerun без code change.

Согласованный итог A-05:

- intermittent `40001` в locale concurrency test — confirmed;
- root cause exhaustion retry budget — unknown;
- production defect `ControlledLocaleWriter` — not proven;
- увеличивать retries без диагностики нельзя.

На latest inspected #215 head `db/locale-repository.ts` всё ещё использует тот же bounded
retry path (`maxRetries = 2`); файл не был изменён последующими commits.

Причинная фраза GPT-6 о warning из publication-test `finally` **отозвана самой GPT-6**.
Наблюдаемый warning непосредственно согласуется с rollback path writer после failed COMMIT, но
это не устанавливает причину самого flake.

**Статус:** confirmed current test-reliability symptom; root cause requires diagnosis before fix.

---

# 3. Подтверждённые regression-coverage gaps существующей функциональности

Это реальные пробелы assertions для уже существующих contracts. Они не означают, что production
поведение сломано, и не все автоматически имеют одинаковый приоритет.

## RC-01 — Editor Fullscreen

Latest `markdown-editor.tsx` имеет:

- `fullScreen`;
- `.is-fullscreen`;
- dialog/aria state;
- toggle;
- Escape;
- fullscreen Tab handling.

На latest `markdown-editor.test.tsx` dedicated Fullscreen regression отсутствует.

**Статус:** confirmed current regression-coverage gap.

## RC-02 — Editor Split synchronized scroll

Implementation имеет ratio-based `syncSplitScroll()` и двусторонние scroll handlers.

Latest test suite проверяет переключение `write / preview / split`, но не
`scrollTop / scrollHeight / clientHeight` synchronization contract.

**Статус:** confirmed current regression-coverage gap.

## RC-03 — account-scoped code-block preferences

`ForumCodeBlock` хранит:

- `vico:editor:code-wrap:<accountId>`;
- `vico:editor:code-lines:<accountId>`;

и слушает:

- `vico:code-preferences`;
- browser `storage`.

Latest `markdown.test.tsx` проверяет local Wrap/Line numbers behavior и сохранение Wrap при
изменении Markdown source, но не проверяет:

- account isolation;
- restore из localStorage;
- propagation между одновременно mounted blocks;
- `storage` event / cross-tab path.

**Статус:** confirmed current partial-coverage gap.

## RC-04 — content-generation view negative identity/cardinality cases

Implementation имеет explicit cardinality guard и `assertSameIdentity()`.

Dedicated test не упражняет mismatch/cardinality negative cases.

**Статус:** confirmed current localized coverage gap.

## RC-05 — “regardless of task state” проверен не на матрице states

Test обещает exact-current presentation независимо от task state, но упражняет только один state.

**Статус:** confirmed test-name/coverage mismatch.

## RC-06 — heartbeat 401 revalidation не assert'ится

Test называется так, будто проверяет одновременно:

- остановку heartbeat requests;
- session revalidation.

Фактически assertion подтверждает остановку следующих requests; вызов
`revalidator.revalidate()` отдельно не проверяется.

**Статус:** confirmed localized assertion gap.

## RC-07 — search ranking не проверен одним multi-candidate result set

Repository search имеет приоритет title > tag > body и deterministic tie-breaks.

Stage4 connected test проверяет отдельные title/tag/body searches, но не единый набор кандидатов,
где ranking между источниками реально проявляется.

**Статус:** confirmed current regression-coverage gap.

## RC-08 — profile invalid-400 draft preservation

Profile route test для invalid input проверяет 400 и отсутствие storage write, но returned draft
явно проверяется только для 503 branch.

**Статус:** confirmed localized assertion gap.

## RC-09 — notifications action route-unit negatives

В route test есть guest loader и successful action, но нет dedicated action cases для:

- guest;
- cross-origin;
- missing/invalid notification ID.

Shared guard/repository coverage в других слоях существует, поэтому этот finding не означает
отсутствие security contract вообще.

**Статус:** confirmed localized route-unit coverage gap.

---

# 4. Подтверждённые CI / governance / evidence issues

## CI-01 — `Protect main` ruleset disabled

Проверенный repository ruleset содержит required `checks` и `database`, но API возвращал
`enforcement: disabled`.

Classic branch protection endpoint был недоступен проверке (`403`), поэтому нельзя утверждать,
что repository вообще не имеет иной protection.

**Статус:** confirmed repository-governance gap с указанной границей evidence.

## CI-02 — full CI workflow не запускается на `push main`

Основной `ci.yml` запускается на `pull_request`.

После merge тот же full `checks + database` workflow автоматически не повторяется этим workflow
на фактическом main commit.

**Статус:** confirmed CI coverage/governance gap.

Это не доказывает broken merge result и не означает, что изменение workflow автоматически
обязательно без технического решения.

## CI-03 — “exact head CI” wording неточно для обычного PR run

Default `pull_request` checkout проверяет synthetic merge ref/SHA, что само по себе полезно и
корректно.

Проблема возникает только когда такой run документируется как непосредственная проверка standalone
implementation head.

**Статус:** confirmed evidence/traceability precision issue, не checkout defect.

---

# 5. Подтверждённые low-priority test-guarantee weaknesses

Эти факты верны, но production/current workflow failure не продемонстрирован.

## LW-01 — GitHub expression test не является semantic parser/executor

Некоторые infra tests проверяют text shape/escaped expressions, но не semantic validity полного
GitHub expression grammar.

## LW-02 — guard-before-secrets check структурно ограничен известными jobs

Проверка не является общим анализатором любого будущего job/use-secret ordering.

## LW-03 — no-COMMIT diagnostic regex case-sensitive

Assertion на `COMMIT` не поймает lowercase `commit`.

## LW-04 — default factory assertion частично source-string based

Hyperdrive content-translation test проверяет default factory в том числе чтением source text, а
не только behavioral execution default path.

**Согласованный смысл группы:** реальные test-strength weaknesses; не application defects и не
основание расширять infrastructure work без отдельной пользы.

---

# 6. Обязательный acceptance gate, но НЕ defect отсутствия automation

## AC-01 — real-runtime browser acceptance UI/UX pass

Project source-of-truth прямо требует финальную real-browser matrix:

- actual Worker/runtime для functional/final acceptance;
- desktop + narrow mobile + tablet/intermediate;
- LTR + RTL + mixed-direction content;
- Guest + User + Manager;
- discovery/topic/participation/translation/admin/system states;
- keyboard/focus/target sizing/overflow/zoom/reflow/reduced motion.

GitHub Pages остаётся progress preview и не доказывает SSR/auth/database/permissions/runtime.

**Статус:** mandatory acceptance gate до завершения UI/UX pass.

### Важно

Отсутствие Playwright/Cypress/WebDriver/Vitest Browser Mode **не является самостоятельным
confirmed defect**. Project contract требует результат real-browser acceptance, а не конкретный
automation framework.

Synthetic jsdom `Range.getClientRects()` в quote test проверяет component logic, но не заменяет
этот browser acceptance.

---

# 7. Coverage limitations / observations, которые НЕ являются обязательными current fixes

Следующие факты подтверждены, но взаимный review не поддерживает их как самостоятельные defects:

## O-01 — общий jsdom

Обычный Vitest suite глобально использует `jsdom`, включая server/domain-oriented tests.

Это потенциальный fidelity risk, но конкретный server false-green от browser-only global не найден.

**Статус:** observation/risk; не менять environments только ради формального разделения.

## O-02 — Stage4 “E2E” не является full HTTP/browser E2E

`stage4-core-e2e.test.ts` напрямую создаёт router context/session/auth dependencies и вызывает
actions поверх real PostgreSQL.

Это хороший integration test, но не полный HTTP → Worker → cookie/session → protected mutation
journey.

**Статус:** coverage boundary, не proven defect.

## O-03 — Better Auth DB roundtrip не является full assembled forum journey

Email registration integration реально проверяет Better Auth + PostgreSQL, но не весь user journey
через browser/Worker/protected forum write.

**Статус:** coverage boundary.

## O-04 — один большой Stage4 integration scenario

Монолитный scenario ухудшает fault localization, но сохраняет смысл последовательного end-to-end
state flow.

**Статус:** diagnostic tradeoff; не дробить без доказанной пользы.

## O-05 — checks job останавливает следующие steps после failure

Это обычная fail-fast behavior. Она уменьшает diagnostics одного run, но false-green не создаёт.

**Статус:** diagnostic tradeoff, не correctness defect.

## O-06 — observability unit test использует подготовленный snapshot

Это ограничение конкретного unit test; отдельная DB/integration coverage существует.

**Статус:** localized coverage limitation, не доказательство отсутствия persistence/redaction
contract.

## O-07 — password hash assertion не доказывает внутренний format

Test проверяет presence и `!= plaintext`; успешный credential sign-in проверяется отдельно.

Без отдельного security/product contract на конкретные hash internals привязывать suite к
внутреннему Better Auth format не требуется.

**Статус:** low-value observation; не automatic fix.

---

# 8. Stage 6 / future — НЕ исправлять как current UI/UX findings

Source-of-truth сохраняет Stage 6 paused.

Не переносить в текущий пакет исправлений только из-за test-audit gaps:

- real Google OAuth configuration/smoke;
- deployed Worker split-role/runtime acceptance;
- Cloudflare Queues/provider live calls;
- authoritative production allowance/anti-abuse values;
- full deployed provider/background-job smoke;
- production/private-data preview isolation;
- live R2/runtime integration;
- backup/restore acceptance;
- full production-like deployment smoke.

### Hyperdrive clarification

В disposable CI оба local Hyperdrive overrides действительно используют один PostgreSQL superuser
URL.

Но suite отдельно выполняет positive/negative PostgreSQL privilege probes. Поэтому неверно говорить,
что least privilege вообще не проверяется.

Что local Worker smoke не доказывает Worker behavior под реальными restricted credentials —
верно, но deployed restricted-role acceptance относится к Stage 6.

---

# 9. Historical/resolved finding

## H-01 — quote attribution regression на `fdf8160`

Два новых quote tests корректно поймали implementation regression.

На latest inspected #215 head renderer уже использует:

`isAttributedQuoteHeader(node)`

вместо передачи первого HAST child; quote regression tests присутствуют.

**Статус:** historical confirmed implementation defect, already corrected. Не включать в новый
test-suite fix package.

---

# 10. Findings, снятые взаимным review

Не включать в итоговый список defects:

- `INF-04` “GET-only smoke wording mismatch” — withdrawn;
- global jsdom как уже доказанный false-green defect — evidence недостаточно;
- отсутствие automated browser framework как самостоятельный defect — project contract этого не требует;
- одинаковый local Hyperdrive superuser URL как “полное отсутствие least-privilege testing” —
  неверно, DB privilege probes существуют;
- checks fail-fast как correctness defect — false;
- monolithic Stage4 test как обязательный refactor — не доказано;
- warning `there is no transaction in progress` как доказанный результат publication-test
  `finally ROLLBACK` — causal attribution withdrawn.

---

# 11. Итог согласования

## Подтверждено и требует технического решения, если открывается test-suite correction task

На latest проверенном состоянии остаются:

1. DOM cleanup defect в двух React test files;
2. `getSelection` spy cleanup defect;
3. email-registration test order dependency;
4. intermittent locale-concurrency `40001` reliability symptom с неизвестной root cause;
5. Fullscreen regression coverage gap;
6. Split synchronized-scroll coverage gap;
7. code preference persistence/account/propagation coverage gap;
8. локальные assertion gaps RC-04…RC-09;
9. disabled `Protect main` ruleset;
10. отсутствие full `push main` CI;
11. merge-ref / standalone-head evidence wording;
12. low-priority infra-test guarantee weaknesses LW-01…LW-04.

Это **не означает**, что все 12 пунктов должны исправляться одним способом или имеют одинаковый
приоритет. Repository settings/CI governance, flaky DB diagnosis, test isolation и missing
regressions — разные типы работы.

## Отдельно обязательно перед завершением UI/UX pass

- real-runtime browser acceptance matrix AC-01.

## Не включать в current correction task без нового основания

- Stage 6 external/runtime acceptance;
- observations O-01…O-07;
- historical resolved H-01;
- withdrawn findings из §10.

---

# 12. Статус взаимного review

GPT-5.6 Sol и GPT-6 согласовали:

- факты;
- коррекции severity;
- current/future boundaries;
- A-05 causal disagreement.

**Неразрешённых технических расхождений между двумя моделями на этом этапе нет.**

Следующий этап — не новый аудит и не новый reconciliation cycle. Если владелец решит исправлять
подтверждённые current findings, технический план и группировку изменений следует определить
отдельно по действующему процессу проекта.

---

# 13. Handoff для Codex

## Статус

Два независимых аудита GPT-5.6 Sol и GPT-6, их взаимные review и reconciliation завершены.
Неразрешённых технических расхождений между GPT-5.6 Sol и GPT-6 не осталось.

Этот файл — **точка входа** в итог согласования. Исходные аудиты и review в PR #226 сохраняют
полный evidence trail и должны использоваться при необходимости проверить происхождение
конкретного finding.

## Задача Codex

Независимо проверить итоговую карту этого файла против актуального repository state,
`AGENTS.md`, `PROJECT_STATE.md`, `ROADMAP.md` и относящегося source-of-truth.

Не считать выводы GPT-5.6 Sol и GPT-6 правильными только потому, что обе модели согласились.
Для каждого существенного finding проверить evidence и определить:

- подтверждается ли он на актуальном состоянии;
- является ли он реальной проблемой текущего Stage/активного product scope либо future-only;
- требует ли он исправления сейчас либо должен остаться acceptance gate / observation / future work.

После проверки составить технический план только для подтверждённых **current-scope** problems.
Не включать в correction plan Stage 6/future, withdrawn, historical/resolved и observation/no-fix
пункты без нового фактического основания.

Для intermittent locale-concurrency `40001` не выбирать исправление до независимой причинной
диагностики: symptom подтверждён, root cause согласованием GPT не установлена.

## Ожидаемый результат Codex

Зафиксировать в PR #226:

1. результат независимой проверки финальной карты;
2. список подтверждённых current-scope findings после проверки Codex;
3. отклонённые / future-only / no-fix пункты, если классификация изменилась;
4. технический план и разумную группировку исправлений.

Codex не выполняет implementation-код в рамках этого handoff.

**Разработчику достаточно передать Codex только: «Проверь PR #226».**

