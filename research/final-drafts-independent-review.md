# Независимая проверка финальных Task 1 drafts

Проверены exact финальные blobs из #368:
- User `a6f16c64a68ebf372a4a6bb3ff146112463e7d68`;
- Project `8cdf099aa3ecd0c1bbd295cbbba1353cca327995`;
- AGENTS `3505f50d275e7e938575fa366bd6f00d1e4c9972`.

Current baseline:
- User `fdcae11e68d2f69e796862be88a6eb2f133467d2`;
- Project `016b843a6c5d526921b64319a53c616a556ec5d8`;
- AGENTS `9037fc15fd2b5fbf8c86ee677d00198dfcfbe442`;
- current main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Verdict

**HOLD.** Task 1 final whole-system PASS is not valid.

## Confirmed findings

### F-01 — Project goal guard lost full trigger/scope

Current Project contains an independent unconditional rule:

> Всегда рассуждай от цели — не делай выводов и не действуй, пока не понимаешь, зачем это нужно!!!

Final Project draft removes it entirely.

The cited replacement in AGENTS Logic is narrower:
- trigger: only **before a substantial conclusion or self-chosen action**;
- current Project trigger: **always**, before conclusions/actions generally.

Therefore the replacement does not preserve the same trigger/scope. This is not delete-safe cross-layer dedupe.

### F-02 — mandatory pre-answer context/interpretation check lost full trigger/scope

Current Project contains:

> Всегда перед ответом внимательно проверь, не упустила ли ты что-то очевидное из уже сказанного или происходящего в текущей задаче. Не отвечай автоматически по первой пришедшей трактовке — сначала сопоставь её с контекстом.

Final Project draft removes the whole rule.

AGENTS Logic 1 + Principle 3 do not fully replace it:
- they do not impose an explicit **before every answer** checkpoint;
- they do not explicitly require checking whether something obvious from the conversation/current task was omitted before responding;
- Logic 1 is limited to substantial conclusions/self-chosen actions.

So the final draft weakens a current Project requirement.

## Other layers

### User

PASS. 15 → 15 rules; reviewed wording reductions preserve current trigger, modality and scope. No confirmed semantic loss found.

### AGENTS

No confirmed blocker after independent pass.

The most sensitive dedupe is Leva Role 6: the role text no longer enumerates plan stages/dependencies/readiness criteria. However the behavior remains normatively covered by the mandatory service-PR structure: `PLAN.md` is defined as the full technical plan with implementation model, stages, dependencies and readiness criteria, while AGENTS Workflow 6 still requires Leva to prepare the full plan before implementation. Therefore this is not counted as a confirmed semantic loss.

Other checked internal dedupe targets retain equivalent coverage in Workflow/Review/Logic sections.

## Why the previous final PASS failed

The final metric `97 → 97 numbered rules` did not protect unnumbered independent requirements. The semantic recheck then treated similar but narrower AGENTS rules as fully equivalent without matching trigger/scope.

## Required correction

Only Project draft needs correction for confirmed findings:
1. restore equivalent unconditional goal guard;
2. restore equivalent mandatory pre-answer context/interpretation guard;
3. rerun current→draft and three-layer semantic check on the new exact Project blob.

Do not modify User/AGENTS merely to compensate unless a new independent finding requires it.
