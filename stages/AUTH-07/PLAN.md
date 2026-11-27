# stages/AUTH-07/PLAN.md — final pre-Stage-6 security gate

## Цель

Провести финальный whole-feature review собранной authentication lifecycle vertical AUTH-01–AUTH-06 на одном stable exact head перед обязательной independent technical review и owner merge.

## Exact head

PR #388 / `feat/auth-01-mail-foundation`:
- base main: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`;
- exact head: `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`;
- tree: `6f154a2489913165c088dfa25a20818b62c13662`.

Final automated gate на этом head — PASS:
- CI #45926789854 SUCCESS;
- 3342/3342 standard tests;
- 1998/1998 PostgreSQL tests;
- auth-whole-lifecycle 62/62;
- 20/20 applicable connected acceptance SUCCESS;
- relevant failures/cancelled/in-progress = 0.

## Review routing

1. По прямому назначению владельца **Лена / GPT-6.2 выполняет первый final whole-feature review**.
2. Лира снята с review до начала работы.
3. Лена участвовала в AUTH-02a implementation и начинала AUTH-02b, поэтому этот first review **не считается independent final technical review**.
4. После PASS Лены отдельным следующим переходом назначается **Марк / Codex-6 Sol** как independent final technical reviewer на том же exact head. Марк сейчас не активирован.
5. Merge возможен только после обязательного independent PASS Марка и последующего owner action.

## Scope Лены

1. Проверить весь assembled AUTH-01–AUTH-06 результат как одну feature.
2. Сверить D-01–D-10 / AUTH-07 gate с actual implementation и AUTH-06 evidence:
   - identity isolation / explicit linking;
   - purpose/subject/generation/token lifecycle;
   - recovery + session invalidation;
   - usable-method invariants / concurrency;
   - AccountState / deactivation boundaries;
   - direct vs HTTP / origin / freshness;
   - multi-write atomicity / uncertainty/fault paths;
   - rate/challenge/privacy;
   - History/Monitoring proof;
   - отсутствие скрытой external activation.
3. Проверить K5 correction как часть final head: test/evidence-only delta не должна ослаблять matrix или скрывать product defect.
4. Проверить Stage boundaries; future-only Stage-6 risks не считать blockers.
5. Green CI использовать как evidence, не как замену review.

## Ограничения

1. Во время review implementation не менять.
2. Findings классифицировать: confirmed current-scope defect / unrelated current-stage defect / future-only.
3. Первый finding не завершает review; пройти весь scope.
4. При current-scope blocker собрать findings одним пакетом, записать HOLD и STOP.
5. При отсутствии blockers записать PASS и STOP.
6. Не запускать проверки повторно без фактической причины.
7. PASS Лены не заменяет обязательный independent technical review Марка.
8. External providers / production / Stage 6 не активировать.

## Done

- review проведён против exact `71cdb70d...`;
- весь AUTH-01–AUTH-06 scope и D-01–D-10 проверены;
- findings классифицированы;
- `stages/AUTH-07/REVIEW.md` содержит PASS или HOLD с evidence;
- при PASS Лена STOP для отдельного назначения Марка;
- при HOLD implementation не меняется до отдельного correction route.
