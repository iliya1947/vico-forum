# AUTH-04 — реализация и проверяемые результаты

Draft stacked PR #393, base accepted AUTH-03 #392 `39c07e539a47b8a317b3a274132337a6dc61cfdf`. Current head `b058838a0b4f20131d2e1b10c47b05743d20ceca`.

Реализованы safe email/status/pending DTO, двухфазная own email change и Google unlink. Canonical HTTP/direct требуют authoritative fresh session и точное ожидание user/session. Email change использует существующий lifecycle state, proof purpose/generation/phase и общий transaction owner. Старый email работает до final POST. Final commit обновляет email/verified, инвалидирует pending verification/reset/create/change и отзывает остальные сессии. Native identity Google и Owner/RBAC не меняются. Occupied-email conflict возвращает безопасный 409 с rollback.

Google unlink и guarded adapter delete/deleteMany перечитывают методы под AccountState lock и сохраняют usable verified password либо настроенный Google. Empty/unknown methods не проходят invariant. Unlink сохраняет сессии. В Settings добавлены EN/RU/HE формы, POST transport semantics и in-memory fragment capture, включая вторую ссылку при уже открытой странице.

Добавлены committed emailChanged/methodUnlinked facts, фактические session-delete receipts, email-change/unlink attempts и mail outcomes обоих email purposes. Forward migration 0077, snapshot и schema manifest согласованы с PG17.

Локально прошли typecheck, выбранные unit/component, PostgreSQL и Worker/Chromium. Native tests проверяют оба подтверждения, replay/restart/stale-session, hashless unlink, adapter last-method protection, rollback при revoke failure и occupied-address race. Connected browser прошёл Settings old-confirm/new-verify, сохранение initiating session и unlink после добавления password. Финальные CI/acceptance на опубликованном head выполняются. AUTHOR PASS ожидает их итогов. AUTH-05 и реальные провайдеры остаются на паузе.
