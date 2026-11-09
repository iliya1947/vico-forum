# Admin panel — current workflow

- Service PR: **#251**
- Current main: **`787cf6deae38138de2ffe867368ae794349f471f`**
- Current stage: **Super-admin — technical planning**
- Ordinary Admin Panel AP-01–AP-11: **complete**
- Owner/authorization redesign Stage 1–2: **complete**
- Settings SET-01–SET-06: **complete**
- Overall administrative program: **not complete; super-admin remains**
- Current simplest super-admin structure: **Overview / Monitoring & Event log / Infrastructure**
- Canonical user detail: **`/:locale/users/:userId`** with public + permission-scoped Admin + exact-Owner-only sections.
- Admin profile section: existing applicable measures + targeted role/authorization controls; no duplicate Complaints/Signals/Security queues and no new profile-local History subsystem.
- Owner profile section: private email/internal ID/sign-in methods + supported session/device metadata + per-user auth/security events + account state + deactivation.
- Deactivation:
  - public identity becomes **Deleted user**;
  - published content remains;
  - stored account data retained at least one year;
  - deactivated identity must no longer be usable as an active forum account;
  - no reactivation/forced-logout/provider-unlink/password-manipulation feature is assumed.
- Deactivation reason: **not required**; the action itself may still be logged.
- Infrastructure remains an Under development placeholder until Stage 6.
- **Мира**: product scope frozen; coordinator waits for Lev's technical plan.
- **Лёва**: **assigned technical planner** for Super-admin; implementation is not assigned.
- **Лира**: stopped pending an accepted technical plan.
- **Марк**: unassigned.
- No super-admin implementation PR/head yet.

- Resolved global decisions:
  - SA6: full Owner Monitoring/Event-log retention is indefinite until explicitly changed; no ordinary UI deletion.
  - SA7: both Owner-only entry points are used — ordinary Admin area and Owner account/profile menu — opening the same super-admin surface.
  - UP1: ordinary admins with applicable rights see only violation information; they do **not** get user-related history. Exact Owner sees the full per-user summary.


## Current super-admin product state — Monitoring

- Monitoring foundation: **approved**.
- Monitoring covers all observable current state, organized into 13 subsections:
  1. System
  2. Accounts & authentication
  3. Security
  4. Forum
  5. Localization & translations
  6. Notifications
  7. Files & attachments
  8. Administration
  9. Moderation
  10. Background processes
  11. Data
  12. Integrations
  13. Infrastructure
- Every monitored item has directly adjacent History access.
- Global Event log/journal is the aggregate cross-system history view and does not replace per-monitor history.
- Do not enumerate a complete metric/event catalog during product design; technical observability details wait for Lev after product scope freeze.
- SA6 retention remains indefinite until Owner changes it; no ordinary UI deletion.
- Super-admin product logic is **frozen for technical planning**: unified privileged profile, deactivation semantics, Monitoring with 13 areas, per-monitor History, global Event log, Overview summary, entry points, Infrastructure placeholder and contextual action model are resolved. Exact monitor/action mapping is a technical-planning task. No implementation PR/head; Lev is technical planner, Lira is stopped, Mark unassigned.


- Super-admin Overview role: **approved** — concise cross-area current-state summary with important current problems/anomalies and direct navigation to details; no duplication of full Monitoring.


## Current super-admin product state — Actions

- Approved model per monitor: **current state + adjacent History + applicable contextual actions**.
- Existing authoritative Admin/Settings/Needs attention/domain operations are reused; Super-admin does not create a parallel mutation backend.
- New Owner-only operations exist only where genuinely required and separately approved; current confirmed example: user deactivation.
- Read-only monitors are valid where no real action exists.
- Monitoring-origin actions do not duplicate authoritative domain/history events.
- Exact monitor-to-operation mapping and UI execution mechanics are delegated to Lev's technical plan against current main.

## Next step

**Lev:** prepare the bounded Super-admin technical plan from current main. No implementation starts before that plan is reviewed and accepted.
