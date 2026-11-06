# История проекта — 2026-11-06: AP-10 measures, авторские проверки до review

Датированный **implementation/author-verification snapshot**, не текущий domain
contract. Не является свидетельством независимой проверки, owner visual
acceptance, merge в `main` либо production rollout.

- В `main` по-прежнему находятся AP-01–AP-09. AP-10 подготовлен отдельно в
  [Draft PR #290](https://github.com/iliya1947/vico-forum/pull/290),
  exact implementation head `503a5c6dc570e2c6c0f64f59e7fe5bf390a90b13`,
  PR открыт, Draft, не merged.
- Утверждённая модель: distinct measures для разных нарушений; конфигурируемые
  дочерние ограничения и независимый срок; terminal expired/lifted; одна
  pending appeal на меру и до трёх последовательных апелляций; accepted appeal
  меняет или полностью снимает ту же меру. Приватная own-секция не раскрывает
  администраторов/ревьюеров. Обе `admin.users.blocks.manage*` capability
  без built-in initial grants; AP-10 не добавляет last-manager recovery veto.
- PR добавляет forward migration `drizzle/0058_user_measures.sql`, сервис мер,
  приватные read projections, atomic administrative History, права и enforcement
  на forum/Help writes, attachments, own edits, profile, Complaints, Help signals,
  translations и четырёх administrative permission families.
  Matching committed publication replays не превращаются в новые
  записи; denied fresh operations не выполняют частичных side effects.
- Собственные и административные страницы мер работают в EN/RU/HE, группируют
  active/expired/lifted записи. Group checkboxes выбирают только child keys,
  review form показывает поля выбранного remedy, pending state блокирует
  дублирование. 403/404/409 обновляют protected loader без повторного POST.
- Интеграционный этап 5.1 проверил две одновременно действующие меры, подавление
  четырёх административных семей, независимый subject appeal, lift только
  первой меры и сохранение отдельного raw RBAC deny; снятие второй
  восстановило публикацию. PostgreSQL tests покрывают atomicity, CAS и приватность.
- Браузерный этап 5.2 использовал реальный Chrome/Playwright с Worker,
  Better Auth email sessions и disposable PostgreSQL 17, без пользовательского
  браузера/production. Проверены guest 401, создание двух мер, own reason/status,
  подача/решение апелляции, fresh deny/restore, admin families, 409 stale
  without replay и EN/RU/HE × 320/768/1280 на own list/detail/admin detail.
  [Run #42171734414](https://github.com/iliya1947/vico-forum/actions/runs/42171734414)
  **SUCCESS**, скриншоты/JSON — артефакт `ap10-browser-evidence`
  (artifact 13481965971).
- Реальный мобильный тест выявил narrow-header sign-out overflow на 320 px
  (EN +3.5 px, RU +1.7 px). DOM bounding-box evidence локализовало
  элемент в общей шапке. Уменьшены её горизонтальные отступы на мобильном
  breakpoint; повторная браузерная матрица прошла без переполнения.
  Также исправлены тестовые ожидание готовности Worker и использование
  установленного на runner Chrome вместо отдельного скачивания Chromium.
- На том же head [CI #42171734420](https://github.com/iliya1947/vico-forum/actions/runs/42171734420)
  **SUCCESS**: application **152/152 files, 1942/1942 tests**;
  native PostgreSQL **46/46 files, 555/555 tests**; lint/typecheck/build,
  migration/Drizzle/schema/privilege checks и Worker HTTP smoke PASS.
- Coordinator whole-PR review Миры, независимый технический review Лёвы,
  owner visual approval/merge и deployed/production acceptance на дату
  этого снимка **не выполнены**. AP-11, Settings, owner-role redesign
  и Stage 6 rollout не входят в эту реализацию.
