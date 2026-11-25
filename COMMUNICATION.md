# COMMUNICATION.md — общий актуальный контекст stale/legacy audit

## Канал

Этот dedicated service PR — единственный рабочий канал stale/legacy audit/cleanup. #342 завершён. Старый closed service PR #366 не используется.

## Что установлено

- Fresh-reviewed baseline: 80 A-elements on main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- Four false positives were removed from prior 84: old A-007 and old A-012…A-014.
- Intentional negative assertions proving removed draft requests stay absent are not cleanup findings.
- B = compatibility, C = genuinely unfinished, D = historical, E = not established; эти классы не исправляются автоматически.

## Изменение условий

Current main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432` содержит четыре последующих merge-коммита и изменяет несколько audited surfaces. Это требует dependent re-evaluation under AGENTS.md; старый exact-count нельзя механически переносить.

## C1

#377 раньше получил author PASS/CI на exact `d4f820166bc905e28e2ae818854e6f8038c96ea1`, но сейчас behind current main на 4. Localization files изменились в main, поэтому перед review C1 нужны fresh A-011…A-026 validation + sync + new exact-head checks.

## Отдельные задачи

#384 full-forum audit не является частью этой задачи.
