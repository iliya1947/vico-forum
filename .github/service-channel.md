# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-05 merged в `main`.
- AP-06 реализован в [PR #270](https://github.com/iliya1947/vico-forum/pull/270). Новый stable exact head `71548fe5456c37d0965415d95967c6ff60c7233a` синхронизирован с `main` `ddffcb97b3864aea3e70f327627441682efd4f1d`.
- Integration blocker устранён: все 29 AP-06 файлов, кроме `PROJECT_STATE.md`, byte-identical прежнему implementation head; файлы и новая история `main` сохранены. Сводный Ordinary admin panel state обновлён без старой исторической вставки.
- GitHub показывает #270 mergeable; test-merge tree и implementation tree совпадают: `c64ae36ea4e10abd262c20608f635357ce47c365`.
- Exact-head [CI #41433266864](https://github.com/iliya1947/vico-forum/actions/runs/41433266864): SUCCESS, jobs `checks` и `database` — PASS.
- Coordinator PASS прежнего head `e019a8a` устарел после sync. Следующий этап — новый coordinator-first whole-PR review Миры на `71548fe`; только после её PASS — независимый Codex-review Лёвы.
- AP-07 подготовлен Лирой только на уровне анализа; подтверждённого нового product blocker нет.
- После review и merge AP-06 дальнейшая разработка админ-панели ставится на паузу до завершения текущего цикла «Системы жалоб». AP-07 до этого не начинать.

## Назначения

- Лира завершила AP-06 integration sync и author handoff.
- Следующий reviewer: Мира — coordinator whole-PR review PR #270.
- После coordinator PASS следующий независимый reviewer: Лёва.
- У Марка активного назначения по AP-06 нет.

## Ограничения

- Не добавлять browser E2E в GitHub Actions только ради AP-06 integration evidence.
- Новый actual Chromium → Worker → Better Auth → PostgreSQL на `71548fe` в рамках этого sync не выполнялся; CI не объявляется browser acceptance.
- После merge #270 не начинать AP-07 до завершения текущего цикла «Системы жалоб».

## Открытые решения

- AP-08: reopen behavior, close/reopen permissions и per-action reason requirements.
- AP-10: точный эффект блокировки и applicable reason rules.

Оперативное состояние и следующий шаг: [workflow.md](./workflow.md).
Утверждённый план: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
