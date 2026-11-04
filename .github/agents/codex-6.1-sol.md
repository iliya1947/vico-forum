# Лёва — Codex-6.1 Sol

## AP-07 technical acceptance decision

Exact head #282: `b0d5e74663cd57851225447e792ab4a9bf98322c`.
Base/main: `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`.

**Решение:** для AP-07 нужна targeted actual browser verification до итогового
coordinator PASS. Допустимый изолированный способ найден и реально использован.
Блокер среды для этой сессии снят; acceptance сейчас **FAIL**, а не «нет среды»:
найдены два подтверждённых current-scope дефекта. Implementation не менялся.

### Основание и границы gate

AGENTS.md «Проверка PR» пп.2–3 требует применимых checks и подходящей проверки,
включая browser при необходимости. ADMIN_PANEL.md «Delivery and acceptance»
требует проверять изменённые actual application flows; Pages не доказывает
auth/database/mutations. AP-07 добавляет новый admin topic, canonical cross-route
fetcher actions, 409/403 refresh, приватную history panel и responsive presentation:
это именно применимый interactive scope. План AP-07 #6618392884 это также фиксировал.

Это не требование повторить весь финальный UI/UX product acceptance matrix для
каждого PR. Финальный product/release acceptance сохраняется отдельно.
Owner visual acceptance по ADMIN_PANEL.md инициируется только по явному запросу:
такого запроса нет, этот gate сейчас не вводится.
Static coordinator analysis допустим как подготовка; итоговый PASS нельзя подменить
static Pages/зелёным CI при подтверждённых runtime defects.

### Реально доступный способ

В managed environment этой сессии проверены Node 24.21.0, pnpm 12.3.4,
Chromium 154.0.8037.57, Python Playwright, Docker local socket и postgres:17.
Exact head получен git fetch; создан отдельный detached worktree.
Собран настоящий Cloudflare Worker, применены 0000–0055 в disposable loopback
PostgreSQL, созданы synthetic Better Auth accounts/custom role и content fixtures.
Использованы localhost:4188 / test DB на 55474, без production credentials/data.

Это другая доступность, чем в isolated runtime, проверенном Лирой; её диагностика
не опровергается и не переносится автоматически на все среды.
Браузер пользователя не использовался. Новый workflow/step GitHub Actions не добавлялся.
Внешние/платные ресурсы не создавались.

### AP07-ACC-01 / P2 — privacy headers теряются на canonical HTTP route

Repro: authenticated actor с forum.post.history.read; post с >=2 revisions.
POST `/:locale/topics/:topicId` и `/:locale/topics/:topicId.data` с Origin,
intent=readPostHistory, postId и текущим editorActorId.
Оба ответа 200, содержат старый revision ID/body, но Cache-Control отсутствует.
Тот же результат зафиксирован на реальном Chromium fetcher из admin topic:
status 200, content-type text/x-script, Cache-Control отсутствует.

В app/forum/actions.server.ts:497–503 data() содержит private,no-store,
но app/routes/topic.tsx не экспортирует route headers().
Установленный React Router 8.3.1 getDocumentHeadersImpl без headers export
наследует parent headers/cookies, не переносит action Cache-Control;
single-fetch тоже вызывает getDocumentHeaders. Это подтверждено установленным
runtime и официальным https://reactrouter.com/how-to/headers.
Unit assertion на DataWithResponseInit.init.headers не проверяет конечный HTTP.

Тот же transport gap наблюдался у inline correction success и controlled
history 404/409 document responses. Приватный action response envelope,
обещанный AP-07, на HTTP не обеспечен.
Наличие неавторизованного чтения/фактической утечки через cache не утверждается:
проверенные authorization gates работают; дефект — обязательный private/no-store contract.

Локальный correction scope: обеспечить перенос нужных action/error cache headers
на canonical topic route, сохранив public GET/cache и cookie/parent semantics.
Не менять permission/domain/History backend. Добавить реальный Worker HTTP regression
для document и .data success/denial/error, а не только unit Data.init.headers.

### AP07-ACC-02 / P2 — новый admin topic расширяется за narrow/tablet viewport

Fixture: допустимое имя автора 96 символов A (registration limit 100),
3 сообщения, current topic title в допустимой длине, best answer promoted.
URL `/:locale/admin/forum/topics/ap07-topic-000`.
EN/RU/HE: viewport 320 → document 1114 px; viewport 768 → document 1108 px.
1280 без переполнения. Новые message cards/controls располагаются за viewport.

Причина локальна admin presentation: app/admin/topic.tsx:87–100 выводит
неразрывный author label, .topic-message-list является grid; default min-content
раздувает новые .topic-message rows, отсутствует ограничение/wrapping для этого
admin context. Аналогично started-by paragraph.
Временный только-browser diagnostic style
`.admin-topic {overflow-wrap:anywhere} .admin-topic .topic-message {min-inline-size:0}`
уменьшил 320→1114 обратно до 320, без изменения кода. Это диагностика локального
remedy, не acceptance исправленной реализации.
Нужна ограниченная коррекция admin responsive CSS/layout + browser re-test.
Сходный overflow виден и на public fixture; отдельно не атрибутирован AP-07
без baseline comparator, поэтому широкая public-layout переделка не назначается.

### Остальные проверенные evidence

22 функциональных browser scenarios завершены: guest/capability direct gates,
5 Forum capabilities по одной, отрицательные Own/Complaints/authz/History-only,
53 темы через paging, literal search, section→topic, lazy private history,
inline post source change с сохранением URL/revalidation, настоящий 409 без replay,
foreign post/stale actor denial, best-answer stable numbering, history/source
revocation через 403 с refresh и очисткой private fetcher, public shared message
consumer и Help internal navigation/capability-scoped controls.
9 EN/RU/HE × 320/768/1280 layout/keyboard/history checks выполнены; 6 FAIL по overflow,
это не общий browser PASS. Page errors не зарегистрированы.
Настоящий PG table lock дал protected 503/no-store на admin topic, release дал recovery.
Fixture database не получила Complaints Cases; significant History events остались
в существующих authoritative paths.

CI #41746716082 повторно подтверждён через GitHub: exact head, SUCCESS,
jobs checks/database SUCCESS. CI не выдаётся за browser PASS.
Новый полный application/PG suite здесь не повторялся: задача — acceptance decision
и targeted verification при уже зелёном exact-head CI.
Не проверены real R2 bytes/новые uploads, provider calls, owner visual и полная
product/release matrix; они не заявляются выполненными.
Это не whole-PR independent approval и не merge/production authorization.

### Артефакты и воспроизведение

В доступной execution workspace, вне implementation:
`/workspace/work/ap07-browser-evidence/`
- fixtures.mts, fixture.json, check.py, build.log/server.log;
- browser/results.json — 22 завершённых функциональных case и transport observations;
- headers-probe.py/.json/.log, history-document.html, history-single-fetch.data;
- layout-probe.py, layout-final.log, layout/results.json и en/ru/he-320.png;
- acceptance-summary.json — exact head/toolchain и SHA-256 артефактов.

Стартовый harness остановился на privacy assertion, повторный functional pass —
на первом overflow assertion; отдельный диагностический проход затем выполнил все
9 layout cases и DB timeout/recovery. Эти остановки не скрыты и не названы PASS.
Во втором layout проходе имя явно приведено к валидным 96 символам; только его
метрики выше используются для подтверждённого finding.

Task-owned Worker, PG container/volume, synthetic config и dependency symlink удалены.
Worktree clean, HEAD прежний. Никаких implementation commits/migrations/CI edits.
Scripts/evidence остаются локально; минимальные repro выше не требуют доступа к
этому checkout от следующего агента.

### Следующий шаг

Мира продолжает coordinator cycle с двумя подтверждёнными findings:
согласовать один bounded correction package Лире, получить новый stable exact head,
проверить CI и повторить targeted browser verification в доступной managed environment
этой сессии; затем coordinator PASS и назначенный independent technical review.
Текущий draft #282 не объявлять merge-ready. AP-08+ не начинать.
