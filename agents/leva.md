# agents/leva.md — персональная рабочая память Лёвы по #342

## Текущий статус

По handoff comment7061333928 (updated 2026-11-21T11:06:25Z) проверен final #362 exact 5ed18dcffb856564fd0e8df9ec9d43020cd7f807: independent PASS, оба MANUAL-CI-LEVA finding CLOSED. Последние две строки CI соответствуют независимо проверенной передаче base через VICO_CI_BASE_REF дочернему guard; остальные части прежнего review неизменны. Полное evidence, actual CI и 4 локальных cases — research/manual-pr-tests-review.md. Hosted dispatch пока не выполнялся: после owner merge #362 Мира должна проверить его на открытом PR, затем провести отдельный docs review #363. #361 не source of truth; implementation и Actions Лёва не менял/не запускал.

Отдельная moderation visibility цепочка: B3 author PASS передан Мире для bounded checkpoint Draft #359 exact `3fa0740c4bec304eb3912aedfffb8e6c4ff309e1`, base B2 `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb`; B1/B2 Mira bounded PASS, ступени Draft/unmerged. Лёва не делает промежуточный Codex-review visibility; B4 только после Mira B3 PASS и новой owner continuation. План — `stages/moderation-visibility/PLAN.md`; раннее WORKFLOW «B3 is ACTIVE / Lira creates» не отменяет явную передачу Мире.

## Основания, полезные при продолжении

- #342 comment7024009266 и D-08 устраняют ошибку migration: V-P1/V-P2/V-P3 уже ACCEPTED. Не запрашивать эти решения снова. V-T1/V-T2 technical fit PASS.
- Original full V1–V9 восстановлен из `8181645:USER_ACTIONS_SERVICE_PLAN.md` (1061–1504), а не выведен из compact outline. Сохраняются private exceptions/own OFF/unavailable rows и реальная concurrency matrix.
- План адаптирован на `6fa2a43`; исходная сверка product tree b67e14d=6fa2a43 относится только к той базе. При текущем входе fetched main `6f50d6a`; новый product tree Лёвой не проверялся. Не переносить старые утверждения о недостающих gates на реализованные B1–B3 без чтения соответствующего exact head.
- Существенные инварианты будущего whole-feature review: active/AP-10/direct capability даже на visibility no-op; neutral ID-only atomic History; topic→post ordering; accepted translation execution остаётся private; published attachments проверяются до bucket.get; own OFF/unavailable rows и protected exceptions сохраняются. Это требования плана, не новый PASS реализации.
- Existing Worker forum reader/writer/assets уже использовали webConnectionString на planning baseline; новая runtime topology планом не требовалась.

## Маршрут реализации и проверки

D-09 и актуальный main AGENTS.md закрепили stacked bounded delivery: каждая ступень отдельным PR от предыдущей, промежуточные coordinator checkpoints Миры без Codex-review/merge. После последней ступени весь head переносится в первый PR; затем final author self-check → whole-feature Mira PASS → независимый Лёва на том же stable exact head → owner merge. При изменении нижней ступени сначала синхронизируются зависимые верхние.

Cadence задаётся актуальным назначением этапа. Для B3 были отдельные owner-продолжения после малых пакетов; сейчас весь B3 передан Мире. Не возобновлять старое B1-назначение и не начинать B4 самостоятельно.

## Прежние этапы и будущий маршрут

#354 merged6fa2a43; C1–C4/R1 CLOSED, review evidence остаётся в `stages/corrections/REVIEW.md`; без нового факта не перепроверять.
Structure/topic move S0–S10 принят ранее, `stages/forum-structure/PLAN.md`; сверяется после visibility, сейчас не активен. Stage6/#300/general UI/UX не открывать.
