# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**; implementation PR #388 к unchanged main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. Final assembled auth head после K5 correction: `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`.
3. Delta к accepted AUTH-06 assembly `615d93598...` — только `tests/browser/sa04-attachments/check.py` (+59/-6); product/runtime/schema/dependencies/workflow не менялись.
4. Source-level K5 correction self-check — PASS.
5. Targeted K5 verification — PASS: run #45922622929, 33/33, external/page errors отсутствуют.
6. **Final automated gate assembled #388 — PASS.**
   - CI #45926789854 — SUCCESS.
   - checks: 252 files / 3342 tests PASS; lint/typecheck/build/migration metadata/parity PASS.
   - database: 123 files / 1998 tests PASS; `auth-whole-lifecycle` 62/62; schema manifest 76 tables; runtime privilege/split-authority/credential probes PASS.
   - 20/20 applicable connected acceptance workflows — SUCCESS.
   - failures/cancelled/in-progress = 0.
   - CI/K5 checkout merge-ref `d28248dbdd915c748ce86b37e28c38f99ba116cb` has tree `6f154a2489913165c088dfa25a20818b62c13662`, identical to implementation head tree.
7. Skipped duplicate runs from the opposite label event are not counted as acceptance evidence.
8. K5 historical two failures still lack captured exact old operation value; correction/runtime PASS is established without rewriting that unknown as fact.
9. **Review routing blocker:** Мира implemented the K5 correction, therefore under AGENTS she cannot perform an independent whole-feature review of this same final head. The previous route “Mira final whole-feature review” is no longer valid.
10. AUTH-07, independent final review, main merge and Stage-6/external activation remain blocked until the owner assigns a qualifying first whole-feature reviewer for exact `71cdb70d...`.

## Следующий переход

Owner must reassign the first final whole-feature review of assembled #388 exact `71cdb70d...` to an agent who did not implement any part being reviewed. Do not start AUTH-07 or merge before that review route is established and completed.
