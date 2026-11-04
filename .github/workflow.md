# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-07 — bounded correction
- Статус: два current-scope runtime defect подтверждены coordinator triage; correction назначен Лире
- Base/main: `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`
- Implementation PR: #282 (draft)
- Defective exact head: `b0d5e74663cd57851225447e792ab4a9bf98322c`
- Exact-head CI #41746716082: SUCCESS; browser acceptance FAIL
- AP07-ACC-01 / P2: private/no-store теряется на конечных canonical topic action HTTP responses
- AP07-ACC-02 / P2: admin topic overflow на mobile/tablet при допустимом длинном display name
- Исполнитель correction: Лира — ChatGPT-6
- Следующий шаг: Лира исправляет оба дефекта одним bounded package в #282 и публикует новый stable exact head; затем applicable checks/CI и targeted actual browser re-test
- Owner visual acceptance не запрашивался; AP-08+/merge/production rollout не начинать
