# Лёва — Codex-6.1 Sol

## Лёва — AP-08 / #283: независимая whole-PR technical review — PASS

**Reviewed exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.
**Implementation baseline:** `e39c36ccef29c6164706d826f26c57088a97fa20`.
**Актуальный main:** `853ccde096ba56c3b3147122bb1d5dd284c2d186` (от baseline изменился только AGENTS.md).
**Verdict: PASS. Подтверждённых незакрытых current-scope implementation-дефектов: 0.**

Проверка выполнена после [coordinator PASS Миры #6641563954](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6641563954) на том же stable head. AP-08 реализовывала Лира; я готовил технический план и проверял результат, implementation не менял. Полезный уже реализованный scope сохранён, дальнейшее расширение не выполнялось.

### Whole-PR результат

Проверены все 47 changed files (schema snapshot — структурным сравнением с предыдущим accepted snapshot, остальные изменения — по diff/source/test contracts).

- **Schema/catalog/grants:** одна forward 0056, persisted open/0 defaults, nonnegative closure version; ровно одна capability `forum.topic.close` для close/reopen, initial moderator/admin grants, custom roles/overrides не заменяются. Catalog/checks/Drizzle snapshot/journal/manifest согласованы. Структурный snapshot diff содержит только два columns, closure CHECK, два расширенных existing CHECK и snapshot identity/prevId. Accepted 0000–0055 не переписаны; runtime privileges не расширены.
- **Authoritative write:** CAS проверяется на locked topic row до no-op; ABA/stale/overflow fail closed. Меняются только closed/version, History append в той же транзакции и последним write; append failure откатывает состояние. Нет toggle, повторного события для stale/no-op и новых role exceptions.
- **Reply/receipt:** admission нового reply использует ту же topic row `FOR UPDATE`, closed check стоит после matching committed receipt lookup и до cooldown/posts/revisions/notifications/attachment publication. Автор, moderator/admin и actor с closure capability не обходят запрет. Matching replay возвращает прежний post; changed fingerprint остаётся conflict. Reopen не снимает confirmed duplicate restriction. Дополнительный gate перед receipt не добавлен.
- **Authorization/HTTP:** canonical route action, session actor и route target, fresh capability, same-origin, unique/canonical CAS/actor inputs, duplicate-intent protection, stale-account 409; distinct `topicClosed` 409, controlled 400/401/403/404/409/503, private/no-store и сохранённый AP-07 headers transport. Unexpected errors не превращаются в permission=false/503.
- **Read/admission:** closure-only capability допускает Forum/shell/direct private routes, но не даёт другие action/history permissions и Help private fields. Public/admin projections читают persisted state/version. Public read, solved/best answer/pin/duplicate/messages/own-edit/attachment display не меняют своего доменного смысла.
- **UI:** общие public/admin Quick actions используют тот же writer через canonical endpoint, mutually exclusive close/reopen, pending/CAS, actor/topic/grant/version isolation, однократный refresh при конфликте/denial без replay. Closed отделён от Solved/Duplicate. Новые Reply/Quote блокируются; mounted composer сохраняет text/Undo/Redo/current uploads, Cancel доступен, повторная публикация после reopen требует явного действия. `publicationDisabled` блокирует submit/shortcut, не обрывая upload operation. Complaint consumer без closure fields/grant не получает closure authority.
- **Tests/localization/presentation:** native PG tests проверяют оба порядка close/reply, rollback/queued reply, concurrent CAS и receipt/attachment preservation через actual lock waits/barriers; route/mounted tests покрывают boundary/error paths и editor retention. Existing historical fixtures дополнены только требуемыми columns для current Drizzle writes. EN/RU/HE strings/fingerprints, logical CSS, existing preview fixtures и History labels согласованы с изменением. Новая review-реализация/документация в #283 не добавлялась.

### Фактические проверки

- [CI #41904456264](https://github.com/iliya1947/vico-forum/actions/runs/41904456264), **attempts 1 и 2 — SUCCESS на reviewed head**. Повторно проверены head/conclusion через GitHub API; у attempt 2 `checks` и `database` и их steps SUCCESS: application checks/builds, clean PostgreSQL 17, migration/schema/manifest/runtime checks и existing Worker HTTP smoke.
- Независимый локальный запуск существующих целевых tests на этом head: **5 files / 110 tests PASS** — `topic-closure-action`, `topic-closure-ui`, `admin/topic`, `routes/admin-topic`, весь `public-read` (включая исправленный upload-retention case). Pinned Node/pnpm; лог: `/workspace/work/ap08-review-evidence/targeted-tests.log`. Полный CI/application/PG suite локально повторно не запускался.
- AP08-MIRA-01: test-only correction ожидает готовую operation identity/Attach перед выбором файла и сохраняет assertions operation/form/abort до close и после close/reopen. Текущий целевой тест прошёл локально и в двух exact-head CI attempts. Источник abort на старом head этим review не объявляется установленным; реальный product abort defect не подтверждён.
- GitHub test-merge `f43f780e4c0c5c15192e81b1abcc079770b01059`: parents current main `853ccde...` и reviewed `7b6adbf...`; от head отличается только актуальным AGENTS.md, implementation tree differences нет. PR mergeable. Worktree clean, implementation head неизменен; task dependency symlink удалён.

### Границы и завершение

**Информация не проверена:** фактический authenticated Chromium→Worker→Better Auth→PostgreSQL AP-08 flow. Я такой run не выполнял и CI/mounted/native PG не выдаю за browser acceptance. По [#6640050148](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6640050148) отдельный run не является mandatory blocker текущего package. Owner visual, real R2/provider/OAuth и production rollout не выполнялись.

Существующие docs-коммиты #283 сохраняются. Stale PROJECT_STATE формулировка про mandatory browser acceptance и итоговое фактическое состояние — контекст **отдельного documentation PR в конце задачи** по текущему AGENTS.md, не основание менять implementation #283. Полный аудит документации не заявляется.

Оба whole-PR verdict относятся к одному `7b6adbf`; новых correction tasks нет. Review cycle #283 завершён, PR готов к merge владельцем. AP-09+, blocking и rollout не начинались.

**Действие разработчика:** merge PR #283.

Опубликованный отчёт: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6642078061
