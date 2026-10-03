# UI/UX product pass — ChatGPT coordination channel

> Служебный non-merge документ канала ChatGPT. Этот PR не предназначен для merge в `main`.

## Проверенный baseline

- Актуальный `main`: `7628ae6f85b7b99d4002dedb112a6bd1c5ed880b` (`Stage 6: prepare protected Worker rollout (#146)`).
- Stage 4 forum core и Stage 5 translation UX реализованы в repository/local-CI path.
- Stage 6 infrastructure orchestration поставлена пользователем на паузу для этой отдельной UI/UX задачи.
- Старые служебные PR Codex #121 и ChatGPT #122 заморожены и используются только как исторический контекст. Новую UI/UX работу и техническое согласование в них вести нельзя.
- Оставшиеся Stage 6 external/infrastructure gates не продолжаются без отдельного указания пользователя.

## Source of truth, прочитанный перед стартом

Полностью сверены актуальные:
- `AGENTS.md`;
- `PROJECT.md`;
- `PROJECT_STATE.md`;
- `ROADMAP.md`;
- `TRANSLATION_ARCHITECTURE.md`;
- `docs/auth/AUTHORIZATION.md`;
- `docs/translation/LOCALES.md`;
- `docs/translation/UI_TRANSLATION.md`;
- `docs/translation/CONTENT_TRANSLATION.md`.

Также сверена текущая presentation-реализация в `main`: shell/styles, home/category/section/topic routes, auth controls, authorization management UI и route states.

## Задача

Полноценный UI/UX pass существующего Vico Forum. Forum core функционально реализован, но текущая presentation остаётся техническим scaffold/MVP. Требуемый результат — законченный современный классический форум без расширения продуктового scope.

## Scope

- существующие shell/navigation;
- главная и категории;
- разделы;
- темы и сообщения;
- формы;
- auth/admin presentation;
- empty/error states;
- responsive UI;
- существующие LTR/RTL locale paths и mixed-direction content presentation.

Backend, архитектуру, БД, зависимости и публичные контракты менять только если это действительно необходимо для UI-задачи и подтверждено техническим согласованием.

## Не входит

- новый продуктовый функционал;
- поиск, reputation, reports, bans, расширенная модерация и другие будущие возможности;
- продолжение Stage 6 infrastructure/external gates;
- production mutations, secrets, OAuth/provider/Queue provisioning или deployment как побочный эффект UI-задачи.

## Обязательные инварианты

- форум остаётся классическим форумом: category → section → topic → posts, не социальной лентой;
- public read остаётся доступным гостю;
- permission-based authorization и server-side boundaries не подменяются UI visibility;
- generic `/:locale/*`, canonical locale routing и registry-driven `ltr|rtl` сохраняются;
- direction не реализуется hard-coded проверками конкретного языка;
- content translation остаётся revision-bound/original-safe; translated content сохраняет provenance и собственные `lang`/`dir`;
- UI strings продолжают идти через canonical English/i18n contract.

## Критерий готовности

Одного зелёного CI недостаточно.

Нужна полноценная визуальная product acceptance в реальном браузере на representative populated data, включая минимум:
- desktop;
- mobile;
- LTR;
- RTL;
- guest;
- authenticated user;
- основные empty states;
- основные error states;
- ключевые forum flows и admin/auth presentation, уже существующие в продукте.

Acceptance должна подтверждать, что существующий forum core выглядит как законченный современный продукт, а не как technical scaffold.

## Текущее состояние координации

- Этот PR — новый отдельный канал ChatGPT только для UI/UX задачи.
- Новый Codex поток должен использовать свой отдельный служебный PR; #121 повторно не используется.
- В соответствии с рабочим регламентом Codex сначала самостоятельно проверяет актуальный `main` и относящуюся документацию, затем фиксирует scope, план/порядок работ и критерии завершения в своём новом канале.
- ChatGPT ждёт первый plan/handoff из нового Codex канала и не начинает самостоятельную реализацию UI/UX до этой передачи.


## Handoff после принятого navigation slice — 2026-10-03

- Owner merge завершил bounded navigation correction: существующая цепочка Pages-preview теперь последовательно проходит `Home → Category → Section → Topic`, не сваливаясь обратно в Home.
- Реальный application routing для существующих category/section/topic destinations не заменялся preview-only продуктовой логикой; исправлялась только representative Pages navigation surface.
- Homepage entry rail после принятого Category/Section redesign теперь открывает реальную locale-aware category destination; временный `forum-discovery` unfinished entry больше не нужен.
- Последняя owner browser-проверка navigation chain прошла.
- Текущий `PROJECT_STATE.md` после merge не задаёт следующую bounded product subtask после Reply/Quote/navigation cleanup: remaining heavy approved functions остаются отдельными задачами.
- Нужен следующий Codex handoff с выбранной bounded UI/UX product subtask и её критериями готовности; Stage 6 infrastructure остаётся на паузе.


## Markdown editor + code presentation — implementation handoff — 2026-10-03

Codex handoff из PR #153 выполнен отдельным mergeable PR #176 от exact `main`
`22fae444da2f31bfaeb8857d68835319fcfb320a`.

### Реализовано

- Shared client-safe `MarkdownEditor` подключён к существующим create-topic и reply body forms без
  изменения их server contracts: field name `body`, existing `intent` / `title` / `tags` /
  `parentPostId`, обычный React Router submit и pending/disabled semantics сохранены.
- Selection-aware controls: Bold, Italic, Inline code и fenced Code block; fenced code принимает
  optional bounded language identifier. После transform selection/caret и focus восстанавливаются.
- Existing Reply/Quote flow сохранён: Reply target остаётся в `parentPostId`; Quote по-прежнему
  принимает только реально выделенный текст из concrete message body, вставляет Markdown blockquote
  в текущую selection/caret editor и возвращает focus в reply body.
- Editor preview использует ровно существующий safe `ForumMarkdown` renderer; отдельного parser,
  raw-HTML path или WYSIWYG слоя не добавлено.
- Fenced/indented rendered code получил language label, Copy code с localized success/failure,
  Wrap/No wrap, explicit LTR isolation внутри RTL page и client-safe dependency-free syntax token
  presentation для reviewed common language identifiers. Existing no-images/raw-HTML/unsafe-link
  renderer policy сохранён. Новых dependencies нет.
- Canonical English catalog и complete RU/HE manual packs расширены editor/code strings; fixed
  reviewed fingerprint manifest обновлён.
- Pages fixture дополнен states `Markdown editor · create topic · user` и
  `Markdown editor · reply + quote · user`; create-topic state содержит inline/fenced TypeScript,
  preview и длинную code line, reply state — active parent target, inserted Markdown quote и preview.
  Existing locale switch и Desktop/Mobile viewport позволяют проверять LTR/RTL и responsive surface.
- `PROJECT_STATE.md` и `docs/UI_UX_PASS.md` узко обновлены фактическим implementation state.
  `editor` пока намеренно остаётся в shared `Under development` checklist: по handoff он должен
  удаляться только после genuine completion; independent Codex/browser acceptance ещё не выполнены.
  Drafts/autosave, attachments/images, WYSIWYG, edit-existing, notifications/unread/profiles/
  registration/pinning/online-presence и Stage 6 не затронуты.

### Проверки

Exact implementation head: `ecd36d5041d72b44f85e43fa9ea4e96f7f036af5`.

- PR #176 CI run `37119899449`: `database` success, `checks` success; lint/typecheck/tests/build,
  migration/DB contracts, Workers smoke и UI preview build завершились успешно.
- Regression coverage включает selection transforms, caret/focus restoration, exact submitted body,
  imperative quote insertion, safe Markdown preview, code syntax spans, clipboard success/failure,
  wrap/no-wrap, LTR code in RTL, existing protected-Markdown renderer assertions и representative
  preview states.
- GitHub Pages run `37119986749`: build success, deploy success для exact implementation head.
- Реальный browser visual acceptance я не утверждаю: в текущем tool surface нет interactive browser
  session. Pages deployment подготовлен для независимого Codex/owner browser review.

### Следующее действие

Codex должен полностью проверить PR #176 против своего handoff и актуального `main`, включая
Pages browser review/remaining acceptance. До результата Codex review merge и дальнейший slice не
начинаются.


---

## Update 2026-10-03 — editor follow-up deferred; request next bounded slice

Owner reviewed the expanded Markdown editor in GitHub Pages after the first follow-up UX pass. The editor now exposes additional authoring controls and Write / Preview / Split modes, but the owner explicitly considers the presentation still too weak and wants to return to editor UX refinement tomorrow. Therefore editor visual/product acceptance is **not** claimed and PR #176 must not be treated as owner-accepted or merge-ready on that basis.

Current implementation PR #176 head is `0e6a1607e7a8a3f2f16c9a4207536c32ba4d4131`; repository CI and exact-head Pages deployment succeeded. This follow-up expanded only the existing editor presentation/authoring controls and did not add drafts/autosave, attachments, WYSIWYG, backend/schema, permissions or Stage 6 scope.

The owner explicitly requested to move on to another UI/UX task for now and return to editor refinement tomorrow.

### Requested Codex action

Please inspect current `main`, the current UI/UX source of truth, and this update, then choose and hand off the next bounded UI/UX slice that can proceed independently without treating PR #176 as accepted or merged. Do not implement project code.
