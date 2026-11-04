# Лёва — Codex-6.1 Sol

## Лёва — AP-07: финальная независимая whole-PR техническая проверка — PASS

PR #282, stable exact head `985160867001fd42b3ad2614262927aab3edfb3e`, base/main `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`.
После coordinator PASS Миры [#6620633977](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6620633977) завершил независимую проверку всего AP-07 scope. Реализацию AP-07 выполняла Лира; я подготовил план и проверял результат, implementation во время review не менял. Подтверждённых незакрытых current-scope defects: **0**.

### Whole-PR scope

Проверены все 29 изменённых файлов против AP-07 плана, актуальных контрактов и main: section→topics discovery, literal search до SQL LIMIT, keyset paging/total и Help exclusion; независимый admission пяти Forum capabilities; минимальный current-topic DTO и capability-scoped Help IDs; original/translation fallback, безопасный Markdown и существующие attachment URLs; AdminShell, стабильные post ID/номера/anchors и best-answer promotion; общий MessageQuickActions на admin/public; canonical action, source Any и отдельное history permission; identity/permission changes, topic membership, duplicate fields, CAS/403/409 и отсутствие mutation replay; privacy headers и ограниченная responsive correction; route/UI/SQL/PG tests, preview и документация.

Второй RBAC/write endpoint не введён. History остаётся в authoritative mutation paths, Complaints не подменяет action/history. Миграции 0000–0055, permission catalog, зависимости и Worker bindings не менялись; AP-08+ не включён. Новых подтверждённых дефектов при whole-PR анализе не найдено.

### Исправления подтверждены фактическим runtime

Собран текущий exact head; использованы настоящий локальный Worker, Better Auth, disposable PostgreSQL 17 с миграциями и изолированный Chromium 154.0.8037.57, synthetic accounts/data. Браузер пользователя и production не использовались; новый GitHub Actions workflow/step не добавлялся.

**AP07-ACC-01 — закрыт.** Конечные document и `.data` ответы source/history actions получают `Cache-Control: private, no-store`: проверены success 200, guest 401, revoked permission 403, foreign post 404, stale actor/CAS 409. Реальный browser fetcher истории тоже получает private/no-store во всех шести locale/viewport случаях. Revoked actor не получает прежние revision payloads. Обычный public GET не получил принудительную private policy. Это HTTP/runtime evidence, а не assertion только на Data.init.headers.

**AP07-ACC-02 — закрыт.** EN/RU/HE × 320/768 px с допустимым именем автора из 96 символов, длинным title, тремя сообщениями и promoted best answer: document scrollWidth равен viewport **320/768** с закрытой и открытой history. Диагностический CSS не внедрялся. Проверены main/h1, RTL, стабильный Message #3/anchor и безопасный вывод. Page errors: 0; внешних browser requests: 0.

Итого текущий targeted retest: **19 сгруппированных проверок PASS**. Прежние 22 unaffected functional browser cases относятся к старому `b0d5e74663cd57851225447e792ab4a9bf98322c`; повторно всему corrected head они не приписываются и без необходимости не повторялись. Четыре файла correction проверены отдельно и в общем diff.

### CI, воспроизводимость и границы

[Exact-head CI #41755521661](https://github.com/iliya1947/vico-forum/actions/runs/41755521661): SUCCESS, jobs `checks`/`database` SUCCESS. Локально заново выполнены build и targeted runtime; полный application/PG suite повторно не запускался.

Свежий GitHub test-merge `3f5e35c8ef623e0d119c180a8f1ec4700e108810` имеет parents указанного base/head и идентичное head дерево `c34ce464730f3978d80e41a33289d9bedd853908`. Implementation worktree clean, HEAD не менялся. Task-owned Worker, DB container/volume, synthetic config и dependency symlink удалены.

Локальные evidence: `/workspace/work/ap07-final-review-evidence/` — build.log, fixtures.mts, retest.py, runtime.log, runtime-results.json, шесть screenshots и review-summary.json с SHA-256. Исходный FAIL/repro сохранён в [#6620081742](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6620081742). Первый запуск retest включал лишний Origin probe, остановившийся на upstream 400; он не считается PASS. Unaffected Origin guard проверен исходниками/CI; после удаления этого несвязанного probe task DB сброшена и требуемый retest завершён.

Существующий public long-name overflow не устранён этим admin-only исправлением; диагностическое удаление нового widget не меняет его ширину. Новый AP-07 finding на этой основе не заявляется. Owner visual acceptance не запрашивался. Real R2 bytes/uploads, provider/OAuth calls, полная product/release matrix и production rollout не заявляются проверенными.

### Завершение цикла

Coordinator PASS и независимый technical PASS относятся к одному `9851608`; оба confirmed defects закрыты actual runtime. Дополнительный круг Миры не требуется. #282 готов к merge владельцем; AP-08+ до merge не начинается.

**Действие разработчика:** merge PR #282.
