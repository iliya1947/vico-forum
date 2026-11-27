# stages/AUTH-07/PLAN.md — final pre-Stage-6 security gate

## Цель

Провести финальный whole-feature review собранной authentication lifecycle vertical AUTH-01–AUTH-06 на одном stable exact head перед независимой technical review и owner merge.

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

1. Мира не может выполнять first whole-feature review этого head, потому что сама authored финальную K5 test/evidence correction.
2. Лёва и Ада не подходят для independent final review из-за участия в implementation.
3. **Лира / GPT-6 назначена первым final whole-feature reviewer.** Она не участвовала в implementation authentication stack; AUTH-01 был снят с неё до начала реализации.
4. После PASS Лиры отдельным следующим переходом назначается **Марк / Codex-6 Sol** для independent final technical review на том же exact head. Марк сейчас не активирован.

## Scope Лиры

1. Проверить весь assembled AUTH-01–AUTH-06 результат как одну feature, а не только K5 correction.
2. Сверить D-01–D-10 / AUTH-07 security gate с actual implementation и AUTH-06 evidence:
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
4. Проверить, что accepted Stage границы сохранены и future-only Stage-6 risks не выдаются за blocker.
5. Green CI использовать как evidence, но не как замену review.

## Ограничения

1. Во время review implementation не менять.
2. Findings сначала классифицировать: confirmed current-scope defect / unrelated current-stage defect / future-only.
3. Первый finding не завершает review; пройти весь scope.
4. Если найден current-scope blocker — собрать findings одним пакетом, записать HOLD и STOP.
5. Если blocker не найден — записать PASS и STOP.
6. Не запускать проверки повторно без фактической причины; exact head уже имеет final automated PASS.
7. AUTH-07 PASS Лиры не даёт merge authority и не заменяет следующий independent technical review Марка.
8. External providers / production / Stage 6 не активировать.

## Done

- review проведён против exact `71cdb70d...`;
- весь AUTH-01–AUTH-06 scope и D-01–D-10 проверены;
- findings классифицированы;
- `stages/AUTH-07/REVIEW.md` содержит PASS или HOLD с evidence;
- при PASS Лира STOP для следующего отдельного назначения Марка;
- при HOLD implementation не меняется до отдельного correction route.
