# agents/lira.md — текущий контекст Лиры по #342

## Назначение — B5; STOP после B5.4b

Moderation visibility B1 #355, B2 #357, B3 #359, B4 #365 получили Mira bounded coordinator PASS; stacked Draft, без merge. Stable B4 #365 exact `97b9187cc42e5479c5cab43d9f69a9bfa6ed8a9e`. Owner разрешил только B5.

[Draft #367](https://github.com/iliya1947/vico-forum/pull/367) exact `7493a269444f656cfcf511207d2b945d31a01c50` на неизменной B4 head branch. Whole B5 local diff: 20 файлов, 35 commits впереди base, behind 0. Записаны B5.1 Watch hidden/missing ON/OFF; B5.2 Bookmarks и unavailable own list; B5.3 Mute/Block и unavailable own filters; B5.4a mixed/legacy inbox readers; B5.4b mark/open и notification invariants. Полное содержание и границы — PR #367 и `WORKFLOW.md`.

### B5.4b — зафиксировано (пока только static)

- `markNotificationRead` и `markReplyNotificationRead` проверяют видимость topic+post в том же actor→notification-locked transaction обычным MVCC `EXISTS` без topic/post row locks; спрятанный/отсутствующий источник возвращает только neutral unavailable, но own notification `read_at` сохраняет idempotent mark.
- `app/routes/notifications.tsx` перенаправляет unavailable open в приватный `/:locale/notifications`; обычный видимый и защищённый Complaint Case/Appeal destination не изменены.
- PG-targeted regression: hidden post/topic, foreign actor denial, read_at idempotence, unread badge/chronology, no new notices, unchanged suppression receipts, Restore и Complaint case. Route neutral redirect tested across EN/RU/HE.
- B5.4b local diff от прежнего head `a1daf50a52650bf00b6ba7cdeccf6176c02ee872`: 5 файлов, ahead 7/behind 0. GitHub static diff/source checks PASS. **PostgreSQL/Vitest/typecheck/CI не запускались; ни runtime PASS, ни whole-B5 author PASS не установлены.**

## Следующий шаг

**Лира STOP после B5.4b.** Только следующая команда владельца `...` разрешает consolidated whole-B5 author self-check и применимые exact-head `run:ci`/`run:acceptance` в #367. При подтверждённых проблемах исправить только scope B5, проверить новый head; затем записать #342 handoff **STOP → Мира bounded coordinator checkpoint**. B6/B7, merge, Лёва whole-feature review и Stage6 запрещены.
