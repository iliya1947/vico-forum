# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–5 merged в main; current main/base: `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- Package 6 implementation: Draft PR #279, **current stable exact head `5494fe92dc5cc8b3fed87db5efcc9bc98b2f1731`** (last implementation whole-PR reviewed head `e2e43316165b49d2b9fbf724138c9c7d07f71a60`).
- Current exact-head **CI #41571491052 attempt 1 SUCCESS**, both `checks` and `database`. Previous doc-only CI #41570619722 and last implementation whole-PR reviewed head CI #41567459036 also passed.
- Coordinator review chain завершён на final exact head: **PASS, 0 confirmed current-scope defects**. P6-UI-01/02, P6-DOC-01/02 закрыты.
- Independent technical review Лёвы предыдущего head выявил два P3 finding; обе авторские correction внесены на новом head и ожидают повторной coordinator/independent приёмки.
- [Полный результат и handoff Мире #6593499774](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6593499774).

## Package 6 — утверждённый product scope

1. Одновременно одна pending Appeal на initial Decision.
2. Eligibility следующей Appeal определяется current effective outcome.
3. Общий лимит — три Appeal на initial Decision; любой eligible reporter может занимать reporter-side slot, включая повтор того же reporter.
4. После каждого Appeal result уведомление через общий inbox получают affected author + все реальные reporters с recipient dedup.
5. Original Decision immutable; effective outcome выводится из initial Decision + resolved Appeals.
6. Предпочтителен reviewer, отличный от автора initial Decision, без hard deadlock.

## Подтверждённый correction package

Мира независимо перепроверила оба findings Лёвы против exact head, P4 control и утверждённого Package 6 техконтракта. Оба являются реальными дефектами текущего Package 6, а не будущим заделом.

- **P6-UI-01 / P3:** Appeal review не показывает already-available target kind/current topic title; group2 также теряет target kind. Actual Worker SSR visible-text check на post/title Cases и P4 control подтвердили потерю существующего контекста. Исправление локально в presentation/регрессиях, без схемы/новых прав.
- **P6-UI-02 / P3:** обе новые формы отображают typed unavailable/forbidden/notFound как invalid reason/explanation. Rendered React Router/jsdom с реальными actions подтвердил unavailable503 → “Check the reason and explanation.” Требуется localized Appeal feedback по server classification с сохранением draft/nonce/status.
- Previous coordinator findings P6-RTL-01 / P6-VERIFY-01 / P6-VERIFY-02 закрыты; повторно открытыми не считаются.
- Иных подтверждённых current-scope дефектов на проверенном head не найдено.

## Author correction result — current head

- **P6-UI-01 implemented, pending coordinator acceptance:** Appeals group2 показывает ранее доступный localized target kind; Appeal reviewer показывает target kind и current topic title с existing registry-based source direction. Render regressions различают post и topic-title, проверяют EN/RU/HE и RTL.
- **P6-UI-02 implemented, pending coordinator acceptance:** обе Appeal forms сохраняют классификацию `invalid/conflict/forbidden/notFound/unavailable` с локализованными отдельными текстами; HTTP status/service classification не изменены. Rendered React Router/action regressions проверяют видимый feedback, status, draft, nonce и retry. Семь новых RU/HE manual translation fingerprints проверены против canonical descriptor SHA-256.
- **Exact head `e2e43316165b49d2b9fbf724138c9c7d07f71a60`, CI #41567459036 — SUCCESS** (attempt 1; `checks` и `database`). Нового coordinator PASS / independent verdict на этом head ещё нет.

## Fresh coordinator review — exact head e2e43316…

- **P6-UI-01 — CLOSED.** Target kind восстановлен в group2/Appeal review; current topic title и source lang/dir восстановлены; EN/RU/HE + RTL regressions проходят.
- **P6-UI-02 — CLOSED.** Participant/reviewer Appeal forms сохраняют typed error classification и корректный localized feedback; HTTP status, draft, nonce, target/retry semantics сохранены.
- Lower-layer Package 6 boundaries (domain/schema/permissions/migration/concurrency/notifications) относительно ранее проверенного head не менялись; exact-head CI #41567459036 SUCCESS.
- **P6-DOC-01 — CONFIRMED current-scope documentation defect.** PROJECT_STATE.md в #279 добавляет transient PR/review state (текущий implementation PR, не merged, не прошли coordinator/independent review, требует review/merge). Это прямо противоречит текущему AGENTS.md, который запрещает хранить PR/CI/review/corrections snapshots в PROJECT_STATE.md, и после merge текст немедленно станет ложным. Finding внесён самим Package 6 diff и должен быть исправлен до финального PASS.
- Иных подтверждённых current-scope дефектов на current head не найдено.

## P6-DOC-01 — author correction на финальном head

- В `PROJECT_STATE.md` удалены transient упоминания текущего implementation PR, неслитого статуса, review verdict и необходимости review/merge; оставлен merge-stable repository/local-CI статус Complaints Packages 1–6 и нереализованный Package 7.
- Коммит `df33f134fcd49c01258b95b02e34b726bc9b845f` изменил **только `PROJECT_STATE.md`** (3 additions / 3 deletions). Code, schema, permissions, contracts и CI setup не менялись.
- Exact-head CI #41570619722 **SUCCESS** (attempt 1, `checks`/`database`).
- **Focused coordinator verification pending.** Никакого coordinator PASS или новой independent technical проверки этого head пока не заявлено.

## Focused verification после P6-DOC-01

- Transient PR/review/merge status из `PROJECT_STATE.md` удалён корректно.
- **P6-DOC-02 — CONFIRMED current-scope documentation defect.** PR #279 добавляет forward migration `0055_complaint_appeal_notifications.sql`, но `PROJECT_STATE.md` всё ещё фиксирует repository migration history как `0000`–`0054`. После merge это будет фактически неверное текущее состояние.
- Код/requirements после предыдущего coordinator review не менялись; новый implementation whole-PR cycle не требуется.
- Coordinator PASS пока не выдан.

## P6-DOC-02 — авторское исправление

- Forward migration `drizzle/0055_complaint_appeal_notifications.sql` присутствует в PR #279; repository migration history в `PROJECT_STATE.md` исправлена с `0000`–`0054` на `0000`–`0055`.
- Коммит `5494fe92dc5cc8b3fed87db5efcc9bc98b2f1731` изменил **ровно одну строку `PROJECT_STATE.md`** (1 addition / 1 deletion). Code/schema/requirements не менялись.
- CI #41571491052 **SUCCESS**, attempt 1, `checks` и `database`. **Coordinator focused verification pending**; PASS на этом head ещё не получен.

## Final coordinator PASS — exact head 5494fe92…

- P6-DOC-02 focused verification: PASS. Diff от предыдущего doc head — ровно одна строка `PROJECT_STATE.md`, migration history `0000`–`0054` → `0000`–`0055`.
- Exact-head CI #41571491052: SUCCESS, attempt 1, `checks` + `database`.
- Code/schema/permissions/domain requirements после последнего implementation whole-PR review не менялись.
- P6-UI-01, P6-UI-02, P6-DOC-01, P6-DOC-02 закрыты.
- **Coordinator verdict: PASS — 0 confirmed current-scope defects.**

## Проверенная evidence и ограничения

Лёва локально выполнил115 application/route tests,73 native PostgreSQL17 tests, production build; дополнительные independent probes проверили28-row queue,60-row mixed inbox и concurrent resolution двумя разными reviewers. Actual Worker+session+PermissionResolver+PostgreSQL HTTP проверил three-slot flow, repeated reporter, outcome flips, replay, participant/appeal-only/privacy/resource boundaries и notification targets/dedup. Implementation не менялся.

Browser/owner visual acceptance не выполнялись и не заявляются; сохранена coordinator-классификация этого ограничения. Full CI independently verified через exact-head GitHub API; локально не заявляется повтор полного CI. Preview/PG/temporary auth vars/dependency symlinks удалены.

## Назначения и следующий шаг

- Мира — ChatGPT-5.6 Sol: coordinator review завершён PASS.
- Лира — ChatGPT-6: implementation/corrections завершены; без нового назначения.
- Лёва — Codex-6.1 Sol: **назначен independent technical whole-PR review final exact head `5494fe92dc5cc8b3fed87db5efcc9bc98b2f1731`**.
- Марк — Codex-6 Sol: без назначения.
- Следующий шаг: Лёва проводит independent technical whole-PR review final exact head. Implementation не менять до verdict. Package7+, merge и production вне этого handoff.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
