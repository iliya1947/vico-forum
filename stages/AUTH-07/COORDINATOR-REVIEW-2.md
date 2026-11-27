# AUTH-07 — coordinator re-review после correction-2

**PASS** на stable exact `5d8bdaad117e59326f5eae61ea13613b0d45df7c`.

## Проверенная delta

Correction относительно HOLD head `5b29469fe51e716b483d4e610dd90705f5409029` состоит из 3 commits и меняет только:

1. `app/routes/reset-password.tsx`;
2. `tests/browser/auth-02b/check.py`.

Мира проверила correction diff и затронутые recovery/privacy/return-path boundaries. Подтверждённых current-scope blockers в delta не найдено.

## Findings Лёвы

1. **F-B2-03 — PASS.** Reset page теперь захватывает valid proof при mount и native `hashchange`, scrubbed через существующий `takeCredentialProof`, не делает terminal POST автоматически и не теряет новый proof, пришедший во время pending explicit POST.
2. **F-B2-04 — PASS.** Retry link строится из server-validated `returnTo` loader-а; повторный forgot flow снова валидирует путь и передаёт его в новое письмо. Unsafe/cross-locale значения продолжают сводиться к locale-root существующим guard.

## Exact-head automated evidence

Head: `5d8bdaad117e59326f5eae61ea13613b0d45df7c`.
Base/main: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
Tree: `59901b92ce2753fb69adaa9c43ff09bbbcd70dba`.

1. CI #46010040782 — **SUCCESS**.
2. Standard checks: **3347/3347** tests; 252 files.
3. PostgreSQL 17: **1998/1998** tests; 123 files.
4. `auth-whole-lifecycle.test.ts`: **62/62**.
5. Applicable connected acceptance: **20/20 SUCCESS**.
6. AUTH-02b #46010040434 — SUCCESS на exact head; прошли новые markers:
   - `AUTH07-reset-retry-preserves-return-and-same-document-replacement`;
   - `AUTH07-reset-reopened-proof-after-refresh-without-auto-POST`;
   - `AUTH07-reset-unsafe-return-falls-back-through-forgot`.
7. K5, AP-10 и SA08 — SUCCESS.
8. Failures/cancelled среди применимых exact-head runs: **0**.

## Verdict

**COORDINATOR RE-REVIEW PASS.**

Лена STOP. Следующий переход — повторный owner-assigned final technical review Лёвы на этом exact head. Лёва ранее участвовал в AUTH-06, поэтому его verdict не называется independent PASS. Merge/docs/Stage-6 остаются заблокированы до результата Лёвы и следующего решения владельца.
