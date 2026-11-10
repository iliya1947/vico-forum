# Super-admin security — communication

Служебный PR: pending. Оперативное состояние: [workflow.md](./workflow.md). Рабочий план: [SUPER_ADMIN_SECURITY_PLAN.md](../SUPER_ADMIN_SECURITY_PLAN.md).

## Зафиксированное направление

1. Цель — максимально изолировать Super-admin как отдельный Owner control plane, не усложняя текущую pre-release разработку преждевременной production-защитой.
2. Target: отдельный Owner Worker за Cloudflare Access, isolated Owner auth/session, exact `VICO_OWNER_USER_ID`, Passkey + step-up, отдельная минимальная DB capability/Hyperdrive и отдельный protected rollout.
3. Ordinary forum session, Admin/RBAC, email/provider claims и public Worker не являются Owner authentication boundary.
4. Existing SA-01 остаётся фактическим current baseline до отдельного activation package; Stage 6 paused.
5. Сейчас создаётся только служебный план. Implementation PR отсутствует; external provisioning/deploy не разрешены.

## Координация

1. Этот PR является рабочим каналом именно задачи Super-admin security/pentesting protection.
2. Связанный Admin service PR #251 остаётся отдельным каналом Admin/Super-admin product delivery; security-hardening decisions этого направления не нужно дублировать туда как вторую source of truth.
3. Следующий bounded шаг после явной команды владельца — технический план первого repository-only foundation package у Лёвы; Лира не начинает реализацию до принятого плана.
4. Марк не назначен.
