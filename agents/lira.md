# agents/lira.md — персональная рабочая память Лиры по #342

## Текущее назначение

Moderation visibility stacked B1 — **исправить VIS-B1-MIRA-01** в Draft PR #355. B2 не начинать.

## Reviewed head

- PR #355 branch `feature/moderation-visibility-b1-foundation`.
- Reviewed exact head: `736da519e3f3fcae716ec5fb1b81886cdac63a6e`.
- Mira bounded B1 checkpoint: HOLD.
- Exact-head checks были зелёными, но finding — функциональная неполнота permission integration.

## VIS-B1-MIRA-01

`forum.content.visibility.manage` добавлен в permission catalog/schema/default grants и `db/user-measure-admin-forum.ts`, но пропущен в связанных существующих projections:

1. `app/admin/access.ts::ADMIN_FORUM_PERMISSIONS` — visibility-only holder сейчас не получает Admin Forum admission.
2. `app/routes/locale-boundary.tsx` — отдельный hard-coded header/Admin projection не проверяет новое permission, поэтому Admin entry не показывается visibility-only holder.
3. `app/admin/user-measure-restrictions.ts::USER_MEASURE_ADMIN_PERMISSION_FAMILIES["admin.forum"]` — family map расходится с authoritative wrapper; raw AP-10 authority/floor and family consumers не считают visibility permission частью admin.forum.

Исправить существующие карты/проекции и добавить focused parity regressions. Не добавлять B2 commands/routes/UI Hide/Restore.

После correction: self-check + applicable exact-head checks, обновить handoff и STOP Мире.

## Delivery model

B1 остаётся первой ступенью stack. B2 будет base на B1 branch только после Mira B1 PASS. Промежуточные ступени не merge в main; после B9 stack fold в B1, final Mira→Leva whole-feature review, owner merge.

## Границы

V-P1/V-P2/V-P3 и V-T1/V-T2 приняты. #342 never merge; Stage6/#300/general UI/UX вне scope.
