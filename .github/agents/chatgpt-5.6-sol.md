# Мира — безопасность Vico Forum

## 2026-11-10 — scope correction

1. #315 является общим служебным каналом безопасности форума.
2. Предыдущее сужение канала до Super-admin было ошибкой координатора.
3. Основной рабочий план переименован в SECURITY_IMPLEMENTATION_PLAN.md и содержит общую security/pentesting карту.
4. Super-admin security сохранён как блок A, первый детально проработанный раздел, а не весь scope PR.
5. Общая карта включает auth/session, authorization, Admin/moderation, public application, attachments, DB/migrations, Workers/Cloudflare, secrets/supply-chain, integrations, abuse/availability, monitoring/incident response и release pentesting.
6. Карта покрытия не является автоматическим implementation scope; каждая проблема сначала классифицируется по фактической реализации и текущему Stage.
7. Implementation и external work сейчас не назначены.
