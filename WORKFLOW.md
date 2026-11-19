# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Consolidated corrective implementation PR #354 — **Mira whole-PR review HOLD** на stable exact head `01cecb91090a2f29f90b7c6ae4a83db77a0f4910`.

## Текущее состояние

- Draft #354 открыт, не merged. Base `a645fbe21110e77429025c428e498194b9a92ca2`.
- Current GitHub main `bb3d44f940f44a4f08c4a501d9d0b3deaa50eb02`; отличие от PR base только service-workspace docs/regulation, продуктовый код не менялся.
- Diff #354: ровно 9 файлов — Watch control+tests, Bookmark control+tests, Bookmarks list+tests, Title editor+tests и Title connected browser test.
- WATCH-AUDIT-1, BOOKMARKS-AUDIT-1 и BOOKMARKS-AUDIT-2 подтверждены Мирой как корректно закрытые на этом exact head.
- TITLE-AUDIT-1 основная Save/Cancel post-DOM focus correction работает и покрыта component + real Chromium.
- Exact-head 7/7 workflows SUCCESS; CI checks/database SUCCESS; dedicated Watch, Bookmarks и Title connected SUCCESS.

## Coordinator finding

**TITLE-AUDIT-1-R1 [P3] — pending focus request переживает отсутствие opener после permission loss.**

Подтверждённая causal sequence в текущем production component:

1. Same actor/topic открывает title editor.
2. Loader revalidation меняет `canEdit` на false при сохранённом draft — этот permission-loss path уже существует и тестируется.
3. Пользователь нажимает Cancel: `restoreOpenerFocus.current = true`, затем `draft = null`.
4. Компонент остаётся смонтирован под тем же actor/topic key, но возвращает `null` из-за `!canEdit && !draft`; opener отсутствует, focus effect возвращается **без очистки** `restoreOpenerFocus.current`.
5. Если позже тот же mounted component получает `canEdit=true` при новой revalidation, opener снова появляется; dependency `canEdit` запускает effect и старый focus request неожиданно фокусирует Edit-title кнопку спустя время после Cancel, потенциально отбирая текущий фокус у пользователя.

Это текущий scope TITLE-AUDIT-1, не будущая feature: correction сама вводит short-lived focus request и должна гарантировать, что request не переживает невозможность immediate restoration.

## Назначение и следующий шаг

**Лира / ChatGPT-6** — один узкий correction TITLE-AUDIT-1-R1 в том же #354:

1. не позволять focus request переживать close transition, если opener после него недоступен/невидим;
2. нормальный Save/Cancel при доступном opener по-прежнему возвращает focus после DOM commit;
3. не менять title write/CAS/conflict/rebase/permission semantics;
4. добавить regression: permission loss с открытым draft → Cancel/close без opener → focus переносится/остаётся на другом доступном элементе → permission возвращается при revalidation → Edit-title появляется, но старый request не крадёт focus;
5. применимые focused checks + stable exact head + author self-check;
6. STOP Мире.

После изменения implementation head coordinator whole-PR cycle начинается заново. Лёву до свежего Mira PASS не подключать.

## После #354

Moderation visibility → forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.
