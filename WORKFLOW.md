# WORKFLOW.md — Task6 / whole-feature coordinator HOLD

## Активный gate

**Mira whole-feature review — HOLD** на final Draft #379 exact `bf3e97d6c52b224d1a77bd14f96597b446405472`.

- Base main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- F1–F5 bounded coordinator PASS и F6 author gate/assembly metadata подтверждены.
- Final #379 остаётся Draft/open/unmerged; intermediate #380/#381/#382/#383/#386 closed superseded/merged=false; main не изменён.
- Exact CI `45310905077` SUCCESS; whole-feature connected Chromium/local-R2 `45310913957` SUCCESS. Green author evidence не закрывает finding ниже.

## Confirmed current-scope finding — WF-01

**Create Category не соблюдает accepted uncertain-response contract S7/S9.**

Фактическая цепочка на current final exact:
1. `CreateCategoryForm` отправляет ordinary `fetcher.Form` без per-submission revalidation opt-out и без состояния unknown/attempted.
2. После реального successful action React Router 8.3.1 по умолчанию revalidate'ит active loaders.
3. Если category create успел COMMIT, но typed action payload не получен/потерян (тот же класс uncertain acknowledgement, который F6-01 уже доказал для Move), loader может вернуть новую `structureVersion`.
4. Компонент остаётся смонтированным по actor key; введённое имя не очищается, typed response/error отсутствует, blocking состояния нет.
5. Submit снова становится доступен уже с новой version. Duplicate display names разрешены, IDs серверные, поэтому осознанно/случайно повторённый submit может создать второй объект вместо обязательной explicit result verification.

Это текущий Task6 defect, не future hardening: PLAN S7 требует при ambiguous transport outcome явный refresh/проверку состояния, без silent expectation replacement/automatic replay; create отдельно не должен получать возможность второго объекта через тихое обновление version.

Текущие F5/F6 tests покрывают typed create success/errors и lost-ack Move, но не post-commit/lost-ack Create Category.

## Correction → Leva

Scope **только WF-01**. Не расширять структуру, API, docs или Stage.

Required result:
- после committed-but-unconfirmed Create Category UI не считает исход подтверждённым и не позволяет новый create до явного fresh verification;
- введённое имя сохраняется для понимания/проверки результата;
- никакого automatic POST replay;
- regression доказывает, что lost acknowledgement после реального commit оставляет ровно один созданный category и требует explicit refresh перед новой командой;
- normal confirmed success и typed 4xx/5xx behavior остаются корректными.

После correction: новый stable exact #379 → Leva author self-check + применимые exact-head CI/acceptance → STOP → новая Mira whole-feature review. Mark до coordinator PASS не подключается.

## Остальной whole-feature review

В остальном подтверждённого current-scope blocker не найдено:
- accepted F1–F5 heads — прямые ancestors final; F6 добавляет один commit;
- migration/schema/runtime ACL, permissions/AP-10, lock graph, receipt current-location replay, coherent/private readers, hidden dual authority и original Owner History согласуются с PLAN;
- F6-01 Move correction валидна на pinned React Router 8.3.1 source API;
- whole-feature connected matrix использует реальные Worker/Better Auth/PG17/Chromium/local-R2 operations для проверяемых effects.

## Границы

- Не merge #379 и не активировать Mark/F7.
- #342 — единственный service channel, никогда не merge.
- #300/Stage6/general UI/UX/deploy не активированы.
