# ChatGPT Process Context

> **CHATGPT-SIDE WORKING MEMORY — NOT A PROJECT SOURCE OF TRUTH**
>
> This file exists so ChatGPT does not lose the purpose, ownership model, or stage sequence of the remediation process while working through PR #79. It does not modify product architecture, roadmap, current project state, or audit findings.

## Why this process started

The primary cause is **ChatGPT's systematic review failures**.

ChatGPT repeatedly misclassified intentional future-proof scaffolding prepared by Codex for later stages as defects of the current stage. This was not merely a hypothetical risk: ChatGPT repeatedly required Codex to change, remove, or rework valid future-oriented boundaries because their consumers were not yet implemented.

Therefore the remediation process exists primarily to find and correct the consequences of **ChatGPT's own historical review mistakes** across the project.

A future consumer, unused abstraction, schema boundary, adapter, cache/persistence primitive, or other staged preparation is **not a defect merely because it is not yet consumed in the current stage**. Any suspected defect must first be checked against the scope and intent of the stage where it appeared, its accepted future consumers, later dependency history, and the cost of retrofitting the boundary later.

The audit may also uncover genuine Codex/project defects, but those are findings to prove from evidence. They are **not the reason this global remediation process was started**.

## Ownership and roles

**Codex leads this process.**

Codex:
- defines the audit/remediation tasks;
- independently verifies ChatGPT submissions and evidence;
- maintains the authoritative working ledger in PR #78;
- controls progression between audit stages;
- performs the cross-stage synthesis;
- identifies questions that genuinely require the user.

ChatGPT is the supporting reviewer working under Codex's process direction.

ChatGPT:
- reads the current PR #78 head before acting;
- performs the bounded research/extraction/review tasks assigned by Codex;
- publishes its responses only in PR #79;
- supplies evidence, counter-evidence, and challenges when technically justified;
- does not take over process leadership;
- does not treat its own findings as accepted until Codex independently verifies them;
- does not write to PR #78.

The user is the final decision-maker for unresolved product, architecture, or operational choices that evidence cannot settle.

## Five-stage remediation process

### Stage 1 — Full historical decision audit

Current stage.

Reconstruct the decision history across PR #12–#77, including required pre-baseline ancestry where needed. Identify atomic decisions, provenance, implementation history, review interventions, supersessions, dependencies, evidence limitations, and intentionally deferred future consumers.

A central purpose is to find where ChatGPT's historical reviews incorrectly treated valid future-proof preparation as a current-stage defect and to trace any changes caused by those reviews.

No product/code/documentation correction is made merely from a preliminary finding.

### Stage 2 — User decisions on unresolved conflicts

After evidence collection and cross-stage review, Codex presents only questions that repository evidence cannot objectively resolve.

The user decides between valid competing product, architecture, or operational choices.

### Stage 3 — Define target contracts

Using the completed audit plus user decisions, establish the intended target contracts and architecture.

Determine what must remain, what was superseded, what needs restoration, and what boundaries belong to future stages.

### Stage 4 — Restore project documentation

Update project documentation so it reflects the approved target contracts and actual intended architecture rather than historical ChatGPT review mistakes or superseded intermediate states.

Documentation repair follows the completed audit/target-contract work; documentation is not used to retroactively prove its own correctness.

### Stage 5 — Correct implementation

Make the required code, test, configuration, workflow, schema, or other implementation corrections derived from the final audit and target contracts.

Do not perform blanket rollback or speculative cleanup. Correct only issues established by the completed process.

## Non-negotiable reminder for ChatGPT

1. **The process began because ChatGPT systematically made bad review calls about future-proof scaffolding.**
2. **Codex is the process lead; ChatGPT is supporting him.**
3. **Do not call an intentionally deferred future consumer a defect simply because it was incomplete at an earlier stage.**
4. **Before proposing a correction, distinguish a real defect of that historical stage from deliberate preparation for a later accepted stage.**
5. **Keep PR ownership strict: Codex writes PR #78; ChatGPT writes PR #79.**
