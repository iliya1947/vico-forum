# Общий контекст

Разработчик изменил порядок работы.

Сначала нужно **нормально починить то, что уже есть**: ужать действующие User / Project / AGENTS инструкции без добавления новых требований.

Правила текущего прохода:
- самостоятельные пункты не склеивать ради числа;
- сокращать воду, повторы, лишние пояснения и двусмысленность;
- для каждого сокращения сохранять смысл, модальность, субъект, область, исключения и полномочия;
- rejected drafts и старые PASS-метрики не использовать как base.

Новые общие улучшения интеллектуальной работы и логики отложены на вторую задачу. Материал `research/behavior-error-classes-reset.md` сохранён для неё.

Первый следующий проход — только действующие User Instructions.

## Текущий результат задачи 1

Whole-system check трёх current-based drafts завершён:
- total 22363 → 20009 chars (-10.53%);
- 97 → 97 самостоятельных нумерованных требований;
- новых требований 0;
- semantic regressions 0;
- новых межслойных конфликтов 0.

Evidence: `research/current-compression-whole-system-check.md`.

Реальные instruction sources не изменены. Новые интеллектуально-логические улучшения всё ещё отложены.

## Deep dedup closeout

После дополнительной межслойной проверки безопасно удалены только два служебных title и повтор agent mapping из Project (заменён ссылкой на обязательный AGENTS Roles). Остальные похожие правила сохраняются из-за различий scope/audience/frequency.

Итог Задачи 1: 22363 → 19921 chars (-10.92%), 97 → 97 rules, новых требований 0. Evidence: `research/current-deep-dedup-pass.md`.

## Межслойный dedupe — применено

К Project draft применены только подтверждённые D1–D4:
- удалены 2 полных дубля поведения из AGENTS;
- mapping имён/моделей оставлен ссылкой на AGENTS Roles;
- удалён поясняющий дубль из rule 2;
- Stage/future-groundwork rule сохранён.

Evidence: `research/project-cross-layer-dedupe-application.md`.

## Task 1 — финальный current-based результат

Final whole-system recheck: **PASS**.

Exact drafts:
- User `a6f16c64a68ebf372a4a6bb3ff146112463e7d68`;
- Project `8cdf099aa3ecd0c1bbd295cbbba1353cca327995`;
- AGENTS `3505f50d275e7e938575fa366bd6f00d1e4c9972`.

Итого: 22363 → 18945 chars (-15.28%), 97 → 97 rules, new requirements 0, semantic regressions 0, new cross-layer conflicts 0.

Evidence: `research/task1-final-whole-system-recheck.md`.
Реальные sources не изменены.
