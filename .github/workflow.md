# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-10 second corrected-head coordinator whole-PR review
- Main/base: `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`
- Technical planner/reviewer: Лёва; implementer: Лира; coordinator/reviewer now: Мира
- Technical plan: coordinator PASS, AP10-PLAN-MIRA-01..06 closed
- Implementation PR: #290 Draft/open/mergeable
- Previous reviewed implementation head: `503a5c6dc570e2c6c0f64f59e7fe5bf390a90b13`
- Previous reviewed implementation head: `52a1db67610357f514e8013b06f70af6bda629c6`
- Current stable implementation exact head: `ad789c7bf28d4fe7896e8ddbf7757460e046da27`
- Current implementation diff: 111 changed files; second correction delta from previous reviewed head: 15 commits / 13 files
- Current exact-head CI #42209643642: SUCCESS
- Current exact-head isolated browser acceptance #42209643650: SUCCESS (author evidence, not independent/owner visual acceptance)
- Documentation PR: #291 Draft/open/mergeable, exact head `e54f1b23ea8030df6171932cb640d1706867af6c`, 6 Markdown files
- Documentation CI #42173496053: SUCCESS
- Implementation/docs не merged; production/Stage 6 не менялись
- Current reviewer: Мира; Лира second correction package завершила; Лёва independent review не назначен до coordinator PASS
- Owner visual acceptance: не запрошен и не инициируется
- Coordinator pass 1 complete: data model/lifecycle/reasons/appeals; confirmed AP10-MIRA-01..02, handoff deferred until full review complete
- Coordinator pass 2 complete: authority/permissions/privileged targets; confirmed AP10-MIRA-03..04
- Coordinator pass 3 complete: restriction enforcement; confirmed AP10-MIRA-05, server-side catalog enforcement otherwise passed
- Coordinator pass 4 complete: privacy/History/routes/UI state/revalidation/localization; confirmed AP10-MIRA-06..07, privacy/revalidation/RTL/browser-layout boundaries otherwise passed
- Coordinator pass 5 complete: tests/CI coverage, migration/runtime privileges, browser evidence and final gap sweep; no additional defects
- Coordinator whole-PR review complete: NOT PASS, seven confirmed current-scope defects AP10-MIRA-01..07
- Independent Codex review remains blocked until a corrected stable implementation head passes a new coordinator cycle
- Corrected-head coordinator review complete on exact head `52a1db67610357f514e8013b06f70af6bda629c6`: исходные AP10-MIRA-01..07 закрыты, но final interaction sweep подтвердил AP10-MIRA-08..10
- AP10-MIRA-08: ordinary blocks.manage UI всё ещё предлагает administrative restriction families, которые authoritative server запрещает без elevated authority
- AP10-MIRA-09: floor-aware permission projection расходится с direct authoritative admin-family guards, которые игнорируют issuer floor после equal/higher raw grant
- AP10-MIRA-10: AP-10 restriction revalidation размонтирует already-open create-topic/Help/published-edit Editor operations вместо сохранения buffer + Cancel/cleanup при запрещённом Publish/Save
- Coordinator verdict на `52a1db67610357f514e8013b06f70af6bda629c6`: NOT PASS
- Second correction package AP10-MIRA-08..10 зафиксирован для Лиры в service-channel.md
- Следующий шаг: Лира исправляет PR #290, выполняет applicable exact-head CI/browser evidence и фиксирует новый stable head; затем Мира начинает новый coordinator whole-PR review. Лёва independent review только после coordinator PASS
- Last-manager cleanup / owner-role redesign: отдельная задача после admin panel
- AP-11/Settings/Stage 6/production не начинались; Марк не назначен

- Second corrected-head coordinator pass 1 complete on `ad789c7bf28d4fe7896e8ddbf7757460e046da27`: AP10-MIRA-08 and AP10-MIRA-09 closed by cause; confirmed current-scope AP10-MIRA-11 (exact measure detail exposes Change/Lift/Review controls to actor below stored issuer floor although authoritative transitions reject them)
- Next step: Мира проверяет AP10-MIRA-10 Editor lifecycle, затем final regression/evidence sweep; correction handoff не начинать до завершения whole-PR review

- Second corrected-head coordinator pass 2 complete: AP10-MIRA-10 closed by cause; retained Create Topic / Help Question / Published Edit lifecycle, publication blocking and Cancel/cleanup boundaries verified; no new current-scope Editor finding
- Next step: final regression/evidence sweep of PR #290 exact head `ad789c7bf28d4fe7896e8ddbf7757460e046da27`; AP10-MIRA-11 remains confirmed and no correction handoff starts until whole-PR review is complete

- Second corrected-head coordinator final sweep complete on `ad789c7bf28d4fe7896e8ddbf7757460e046da27`: AP10-MIRA-01..10 remain closed; no additional current-scope findings confirmed
- Coordinator verdict: NOT PASS solely because AP10-MIRA-11 remains open (exact measure detail exposes Change/Lift/Review controls when actor is below stored issuer floor although authoritative mutations reject them)
- Next stage: one bounded AP10-MIRA-11 correction package to Лира; after new stable exact head and applicable CI/browser evidence, restart coordinator review. Лёва remains blocked until coordinator PASS
