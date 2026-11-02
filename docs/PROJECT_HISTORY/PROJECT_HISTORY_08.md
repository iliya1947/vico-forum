# История проекта — 2026-11-02: Complaints Package 5

Этот архивный checkpoint фиксирует выполненную реализацию/CI, но не является
source of truth для текущего поведения или подтверждением независимого review.

- Утверждённый scope: [назначение Миры #6583342749](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6583342749), технический план Лёвы в служебном PR #254.
- Implementation: [Draft PR #277](https://github.com/iliya1947/vico-forum/pull/277) от `main` `1ad8a6402111928c0f08e6f15aba624ba18a4426`.
- Код до обновления docs: `a97ef20fdde64b8e4c76160e16fb011f1024935a`.
- [Exact-head CI #41493212948](https://github.com/iliya1947/vico-forum/actions/runs/41493212948): SUCCESS; 1728/1728 application tests (120 files), 454/454 PostgreSQL 17 tests (36 files); migration history, Drizzle metadata, structural manifest parity for 60 tables, Worker smoke, lint/typecheck/builds PASS.
- Реализовано: migration `0054`, Notification backfill, единственный inbox с typed Decision, атомарный recipient fanout, member-only result, resolved History/readonly Appeal lifecycle, `review-started`, EN/RU/HE и регрессии.
- Не выполнены и не заявляются: coordinator/technical independent review, owner visual acceptance, targeted interactive Chromium → Worker → PostgreSQL acceptance, merge или external/production rollout.
- Package 6 Appeal policy/UI/notifications и sanctions не реализованы.
