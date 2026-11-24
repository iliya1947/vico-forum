# agents/leva.md — Task6 WF-01 correction ACTIVE

Mira whole-feature review of #379 exact `bf3e97d6c52b224d1a77bd14f96597b446405472` is **HOLD** with one confirmed current-scope finding.

## WF-01

Create Category does not preserve the S7/S9 uncertain-response fence. Current `CreateCategoryForm` lacks unknown-attempt blocking. After a real create COMMIT with missing typed action payload, default React Router post-action revalidation can advance the loader's `structureVersion` while the entered name remains and Submit becomes available. Since duplicate names are valid and create IDs are server-generated, another click can create a second category without the required explicit result verification.

## Required result

Correct **WF-01 only**:
- committed-but-unconfirmed category create cannot enable another create before explicit fresh verification;
- retain entered name/context;
- never auto-replay POST;
- add focused regression proving real/equivalent commit + lost acknowledgement leaves exactly one category until user explicitly refreshes/verifies;
- preserve normal confirmed success and typed error behavior.

After correction: new stable final exact #379, author self-check + applicable exact-head CI/acceptance, then **STOP → Mira whole-feature re-review**. Do not start Mark, F7/docs, Stage6/deploy or #300.
