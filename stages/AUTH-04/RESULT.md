# AUTH-04 — реализация и проверяемые результаты

Draft stacked PR #393, base accepted AUTH-03 #392 `39c07e539a47b8a317b3a274132337a6dc61cfdf`. Current head `b058838a0b4f20131d2e1b10c47b05743d20ceca`.

Реализованы safe email/status/pending DTO, двухфазная own email change и Google unlink. Canonical HTTP/direct требуют authoritative fresh session и точное ожидание user/session. Email change использует существующий lifecycle state, proof purpose/generation/phase и общий transaction owner. Старый email работает до final POST. Final commit обновляет email/verified, инвалидирует pending verification/reset/create/change и отзывает остальные сессии. Native identity Google и Owner/RBAC не меняются. Occupied-email conflict возвращает безопасный 409 с rollback.

Google unlink и guarded adapter delete/deleteMany перечитывают методы под AccountState lock и сохраняют usable verified password либо настроенный Google. Empty/unknown methods не проходят invariant. Unlink сохраняет сессии. В Settings добавлены EN/RU/HE формы, POST transport semantics и in-memory fragment capture, включая вторую ссылку при уже открытой странице.

Добавлены committed emailChanged/methodUnlinked facts, фактические session-delete receipts, email-change/unlink attempts и mail outcomes обоих email purposes. Forward migration 0077, snapshot и schema manifest согласованы с PG17.

Локально прошли typecheck, выбранные unit/component, PostgreSQL и Worker/Chromium. Native tests проверяют оба подтверждения, replay/restart/stale-session, hashless unlink, adapter last-method protection, rollback при revoke failure и occupied-address race. Connected browser прошёл Settings old-confirm/new-verify, сохранение initiating session и unlink после добавления password. Финальные CI/acceptance на опубликованном head выполняются. AUTHOR PASS ожидает их итогов. AUTH-05 и реальные провайдеры остаются на паузе.

## Завершение author verification

Current head `19d9ff8f4a515378130bd4d44bbfe6f5b002071e`. Финальные изменения включают обработку fragment второго подтверждения в уже открытых Settings, mail budgets для каждого фактического получателя и удаление дублированной freshness-подсказки. PostgreSQL regression подтвердил, что concurrent native deletes двух usable methods дают один commit и один controlled conflict, сохраняя сессии. Обновлены старые adapter tests под новый last-method contract.

В существующем Complaint race test выявлен поздний rejection handler: ожидаемый отказ мог попасть в unhandled rejection до завершающего assertion. Добавлено раннее наблюдение за исходным promise, сохранив lock/state checks и проверку типа ошибки. Четыре варианта гонки прошли локально.

CI #45743147397 и применимые acceptance на финальном head выполняются; [Worker/Chromium #45743153598](https://github.com/iliya1947/vico-forum/actions/runs/45743153598) PASS. AUTHOR PASS ожидает оставшихся результатов.

### Финальный кандидат

Head `c9035dce425333d14fdf12d2418f4a8a009edabf`. По AP-10 устранён дубль freshness-подсказки и уточнён exact selector Connect Google рядом с новым Disconnect Google. Локальный SET-05 Chromium прошёл полностью. Второй этап email mail принимает validated locale-local callback текущей страницы; PostgreSQL API regression подтвердил выбор RU для new-address mail. CI #45744054677, connected #45744061039 и остальные применимые acceptance запущены на этом head.
