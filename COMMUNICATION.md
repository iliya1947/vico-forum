# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Final assembled gate

PR #388 exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601` passed the complete repository/local-CI automated gate after K5 correction.

1. CI #45926789854 — SUCCESS.
2. 3342/3342 standard tests PASS; 1998/1998 PostgreSQL tests PASS.
3. `tests/database/auth-whole-lifecycle.test.ts` — 62/62 PASS.
4. Production schema manifest — 76 tables; runtime privilege, split-authority and credential probes PASS.
5. 20/20 applicable connected acceptance workflows — SUCCESS, including fresh K5.
6. No failure/cancelled/in-progress relevant runs remain.
7. Merge-ref tree equals implementation head tree, so CI/acceptance checked the same code slice.

## K5 correction boundary

The correction is test/evidence-only. Product/runtime/schema/workflow code is unchanged. Fresh K5 passed 33/33. The old failing exact operation value was never captured; do not assert it post-factum.

## Review routing

Мира authored the final K5 correction. AGENTS forbids independent whole-PR/whole-feature review of one's own implementation. Therefore the formerly planned first final whole-feature review by Мира cannot be performed on this head.

A qualifying non-participant must be explicitly assigned by the owner for the first whole-feature review. Лёва and Ада are already disqualified from independent final review by their implementation participation. AUTH-07/merge/Stage-6 remain blocked.
