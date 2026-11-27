# WORKFLOW.md — текущее состояние и следующий переход

1. PR #388 merged в `main`: merge commit `b1a1799b5927ed647eff9a8cbd5c03282f8a2d87`. Repository/local-CI implementation authentication lifecycle завершена по назначенному review route.
2. Stage 6 остаётся paused: merge #388 не активирует внешние providers, production Google OAuth, secrets или deployed acceptance.
3. Подтверждён docs closeout scope: текущие постоянные документы содержат устаревшие утверждения о deferred/non-mandatory verification/recovery и старом SET-05 boundary.
4. Создана отдельная docs branch от post-merge main: `docs/authentication-lifecycle-closeout`.
5. **Лена / GPT-6.2 назначена автором DOCS-CLOSEOUT** по `stages/DOCS-CLOSEOUT/PLAN.md`.
6. Лёва STOP до AUTHOR PASS docs candidate. Марк/Лира не подключаются; текущая техническая работа только Лёва + Лена.

## Следующий переход

Лена: `WORKFLOW.md` → `stages/DOCS-CLOSEOUT/PLAN.md` → выполнить docs-only closeout в `docs/authentication-lifecycle-closeout` → открыть отдельный PR в main → `stages/DOCS-CLOSEOUT/RESULT.md` → STOP → Мира.
