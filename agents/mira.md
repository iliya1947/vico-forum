# agents/mira.md — персональная память Миры по stale/legacy audit

Текущий owner-route: service PR #390 — dedicated канал всего stale/legacy audit/cleanup.

Baseline: 80 exact A on `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

Current main: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`; relevant audited files изменились. Не переносить 80 как current exact без R0 reconciliation.

C1: Draft #377 exact `d4f820166bc905e28e2ae818854e6f8038c96ea1`, old author PASS/CI, сейчас ahead 3 / behind 4. Перед review — revalidate A-011…A-026, sync, fresh CI/self-check.

Current action: STOP после переноса. Не менять #377 и не начинать C2 без продолжения владельца.
