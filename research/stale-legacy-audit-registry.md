# Systematic stale/legacy audit — единый реестр A–E

Дата: 2026-11-21.
Источник: iliya1947/vico-forum main, SHA 9cff976a9621d9fe5dfef28ea5367e390ff435b1.
Контекст: служебный PR #342, research/stale-legacy-audit-handoff.md.
Этапы: 1–20. Только аудит; продуктовый код, тесты и инфраструктура не менялись. Existing tests изучены, но не запускались. Browser/production acceptance не проводилась.

## Обозначения

A — подтверждённый устаревший хвост либо неправдивое текущее состояние.
B — намеренная совместимость/граница.
C — реально незавершённое по текущему contract.
D — историческое или описательное состояние без самостоятельной runtime-ошибки.
E — недостаточно доказательств необходимости исправления.

## A — реестр, девять групп

### A-01. Legacy Settings — удалить ошибочную unfinished-метку и решить redirect

- Artifact: app/forum/under-development.ts:2, app/routes/under-development.tsx:10-25, app/routes/admin-forum-legacy.test.ts:8-10.
- Контракт: шесть рабочих Settings routes в app/routes.ts:39-44; Admin shell уже ссылается на settingsPath (app/admin/shell.tsx:28).
- Расхождение: запрос /:locale/under-development?feature=admin-settings показывает, что Settings ещё в разработке, и упоминает их в unfinished checklist. Тест требует сохранения старого состояния.
- Эффект: устаревшая статусная страница для уже реализованных Settings.
- Действие: убрать Settings из unfinished registry, направлять старый адрес к canonical Settings с корректной политикой доступа, обновить тест.

### A-02. Search preview — заменить/убрать устаревший сценарий

- Artifact: app/ui-preview/preview-app.tsx:105, scenario under-development-search.
- Контракт: /:locale/search реализован, есть search-results/no-results preview.
- Эффект: отдельный устаревший сценарий ведёт на generic unfinished, несмотря на работающий Search.
- Действие: убрать или переопределить устаревшее состояние.

### A-03. Complaints preview — обновить заглушку

- Artifact: app/ui-preview/preview-app.tsx:133,1148-1225.
- Контракт: app/routes/attention.tsx:116-155 и complaint-* routes реализуют queue, appeal, history, review, result.
- Расхождение: Complaints placeholder; отсутствует передача complaintQueue, complaintHistory, complaintAppeals.
- Эффект: действующая модерация показана как пустая.
- Действие: обновить статус/fixture и согласовать с владельцем минимально необходимую визуальную проекцию. Полную backend parity не предполагать.

### A-04. Security preview — обновить заглушку

- Artifact: app/ui-preview/preview-app.tsx:134,1148-1225.
- Контракт: app/routes/attention.tsx:184-194 читает attachment security events; app/forum/views.tsx:1614-1624 отображает.
- Эффект: Security placeholder и пустое состояние вместо реально реализованной securityQueue.
- Действие: preview fixture для действующей attachment queue; group2/group3 остаются намеренными placeholders.

### A-05. Authorization preview — устранить ложный Owner write

- Artifact: app/ui-preview/preview-app.tsx:1832.
- Контракт: real mutation policy exact Owner, app/authorization/owner.ts.
- Эффект: manager scenario подаёт canMutateAuthorization=true, показывая недоступные ему в production действия.
- Действие: корректная role/permission projection в preview; backend менять не нужно.

### A-06. Registration preview — подать registrationFlags

- Artifact: app/ui-preview/preview-app.tsx:1013-1015.
- Контракт: app/routes/credential-sign-up.tsx читает registration settings; app/auth/credential-view.tsx:23-24 требует flags.
- Эффект: отсутствие flags в preview выключает регистрацию, хотя функция реализована.
- Действие: безопасные representative registration flags с явно заданными состояниями.

### A-07. Attach preview — устранить ложную активность

- Artifact: app/ui-preview/preview-app.tsx preview TopicView/SectionView без canUploadAttachments; app/forum/views.tsx:2175 default true.
- Контракт: production API /api/attachments зарегистрирован в app/routes.ts:5; GitHub Pages не предоставляет production API.
- Эффект: доступная в визуалке Attach interaction зависит от отсутствующего Pages backend. Реальный deployed network click не проверялся.
- Действие: честная локальная эмуляция или отключение фиктивного upload.

### A-08. Мёртвые UI catalogue keys — консистентная очистка

- Artifact: app/localization/catalog.ts, manual-values.ts, manual-fingerprints.ts.
- Контракт: Search, Notifications, Registration, Pinned, Unread, Profiles, Tags, Unanswered, Popular, Forum Discovery, Message Links, Reply/Quote, Editor, Online Presence реализованы.
- По точечному GitHub code search 14 старых underDevelopmentFeature* и onlinePresencePending используются только в этих трёх файлах. Также только в этих файлах остался viewDevelopmentStatus; учитывать в одной группе.
- Эффект: устаревшие дескрипторы и ручные записи RU/HE/fingerprints остаются частью catalogue maintenance.
- Действие: удалять лишь подтверждённо неиспользуемые ключи согласованно из всех слоёв; перед merge прогнать проверки локализации.

### A-09. signUp описание каталога — исправить вместе с fingerprint

- Artifact: app/localization/catalog.ts:1560: Future registration entry point in the forum header.
- Контракт: действующая ссылка Sign up в app/auth/auth-controls.tsx:140.
- Эффект: неверные поддерживаемые описательные метаданные, но не видимый текст пользователя.
- Действие: поправить descriptor и проверить RU/HE reviewed fingerprints, так как description участвует в sourceFingerprint (app/localization/fingerprint.ts). Не считать отдельной D-находкой.

## B — намеренная совместимость/границы

1. /under-development?feature=admin-forum redirect на Admin Forum; feature=admin-users защищённо идёт на Users/Authorization (app/routes/under-development.tsx:12-20).
2. /admin/users/:userId guarded redirect на unified profile (app/routes/admin-user.tsx), не второй detail screen.
3. Infrastructure в Super-admin остаётся Stage 6 placeholder, без притворных Cloudflare/Neon данных (app/routes/super-admin-infrastructure.tsx).
4. Exact bound Owner: нет self-deactivation, второго Owner, generic elevated mutations или операций над чужими credential/session.
5. Translation original fallback и revision-bound stale/history не мусор; Cloudflare Queues, production provider/runtime и real acceptance — Stage 6.
6. GitHub Pages preview по docs/UI_UX_PASS.md предназначен для representative-data визуала, не заменяет backend/Worker.

## C — действительно незавершённое

1. Drafts/autosave, намеренно исключённые из Editor 2.0.
2. Контентные страницы Rules, Help, About, Feedback и Privacy page (не путать с реализованным Settings/privacy).
3. Email verification/password recovery.
4. Stage 6 production integrations, configured Owner/Google/provider/Queue/infra.

## D — историческая документация

1. docs/UI_UX_PASS.md:~310-313,~590,~670-673 содержит записи старых UI этапов, называющие Search, Registration, Unread, Notifications, Profiles и Editor будущими. Документ хранит историю UI/UX; верхние разделы учитывают актуальные shipped mechanics. Историческое утверждение не равняется текущему статусу проекта.
2. Описательные метаданные signUp учтены под A-09, без двойного подсчёта.

## E — не установлено, что нужно исправлять

1. Main preview неполно отражает Watch/Bookmarks/Mute/Block, Settings, ordinary Admin, Super-admin/Owner profile/lifecycle, published-post editing и translation generation lifecycle; само отсутствие 1:1 static parity не доказательство stale-дефекта — нужна утверждённая граница representative preview.
2. pending rendering branch в app/admin/shell.tsx: все текущие destinations pending=false, но ненужность самого кода не доказана.
3. Реально опубликованная GitHub Pages сборка не проверялась; source и closed PR не подтверждают deployed state.
4. Fingerprint parity всех UI descriptors и provider/Queue production acceptance не запускались.

## PR #322 — не источник main

PR #322 закрыт без merge 2026-11-21, head e23c0e0ade79e786e29b4057af1dfd292814e34e. Там существовали изменения Search, Complaints, Security, registration flags, Bookmarks/Filters, Settings, Owner roles и Super-admin, но они отсутствуют в main. Последний review имел HOLD: Preview ownership (author-only actions) и реальный ComplaintActivity network leak в статическом Pages. Закрытый head нельзя считать готовым решением.

## Exact verified inventory — 31 stale elements

Повторная независимая поштучная проверка выполнена на main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`. Все 31 ранее посчитанных элемента подтверждены; ошибочно включённых элементов не найдено.

### A-01 Legacy Settings — 2
1. `app/forum/under-development.ts`: `admin-settings` остаётся в `UNDER_DEVELOPMENT_FEATURES`.
2. `app/routes/admin-forum-legacy.test.ts`: тест `keeps the Settings placeholder` закрепляет устаревшее unfinished-состояние.

### A-02 Search preview — 1
3. `app/ui-preview/preview-app.tsx`: scenario `under-development-search`.

### A-03 Complaints preview — 2
4. `attention-complaints` всё ещё имеет label `Moderation · Complaints placeholder`.
5. `PreviewAttentionRoute` не подаёт representative `complaintQueue` / `complaintAppeals` / `complaintHistory` и соответствующие read capabilities.

### A-04 Security preview — 2
6. `attention-security` всё ещё имеет label `Moderation · Security placeholder`, хотя attachments-group реализована.
7. `PreviewAttentionRoute` не подаёт representative `securityQueue`, поэтому реализованная attachments-group выглядит пустой.

### A-05 Authorization preview — 3
8. Manager-preview жёстко получает `canMutateAuthorization={true}`, хотя mutations exact-Owner-only.
9. `admin-success` — Manager-only mutation-success fixture, недостижимая в production contract.
10. `admin-conflict` — Manager-only mutation-conflict fixture, недостижимая в production contract.

### A-06 Registration preview — 1
11. `previewCredential(..., "sign-up")` не передаёт `registrationFlags`, из-за чего обе реализованные registration methods отображаются закрытыми.

### A-07 Attachments preview — 3
12. Help question composer preview не передаёт `canUploadAttachments`; default оставляет реальный upload path активным.
13. Create topic composer preview не передаёт `canUploadAttachments`.
14. Reply composer preview не передаёт `canUploadAttachments`.

### A-08 Localization catalogue — 16
Каждый ключ считается одним логическим stale-элементом, даже если поддерживается синхронно в `catalog.ts`, `manual-values.ts` и `manual-fingerprints.ts`.

15. `onlinePresencePending`.
16. `viewDevelopmentStatus`.
17. `underDevelopmentFeatureSearch`.
18. `underDevelopmentFeatureNotifications`.
19. `underDevelopmentFeatureRegistration`.
20. `underDevelopmentFeaturePinnedTopics`.
21. `underDevelopmentFeatureUnread`.
22. `underDevelopmentFeatureProfiles`.
23. `underDevelopmentFeatureTechnologyTags`.
24. `underDevelopmentFeatureUnansweredFilter`.
25. `underDevelopmentFeaturePopular`.
26. `underDevelopmentFeatureForumDiscovery`.
27. `underDevelopmentFeatureMessageLinks`.
28. `underDevelopmentFeatureReplyQuote`.
29. `underDevelopmentFeatureEditor`.
30. `underDevelopmentFeatureOnlinePresence`.

Реально unfinished `underDevelopmentFeatureDrafts`, `Rules`, `Help`, `About`, `Feedback`, `Privacy` в этот список не входят.

### A-09 signUp descriptor — 1
31. `app/localization/catalog.ts`: description `Future registration entry point in the forum header.` противоречит действующей header link и рабочему `/:locale/sign-up`.

`manual-fingerprints.ts` для A-09 не считается отдельным stale-элементом: fingerprint корректно отражает текущий descriptor и должен измениться как производное следствие правки descriptor.

## Итог

- 9 уникальных групп A, в том числе 1 real Settings legacy status path; остальные преимущественно preview/catalogue.
- Нет доказанных новых server-side production defects.
- B/C/D/E вынесены отдельно и не являются автоматическим списком исправлений.
- Не создавались implementation PR и новый служебный PR; production actions и тесты не выполнялись.
- Фаза аудита завершена. Любой cleanup — только по отдельному решению владельца и с точечной диагностикой/проверками.
