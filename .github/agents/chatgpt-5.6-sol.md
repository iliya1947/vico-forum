# Мира — Super-admin security

## 2026-11-10 — service channel created

1. Owner requested a dedicated service PR and plan for maximum Super-admin protection.
2. Current baseline and source-of-truth reviewed: `AGENTS.md`, `PROJECT.md`, `PROJECT_STATE.md`, `docs/SUPER_ADMIN.md`, `docs/auth/AUTHORIZATION.md`, `docs/database/HYPERDRIVE.md`, current Worker/routes/auth/Owner monitoring implementation.
3. Target architecture fixed in `SUPER_ADMIN_SECURITY_PLAN.md`: separate Owner control plane, Access, isolated Owner auth/session, Passkey + step-up, minimal Owner DB capability, separated telemetry, secrets and rollout isolation.
4. Plan explicitly preserves pre-release priority: foundation may be prepared in repository/local-CI, while real Access/hostname/Hyperdrive/secrets/Passkey enrollment/deploy remain Stage 6 and require explicit Owner authorization.
5. No implementation assigned or performed in this channel.
6. Next only after developer continuation: prepare a bounded handoff to Лёва for the first repository-only foundation technical plan.
