# agents/lira.md — персональная рабочая память Лиры по #342

## Текущее назначение

Moderation visibility, stacked delivery. Реализовать только **B1 — schema/catalog/History foundation**.

## Delivery model

Owner утвердил stacked bounded PR workflow:
- B1 base = current `main`;
- B2 base = head-ветка B1; далее лестницей до B9;
- промежуточные PR не merge в `main`;
- после B9 итоговый head сворачивается в B1;
- B2–B9 закрываются как superseded;
- собранный B1 проходит final Mira → Leva whole-feature review и owner merge.

После каждого bounded B-stage: self-check + applicable checks → STOP для coordinator checkpoint. Не начинать следующий B самостоятельно.

## B1 scope

- forward migration после актуального migration ceiling;
- topic/post visibility fields, CHECK/partial indexes;
- `forum.content.visibility.manage` и initial grants;
- AP-10 `admin.forum` mapping/admission;
- typed Admin History actions/constraint/labels/Owner monitoring classification;
- schema/journal/snapshot/manifest/ACL/catalog/provisioning regressions, default-visible verification;
- никаких route-exposed Hide/Restore;
- не начинать B2 transactional commands/writer gates.

Полный технический контракт и acceptance: `stages/moderation-visibility/PLAN.md`.

## Границы

V-P1/V-P2/V-P3 уже приняты. Не переоткрывать продуктовые решения. V-T1/V-T2 fit PASS. #342 никогда не merge. Stage6/#300/general UI/UX вне scope.
