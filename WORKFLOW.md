# WORKFLOW.md — текущее состояние и следующий переход

## Текущее состояние

1. Собранный PR #388 открыт; current reviewed exact `5b29469fe51e716b483d4e610dd90705f5409029`, base/main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. AUTH-07 coordinator review Миры ранее PASS; три прежних finding Лены закрыты.
3. **Final technical review Лёвы — HOLD** с двумя guest password recovery defects: F-B2-03 и F-B2-04.
4. Мира независимо проверила оба finding против actual source и AUTH-03 contract: **оба подтверждены current-scope**; technical-plan correction не требуется.
5. Активирован единый bounded route: `stages/AUTH-07-CORRECTION-2/PLAN.md`.
6. **Лена / GPT-6.2 назначена исполнителем correction в #388.**
7. Лёва STOP до нового stable head; Марк и Лира не подключаются. По решению владельца текущая техническая работа ведётся только Лёвой и Леной.
8. Merge, docs closeout и Stage-6 остаются заблокированы.

## Следующий переход

Лена выполняет только `stages/AUTH-07-CORRECTION-2/PLAN.md` → author self-check → необходимые exact-head checks → `RESULT.md` → STOP. После AUTHOR PASS новый stable head возвращается Лёве на повторный owner-assigned final technical review. Implementation во время review не менять.
