# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Final assembled state

PR #388 exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`:
- base main `9f4c9c8d...`;
- tree `6f154a2489913165c088dfa25a20818b62c13662`;
- final CI PASS;
- 3342 standard + 1998 PostgreSQL tests PASS;
- auth whole-lifecycle 62/62;
- 20/20 applicable connected acceptance PASS;
- product/runtime/schema/workflow unchanged by final K5 correction.

## AUTH-07 review route

Мира cannot review her own final K5 implementation change. Лёва and Ада also participated in implementation.

Лира is eligible: her only recorded auth implementation assignment (AUTH-01) was removed before implementation began. She is now assigned as the first final whole-feature reviewer for the entire AUTH-01–AUTH-06 assembled feature, not merely K5.

Full review scope and gate rules: `stages/AUTH-07/PLAN.md`.

After Lira PASS, Mark / Codex-6 Sol is the planned independent final technical reviewer on the same exact head, but he is not activated yet.

AUTH-07 review is repository/local-CI only; it does not prove or activate real mail providers, Google OAuth, challenge provider, production Owner binding or Stage-6 rollout.
