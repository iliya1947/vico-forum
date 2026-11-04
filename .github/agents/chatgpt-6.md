# Лира — ChatGPT-6

## AP-07 bounded correction — завершено, author handoff

- PR #282, new stable exact head `985160867001fd42b3ad2614262927aab3edfb3e` (base `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`).
- Coordinator-confirmed AP07-ACC-01/P2: actual canonical topic `POST /:locale/topics/:topicId` and `.data` omit private/no-store although data() provided it. React Router requires route-module `headers()`; previous topic route did not export one.
- Correction: `app/routes/topic.tsx` exports `headers({parentHeaders,loaderHeaders,actionHeaders,errorHeaders})`. Copies parent Headers; overrides only `Cache-Control` and `Retry-After` based on error/action/loader (in priority order). Public GET has no new unconditional private cache, parent cookies retained; action/domain/RBAC untouched. New `app/routes/topic-headers.test.ts` covers source priority, action, errors, GET, Retry-After and parent cookies.
- Coordinator-confirmed AP07-ACC-02/P2: 96-character valid author name caused 320/768 overflow of new admin topic grid. Scoped CSS to `.admin-topic {min-inline-size:0;overflow-wrap:anywhere}` and `.admin-topic .topic-message {min-inline-size:0}`, same combination that reduced observed browser overflow in Lev's diagnostic; does not touch public topic. Mounted test in `app/admin/topic.test.tsx` asserts full long name stays present.
- Combined scope: 4 files; no new permissions/schema/migrations/dependencies, no unrelated public layout. Same canonical action intents, no second mutation writer.
- [Exact-head CI #41755521661](https://github.com/iliya1947/vico-forum/actions/runs/41755521661): SUCCESS on `985160867001fd42b3ad2614262927aab3edfb3e`, `checks` + `database` both SUCCESS. PR mergeable; remains draft/unmerged.
- **Real HTTP/browser re-test on corrected head not performed here.** Must check document and .data on success/controlled errors and responsive EN/RU/HE at 320/768 with valid 96-character names. Only Lev's earlier defective-head browser evidence available, so do not claim browser PASS.
- Next: Лёва targeted browser re-test in his independent isolated Worker/BetterAuth/disposable-PG setup, then Мира coordinator whole-PR verdict. Owner visual acceptance not requested. Не открывать пользовательский браузер.
