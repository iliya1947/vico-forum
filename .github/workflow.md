# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- #342 остаётся открытым рабочим каналом; после завершения одного этапа здесь переключается текущий этап.
- По прямому правилу владельца Мира не использует #300 как рабочий канал или источник текущих назначений. Заглянуть в #300 можно только после завершения всех задач #342, чтобы сверить следующий общий шаг, либо по прямой команде владельца обратиться к Ари/#300.

## Реализация

- Edit own topic title: завершён.
- Watch: **implementation #345 merged** в main `9c4639d23ca075c8bb92fbb909b96593d7bee127`; дерево совпадает с проверенным technical head `76c1c456557c614171a3b472758498795a668b9a` (review base `7cc23edede57994cdedab49c1556ddb55034dd29`, 17/17 exact-head checks PASS, включая database и connected watch_browser).
- Watch coordinator whole-PR review: **Мира PASS** на exact head `76c1c456557c614171a3b472758498795a668b9a`; подтверждённых current-scope findings нет.
- Watch independent technical review: **Лёва PASS** всего принятого scope на том же exact head `76c1c456557c614171a3b472758498795a668b9a` против main `7cc23edede57994cdedab49c1556ddb55034dd29`; подтверждённых current-scope findings нет. Код не изменён; Лёва STOP.
- Review synthesis: оба review совпали на неизменном exact head, расхождений и подтверждённых current-scope defects нет. По действующему owner decision из `docs/UI_UX_PASS.md` функциональные bounded-срезы не задерживаются из-за косметики; финальная owner visual/product acceptance остаётся отдельным UI/UX pass перед публичным запуском. Поэтому отдельный Watch visual gate сейчас merge не блокирует.
- Watch implementation review cycle завершён, #345 merged. Permanent/current-state docs closeout остаётся отдельным PR после implementation merge; это planning-задание не заменяет его.
- Bookmarks: **реализация активирована владельцем**. Лира / ChatGPT-6 реализует принятый Bookmarks scope прямо в Draft PR #346 от актуального `main` после merged Watch. Лёва завершил planning всех шести задач перед #320 и к реализации Bookmarks не назначен; после coordinator PASS Миры он выполняет независимый technical review.
- Bookmarks #346 **IMPLEMENTATION HANDOFF TO MIRA; LIRA STOP** at exact head `8f24bd98fb2548bc9ec4b6f3433f40c1e72c7d65` (Draft). New `bookmarks_browser` runs real Worker/Better Auth/PG17/Chromium with disposable fixture, EN/RU/HE and RTL screenshots. 10 connected scenario groups verified: guest/private cache + actor switch, add/reload/new session/remove/idempotency/denials, closed/solved/Help duplicate/inactive-author/current title, Watch/inbox/read-state isolation, 57 bookmarks with ties/removal/re-add/keyset. First browser commit `fd01fbac...` passed connected run but lint identified missing Node imports in fixture; fixed only in second commit `8f24bd9...`. Current exact-head **18/18 GitHub checks PASS**, including `checks`, `database`, new `bookmarks_browser` and all regression browser checks; evidence artifact `topic-bookmarks-connected` (run `44379089155`, id `14464010674`). No outstanding confirmed current-scope defects at this checkpoint; no whole-PR coordinator review yet.
- Mute/block: план принят, реализация ждёт очереди.

## Опережающий planning-track

- Watch / Bookmarks / Mute-block: спланированы.
- Watch / Bookmarks / Mute-block и модерация видимости опубликованного контента уже имеют технические планы.
- По уточнению владельца planning-track относится **только к шести задачам, которые стоят перед #320**; это не назначение на остальной pre-release backlog из #300.
- Из этих шести Watch / Bookmarks / Mute-block и модерация видимости уже спланированы; редактирование заголовка завершено.
- Управление структурой форума / перенос тем: **план S0–S10 принят Мирой после whole-plan scope/fit; PASS, current-scope defects = 0.** S-P1–S-P4 и S-T1/S-T2 приняты; код не активирован.
- Все шесть задач перед #320 теперь имеют завершённую реализацию первого блока либо **принятые технические планы** остальных. **Лёва STOP** после завершённого planning; email-auth, UI/UX, Stage 6, release и прочий backlog этим назначением не открыты.

## Следующий шаг

**Лира — implementation/gate handoff DONE, STOP.** #346 Draft stable exact head `8f24bd98fb2548bc9ec4b6f3433f40c1e72c7d65`, base equals current `main` `9c4639d23ca075c8bb92fbb909b96593d7bee127`, compare ahead 13/behind 0, mergeable=true, 39 changed files. Exact-head checks 18/18 PASS incl. new connected `bookmarks_browser`; Pages preview built in CI, но отдельный Pages deploy этого head не запускается данным workflow (push main/chatgpt/ui-*); owner Bookmarks visual acceptance не зафиксирована, финальная visual/product acceptance отложена владельцем на отдельный UI/UX pass. **Следующий исполнитель — Мира / ChatGPT-5.6 Sol**: сверить формальные gates по AGENTS.md с явным owner MVP-first decision, провести coordinator whole-PR review #346 по B1–B7 на неизменном exact head только после разрешения необходимых gates; при подтверждённых current-scope findings вернуть Лире единый пакет, без перехода к Лёве. После coordinator PASS — Лёва / Codex-6.1 Sol для независимого technical review на том же head. Docs/current-state closeout — отдельный docs PR в конце по действующему рабочему маршруту. Никакого нового implementation, #342 не merge.
