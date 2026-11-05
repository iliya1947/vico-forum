# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-09 closeout blocked by confirmed test-race `AP09-MIRA-05`
- AP-09 implementation PR #287: merged в `main`
- Main / merge commit: `386023ce892044e623ec3d24f8a724e92af61a31`
- Documentation PR: #288 — Draft/open, docs content review PASS
- Documentation head: `c1e20a79d69918bb0bf62d9f3acec0d013ddfd45`
- Docs scope: ровно 5 файлов; factual consistency/overscope review PASS
- CI #41951777119: database SUCCESS; checks FAIL на `app/admin/users-authorization.test.tsx`
- Failed checks rerun on unchanged docs head: FAIL снова в том же test, но на другом recovery-cycle
- Confirmed defect: `AP09-MIRA-05` — test-only synchronization race; runtime AP-09 defect не подтверждён
- Исполнитель correction: Лира
- Correction scope: отдельный test-only PR от current main; `app/admin/users-authorization.test.tsx`; ждать positive recovered detail state до terminal assertions; runtime code не менять без нового evidence
- Codex не нужен: технический план/runtime design не пересматривается
- #288 остаётся Draft и не меняется до merge test correction
- После correction: coordinator verify exact test-only diff + CI → owner merge correction → sync/rebase #288 на новый main → rerun docs CI → финальный Ready
- Actual authenticated AP-09 browser/deployed acceptance не выполнялась; отдельный mandatory gate не назначен
- AP-10/blocking/Settings/Stage 6/production вне scope; Марк не назначен
