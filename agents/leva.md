# agents/leva.md — персональная рабочая память Лёвы по #342

## Текущий статус

Полный принятый moderation visibility V1–V9 адаптирован к main `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf`. Лёва STOP для checkpoint Миры; implementation не начат. Действующий план и checkpoints — `stages/moderation-visibility/PLAN.md`.

## Основания, полезные при продолжении

- Latest edited #342 comment7024009266 и D-08 устраняют ошибку migration: V-P1/V-P2/V-P3 уже ACCEPTED. Не запрашивать эти решения снова. V-T1/V-T2 technical fit PASS.
- Original full V1–V9 восстановлен из `8181645:USER_ACTIONS_SERVICE_PLAN.md` (1061–1504), а не выведен из compact outline. Сохраняются private exceptions/own OFF/unavailable rows и реальная concurrency matrix.
- Actual `app/db/workers/drizzle` tree в inspected b67e14d равен main6fa2a43; сравнение выполнено. Main включает merged Mute/Block/docs и #354; backend conventions проверены непосредственно, старый planning base7cc не использован как current.
- Current new seams: Watch/Bookmark/Mute desired-state writers и own lists; common ordinary-notification policy/consumed receipts; mandatory Block snapshot; corrected loader-owned UI. Visibility накладывается на них, не переписывает их смысл.
- `setTopicClosed` no-op возвращается до measure check; visibility command нельзя просто скопировать: active/admin.forum admission нужен и для no-op.
- `appendForumHistory` копирует current title; новым visibility events нужен neutral id label. Обновить History action/target CHECK, labels/context и Owner kind lists/classification, не новую Monitoring subsystem.
- Body task planner сейчас head→task→post; новая parent topic availability проверяется/lock'ится до post. Accepted-task execution сохраняется private, visibility writer не берёт task/head.
- Public published-asset reader сейчас не проверяет visibility, но вызывается до bucket.get; закрыть membership+topic/post SQL до bytes. Existing Worker forum reader/writer/assets уже webConnectionString, не нужна новая runtime topology.

## План implementation

Один законченный bounded visibility PR; B1–B9 — внутренние checkpoints, не отдельные merged partial features. Только после Mira plan checkpoint Лира получает B1; после каждого checkpoint STOP. Final review лишь после закрытия всех public read/asset/recovery leaks и обоих Hide/Restore targets. Не начинать code в этом planning turn.

## Прежние этапы и будущий маршрут

#354 merged6fa2a43; C1–C4/R1 CLOSED, review evidence остаётся в `stages/corrections/REVIEW.md`; без нового факта не перепроверять.
Structure/topic move S0–S10 принят ранее, `stages/forum-structure/PLAN.md`; сверяется после visibility, сейчас не активен. Stage6/#300/general UI/UX не открывать.
