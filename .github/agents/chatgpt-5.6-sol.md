# Мира — безопасность Vico Forum

## 2026-11-10 — Block B / B3 account-linking audit

1. Current main `e279cb6c032a489a9044ca1191407df887c364b4`; pinned Better Auth `1.7.7`.
2. **AUTH-LINK-01 confirmed, current-scope Moderate/P2:** OAuth explicit linking persists link userId/email in state but 1.7.7 callback does not re-check that the initiating session remains live before creating/updating the provider account.
3. Vico's custom `/link-social` before-hook protects initiation only; it cannot protect the later callback after logout/revoke.
4. Exact upstream hardening commit `f25081ac0476a9a4295f7a9736ae7239974c7b1e` adds the revoked-during-redirect regression. Better Auth `1.7.16` stores encrypted initiating session token in state and checks the durable session during callback.
5. Impact is constrained: Vico keeps `allowDifferentEmails` false, implicit linking disabled and rejects provider ownership conflicts. No arbitrary-account takeover was proven.
6. Guest initiation, forged stale-user identity, implicit matching-email sign-in linking, provider ownership collision, state replay and external callback/error callback redirect were checked and did not produce another confirmed finding.
7. Parallel duplicate account-row race was examined but not classified as a security defect without a demonstrated cross-user exploit path.
8. External real-Google reproduction remains Stage 6; source-level causal evidence is sufficient for the missing revocation boundary.

## 2026-11-10 — PR #317 security review

1. Target: PR #317 exact stable head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605`, base/main `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`.
2. Reviewed full changed-file security surface with emphasis on outgoing routing injection, absolute origins, redirects/forms, Admin/Super-admin links, request-scoped routing, guards and privilege boundaries.
3. Verdict: **PASS — 0 confirmed current-scope security defects**.
4. No changed file weakens `requireSuperAdmin`, Admin admission/mutation authz, session/auth runtime, Worker bindings, DB grants/schema or secrets.
5. AdministrativeRouting is not currently attacker-controlled: production LocaleBoundary injects no custom routing and server request context has no runtime setter in #317; defaults remain current same-origin routes.
6. IDs/cursors/query components remain encoded. Current Admin mutation form substitution is tested only same-origin; no cross-origin mutation transport is introduced.
7. Exact-head CI #42794915937, SA-01 Chromium #42794915727 and AP-10 Chromium #42794915509 verified SUCCESS.
8. Future-only security requirement: Stage-6 producer of absolute addresses must use strict trusted HTTPS origin validation/allowlist and separately design/accept cross-origin mutations. The present generic string AddressBase is safe only because no untrusted/runtime producer exists yet; this is not a current-stage defect.
9. This security review does not constitute the standard coordinator whole-PR PASS for #317 under #251.

## 2026-11-10 — scope correction

1. #315 является общим служебным каналом безопасности форума.
2. Предыдущее сужение канала до Super-admin было ошибкой координатора.
3. Основной рабочий план переименован в SECURITY_IMPLEMENTATION_PLAN.md и содержит общую security/pentesting карту.
4. Super-admin security сохранён как блок A, первый детально проработанный раздел, а не весь scope PR.
5. Общая карта включает auth/session, authorization, Admin/moderation, public application, attachments, DB/migrations, Workers/Cloudflare, secrets/supply-chain, integrations, abuse/availability, monitoring/incident response и release pentesting.
6. Карта покрытия не является автоматическим implementation scope; каждая проблема сначала классифицируется по фактической реализации и текущему Stage.
7. Implementation и external work сейчас не назначены.
